import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { FormulaBuilderComponent } from './formula-builder.component';
import { SqlEditorComponent } from './sql-editor.component';

@Component({
  selector: 'app-parameter-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FormulaBuilderComponent, SqlEditorComponent],
  templateUrl: './parameter-form-dialog.component.html',
  styleUrl: './parameter-form-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParameterFormDialogComponent implements OnInit, OnChanges {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() parameterCode: string | null = null;
  @Input() initialParameter: ParameterConfigResponseDTO | null = null;
  @Input() supportedFields: string[] = [];
  @Input() supportedFieldsByTable: Record<string, string[]> = {};

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<ParameterConfigResponseDTO>();

  formMode: FormMode = 'FORMULA';

  code = '';
  label = '';
  isActive = true;

  formulaDraft: FormulaJson = this.createDefaultFormula();
  private formulaBackup: FormulaJson = this.createDefaultFormula();

  nativeSqlDraft = '';
  compiledSqlPreview: FormulaSqlResponseDTO | null = null;

  loading = false;
  loadingCompiledSql = false;
  saving = false;

  validationErrors: string[] = [];
  apiError: ApiErrorResponse | null = null;

  private initialized = false;

  constructor(
    private parametersApi: ParametersApiService,
    private mapper: ParameterFormMapperService,
    private validator: ParameterFormValidationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.initializeDialog();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }

    if (changes['mode'] || changes['parameterCode'] || changes['initialParameter']) {
      void this.initializeDialog();
      return;
    }

    if (changes['supportedFields'] && this.supportedFields.length > 0) {
      this.fillMissingDefaultField(this.formulaDraft);
      this.formulaBackup = this.mapper.cloneFormula(this.formulaDraft);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDialog();
  }

  closeDialog(): void {
    if (this.saving) {
      return;
    }

    this.closed.emit();
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

      if (this.mode === 'edit' && this.code.trim()) {
        await this.refreshCompiledSql();
      }

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
      let response: ParameterConfigResponseDTO;

      if (this.mode === 'create') {
        response = await this.parametersApi.create(payload);
      } else {
        const code = this.parameterCode?.trim() || this.code.trim();
        response = await this.parametersApi.update(code, payload);
      }

      this.saved.emit(response);
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  async refreshCompiledSql(): Promise<void> {
    if (!this.code.trim() || this.loadingCompiledSql) {
      return;
    }

    this.loadingCompiledSql = true;
    this.apiError = null;
    this.cdr.markForCheck();

    try {
      const preview = await this.parametersApi.compileSql(this.code.trim());
      this.compiledSqlPreview = preview;

      if (!this.nativeSqlDraft.trim()) {
        this.nativeSqlDraft = preview.sql;
      }
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.loadingCompiledSql = false;
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

  private async initializeDialog(): Promise<void> {
    this.initialized = true;
    this.loading = true;
    this.validationErrors = [];
    this.apiError = null;
    this.compiledSqlPreview = null;
    this.formMode = 'FORMULA';

    if (this.mode === 'create') {
      this.code = '';
      this.label = '';
      this.isActive = true;
      this.formulaDraft = this.createDefaultFormula();
      this.formulaBackup = this.mapper.cloneFormula(this.formulaDraft);
      this.nativeSqlDraft = '';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    if (this.initialParameter) {
      this.applyParameter(this.initialParameter);
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    const code = this.parameterCode?.trim();
    if (!code) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    try {
      const parameter = await this.parametersApi.getByCode(code);
      this.applyParameter(parameter);
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private applyParameter(parameter: ParameterConfigResponseDTO): void {
    const draft = this.mapper.toFormDraft(parameter);
    this.code = draft.code;
    this.label = draft.label;
    this.isActive = draft.isActive;
    this.formulaDraft = draft.formulaDraft ?? this.createDefaultFormula();
    this.fillMissingDefaultField(this.formulaDraft);
    this.formulaBackup = this.mapper.cloneFormula(this.formulaDraft);
    this.nativeSqlDraft = draft.nativeSqlDraft ?? '';
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
        field: this.supportedFields[0] ?? '',
      },
      where: {
        logic: 'AND',
        conditions: [],
        groups: [],
      },
    };
  }
}
