import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  ApiErrorResponse,
  FormMode,
  FormulaJson,
  FormulaSqlResponseDTO,
  ParameterConfigResponseDTO,
} from '../../../core/models/parameter.model';
import { ParametersApiService, ApiHttpError } from '../../../core/services/parameters-api.service';
import { ParameterFormMapperService } from '../../../core/services/parameter-form-mapper.service';
import { ParameterFormValidationService } from '../../../core/services/parameter-form-validation.service';
import { FormulaBuilderComponent } from '../components/formula-builder.component';
import { SqlEditorComponent } from '../components/sql-editor.component';

@Component({
  selector: 'app-add-parameter-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FormulaBuilderComponent, SqlEditorComponent],
  templateUrl: './add-parameter-page.component.html',
  styleUrl: './add-parameter-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddParameterPageComponent implements OnInit {
  formMode: FormMode = 'FORMULA';

  code = '';
  label = '';
  isActive = true;

  formulaDraft: FormulaJson = this.createDefaultFormula();
  private formulaBackup: FormulaJson = this.createDefaultFormula();

  nativeSqlDraft = '';
  compiledSqlPreview: FormulaSqlResponseDTO | null = null;

  supportedFields: string[] = [];
  supportedFieldsByTable: Record<string, string[]> = {};
  loadingSupportedFields = false;

  saving = false;
  loadingCompiledSql = false;

  validationErrors: string[] = [];
  apiError: ApiErrorResponse | null = null;
  successMessage: string | null = null;

  constructor(
    private parametersApi: ParametersApiService,
    private mapper: ParameterFormMapperService,
    private validator: ParameterFormValidationService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    void this.loadSupportedFields();
  }

  toggleMode(): void {
    const nextMode: FormMode = this.formMode === 'FORMULA' ? 'SQL' : 'FORMULA';
    void this.switchMode(nextMode);
  }

  async switchMode(nextMode: FormMode): Promise<void> {
    if (nextMode === this.formMode) {
      return;
    }

    if (nextMode === 'SQL') {
      this.formulaBackup = this.mapper.cloneFormula(this.formulaDraft);
      this.formMode = 'SQL';
      this.cdr.markForCheck();
      return;
    }

    this.formMode = 'FORMULA';
    this.formulaDraft = this.mapper.cloneFormula(this.formulaBackup);
    this.cdr.markForCheck();
  }

  runValidation(): boolean {
    this.validationErrors = [];
    this.apiError = null;

    const payload = this.mapper.toRequestPayload({
      mode: this.formMode,
      code: this.code,
      label: this.label,
      isActive: this.isActive,
      formulaDraft: this.formulaDraft,
      nativeSqlDraft: this.nativeSqlDraft,
    });

    this.validationErrors = this.validator.validateRequest(payload);
    return this.validationErrors.length === 0;
  }

  async saveParameter(): Promise<void> {
    if (this.saving) {
      return;
    }

    const isValid = this.runValidation();
    if (!isValid) {
      return;
    }

    this.saving = true;
    this.apiError = null;

    const payload = this.mapper.toRequestPayload({
      mode: this.formMode,
      code: this.code,
      label: this.label,
      isActive: this.isActive,
      formulaDraft: this.formulaDraft,
      nativeSqlDraft: this.nativeSqlDraft,
    });

    try {
      await this.parametersApi.create(payload);
      this.successMessage = 'Le parametre a ete enregistre avec succes.';
      this.cdr.markForCheck();

      setTimeout(() => {
        void this.router.navigate(['/parameters']);
      }, 1200);
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  onFormulaChanged(formula: FormulaJson): void {
    this.formulaDraft = this.mapper.cloneFormula(formula);
    this.formulaBackup = this.mapper.cloneFormula(formula);
  }

  onSqlChanged(sql: string): void {
    this.nativeSqlDraft = sql;
  }

  goBack(): void {
    void this.router.navigate(['/parameters']);
  }

  private async loadSupportedFields(): Promise<void> {
    this.loadingSupportedFields = true;

    try {
      const response = await this.parametersApi.supportedFields();
      const normalizedFields = Array.from(
        new Set(
          response.fields
            .map((field) => field.trim())
            .filter((field) => field.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b));

      this.supportedFields = normalizedFields;
      this.supportedFieldsByTable = this.normalizeFieldsByTable(response.fieldsByTable, normalizedFields);
      this.fillMissingDefaultField(this.formulaDraft);
      this.formulaBackup = this.mapper.cloneFormula(this.formulaDraft);
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.loadingSupportedFields = false;
      this.cdr.markForCheck();
    }
  }

  private fillMissingDefaultField(formula: FormulaJson): void {
    if (!this.supportedFields.length) {
      return;
    }

    const firstField = this.supportedFields[0];
    this.populateNodeDefaultFields(formula.expression, firstField);
  }

  private populateNodeDefaultFields(node: FormulaJson['expression'], fallbackField: string): void {
    if (node.type === 'FIELD' && !node.field) {
      node.field = fallbackField;
    }

    if (node.type === 'AGGREGATION' && !node.field && !node.expression) {
      node.field = fallbackField;
    }

    if (node.expression) {
      this.populateNodeDefaultFields(node.expression, fallbackField);
    }

    if (node.left) {
      this.populateNodeDefaultFields(node.left, fallbackField);
    }

    if (node.right) {
      this.populateNodeDefaultFields(node.right, fallbackField);
    }
  }

  private normalizeFieldsByTable(
    fieldsByTable: Record<string, string[]> | undefined,
    allFields: string[]
  ): Record<string, string[]> {
    const normalized: Record<string, string[]> = {};

    Object.entries(fieldsByTable ?? {}).forEach(([table, fields]) => {
      const tableName = table.trim();
      if (!tableName || !Array.isArray(fields)) {
        return;
      }

      const cleanFields = Array.from(
        new Set(
          fields
            .map((field) => field.trim())
            .filter((field) => field.length > 0)
        )
      );

      if (cleanFields.length > 0) {
        normalized[tableName] = cleanFields;
      }
    });

    if (allFields.length === 0) {
      return normalized;
    }

    const assignedFields = new Set(Object.values(normalized).flat());
    const unassignedFields = allFields.filter((field) => !assignedFields.has(field));

    if (unassignedFields.length > 0) {
      normalized['autres_champs'] = unassignedFields;
    }

    return normalized;
  }

  private extractApiError(error: unknown): ApiErrorResponse {
    if (error instanceof ApiHttpError) {
      return error.apiError;
    }

    return {
      timestamp: new Date().toISOString(),
      status: 0,
      error: 'INCONNU',
      message: error instanceof Error ? error.message : 'Erreur inattendue',
      details: [],
      path: '/parameters',
    };
  }

  private createDefaultFormula(): FormulaJson {
    return {
      expression: {
        type: 'AGGREGATION',
        function: 'SUM',
        field: this.supportedFields?.[0] ?? '',
      },
      where: {
        logic: 'AND',
        conditions: [],
        groups: [],
      },
    };
  }
}
