import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
  RatioConfigResponseDTO,
  RatioFormulaNode,
  RatioLookupItem,
  RatioRequestDTO,
  RatioSimulationResponseDTO,
} from '../../../core/models/ratio.model';
import { RatioApiHttpError, RatiosApiService } from '../../../core/services/ratios-api.service';
import { RatioFormulaBuilderComponent } from './ratio-formula-builder.component';
import { FieldPickerComponent } from '../../parameters/components/field-picker.component';

@Component({
  selector: 'app-ratio-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RatioFormulaBuilderComponent, FieldPickerComponent],
  templateUrl: './ratio-form-dialog.component.html',
  styleUrl: './ratio-form-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatioFormDialogComponent implements OnInit, OnChanges {
  private readonly maxDepth = 8;

  @Input() mode: 'create' | 'edit' = 'create';
  @Input() ratioCode: string | null = null;
  @Input() initialRatio: RatioConfigResponseDTO | null = null;
  @Input() families: RatioLookupItem[] = [];
  @Input() categories: RatioLookupItem[] = [];
  @Input() parameterCodes: string[] = [];
  @Input() groupedParameterCodes: Record<string, string[]> = {};

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<RatioConfigResponseDTO>();

  code = '';
  label = '';
  familleId: number | null = null;
  categorieId: number | null = null;
  seuilTolerance: number | null = null;
  seuilAlerte: number | null = null;
  seuilAppetence: number | null = null;
  description = '';
  isActive = true;

  formulaDraft: RatioFormulaNode = this.createDefaultFormula();

  loading = false;
  saving = false;
  simulating = false;

  validationErrors: string[] = [];
  apiError: ApiErrorResponse | null = null;
  simulationResult: RatioSimulationResponseDTO | null = null;

  private initialized = false;

  constructor(
    private ratiosApi: RatiosApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.initializeDialog();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }

    if (changes['mode'] || changes['ratioCode'] || changes['initialRatio']) {
      void this.initializeDialog();
      return;
    }

    if (changes['parameterCodes'] && this.parameterCodes.length > 0) {
      this.fillMissingParamCodes(this.formulaDraft);
      this.cdr.markForCheck();
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

  onFormulaChanged(formula: RatioFormulaNode): void {
    this.formulaDraft = this.cloneFormula(formula);
  }

  get familyNames(): string[] {
    return this.buildLookupNames(this.families);
  }

  get categoryNames(): string[] {
    return this.buildLookupNames(this.categories);
  }

  get groupedFamilyNames(): Record<string, string[]> {
    return this.groupLookupNames(this.familyNames);
  }

  get groupedCategoryNames(): Record<string, string[]> {
    return this.groupLookupNames(this.categoryNames);
  }

  get selectedFamilyName(): string {
    return this.resolveLookupNameById(this.families, this.familleId);
  }

  get selectedCategoryName(): string {
    return this.resolveLookupNameById(this.categories, this.categorieId);
  }

  onFamilyNameChanged(name: string): void {
    if (this.saving) {
      return;
    }

    this.familleId = this.resolveLookupIdByName(this.families, name);
  }

  onCategoryNameChanged(name: string): void {
    if (this.saving) {
      return;
    }

    this.categorieId = this.resolveLookupIdByName(this.categories, name);
  }

  runValidation(): boolean {
    this.validationErrors = [];
    this.apiError = null;

    this.validateTopLevel(this.validationErrors);
    this.validateFormula(this.formulaDraft, 'formula', 1, this.validationErrors);

    return this.validationErrors.length === 0;
  }

  async simulateFormula(): Promise<void> {
    if (this.simulating) {
      return;
    }

    const valid = this.runValidation();
    if (!valid) {
      return;
    }

    this.simulating = true;
    this.apiError = null;
    this.simulationResult = null;
    this.cdr.markForCheck();

    try {
      this.simulationResult = await this.ratiosApi.simulate(this.formulaDraft);
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.simulating = false;
      this.cdr.markForCheck();
    }
  }

  async saveRatio(): Promise<void> {
    if (this.saving) {
      return;
    }

    const valid = this.runValidation();
    if (!valid) {
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.saving = true;
    this.apiError = null;

    try {
      let response: RatioConfigResponseDTO;

      if (this.mode === 'create') {
        response = await this.ratiosApi.create(payload);
      } else {
        const code = this.ratioCode?.trim() || this.code.trim();
        response = await this.ratiosApi.update(code, payload);
      }

      this.saved.emit(response);
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  private async initializeDialog(): Promise<void> {
    this.initialized = true;
    this.loading = true;
    this.validationErrors = [];
    this.apiError = null;
    this.simulationResult = null;

    if (this.mode === 'create') {
      this.applyDraft({
        code: '',
        label: '',
        familleId: this.families[0]?.id ?? null,
        categorieId: this.categories[0]?.id ?? null,
        formula: this.createDefaultFormula(),
        seuilTolerance: null,
        seuilAlerte: null,
        seuilAppetence: null,
        description: '',
        isActive: true,
      });
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    if (this.initialRatio) {
      this.applyRatio(this.initialRatio);
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    const code = this.ratioCode?.trim();
    if (!code) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    try {
      const ratio = await this.ratiosApi.getByCode(code);
      this.applyRatio(ratio);
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private applyRatio(ratio: RatioConfigResponseDTO): void {
    this.applyDraft({
      code: ratio.code,
      label: ratio.label,
      familleId: ratio.familleId,
      categorieId: ratio.categorieId,
      formula: ratio.formula,
      seuilTolerance: ratio.seuilTolerance ?? null,
      seuilAlerte: ratio.seuilAlerte ?? null,
      seuilAppetence: ratio.seuilAppetence ?? null,
      description: ratio.description ?? '',
      isActive: ratio.isActive,
    });
  }

  private applyDraft(draft: {
    code: string;
    label: string;
    familleId: number | null;
    categorieId: number | null;
    formula: RatioFormulaNode;
    seuilTolerance: number | null;
    seuilAlerte: number | null;
    seuilAppetence: number | null;
    description: string;
    isActive: boolean;
  }): void {
    this.code = draft.code;
    this.label = draft.label;
    this.familleId = draft.familleId;
    this.categorieId = draft.categorieId;
    this.formulaDraft = this.cloneFormula(draft.formula);
    this.fillMissingParamCodes(this.formulaDraft);
    this.seuilTolerance = draft.seuilTolerance;
    this.seuilAlerte = draft.seuilAlerte;
    this.seuilAppetence = draft.seuilAppetence;
    this.description = draft.description;
    this.isActive = draft.isActive;
  }

  private validateTopLevel(errors: string[]): void {
    if (!this.code.trim()) {
      errors.push('Le code est obligatoire.');
    }

    if (!this.label.trim()) {
      errors.push('Le libelle est obligatoire.');
    }

    if (!this.familleId || this.familleId <= 0) {
      errors.push('La famille est obligatoire.');
    }

    if (!this.categorieId || this.categorieId <= 0) {
      errors.push('La categorie est obligatoire.');
    }
  }

  private validateFormula(
    node: RatioFormulaNode | undefined,
    path: string,
    depth: number,
    errors: string[]
  ): void {
    if (!node) {
      errors.push(`${path} est obligatoire.`);
      return;
    }

    if (depth > this.maxDepth) {
      errors.push(`${path} depasse la profondeur maximale (${this.maxDepth}).`);
      return;
    }

    if (node.type === 'PARAM') {
      const code = node.code?.trim() ?? '';
      if (!code) {
        errors.push(`${path}.code est obligatoire pour les noeuds PARAM.`);
        return;
      }

      if (this.parameterCodes.length > 0 && !this.parameterCodes.includes(code)) {
        errors.push(`${path}.code (${code}) n'existe pas dans la liste des parametres disponibles.`);
      }

      return;
    }

    if (node.type === 'CONSTANT') {
      if (!Number.isFinite(node.value)) {
        errors.push(`${path}.value doit etre un nombre fini pour les noeuds CONSTANT.`);
      }
      return;
    }

    if (!node.left || !node.right) {
      errors.push(`${path} requiert les noeuds left et right.`);
      return;
    }

    this.validateFormula(node.left, `${path}.left`, depth + 1, errors);
    this.validateFormula(node.right, `${path}.right`, depth + 1, errors);

    if (node.type === 'DIVIDE') {
      const evaluatedRight = this.evaluateConstantExpression(node.right);
      if (evaluatedRight !== null && evaluatedRight === 0) {
        errors.push(`${path}.right est une expression constante qui vaut 0.`);
      }
    }
  }

  private evaluateConstantExpression(node: RatioFormulaNode | undefined): number | null {
    if (!node) {
      return null;
    }

    if (node.type === 'PARAM') {
      return null;
    }

    if (node.type === 'CONSTANT') {
      return Number.isFinite(node.value) ? Number(node.value) : null;
    }

    const left = this.evaluateConstantExpression(node.left);
    const right = this.evaluateConstantExpression(node.right);

    if (left === null || right === null) {
      return null;
    }

    if (node.type === 'ADD') {
      return left + right;
    }

    if (node.type === 'SUBTRACT') {
      return left - right;
    }

    if (node.type === 'MULTIPLY') {
      return left * right;
    }

    if (right === 0) {
      return 0;
    }

    return left / right;
  }

  private buildPayload(): RatioRequestDTO | null {
    if (!this.familleId || !this.categorieId) {
      return null;
    }

    return {
      code: this.code.trim(),
      label: this.label.trim(),
      familleId: Number(this.familleId),
      categorieId: Number(this.categorieId),
      formula: this.cloneFormula(this.formulaDraft),
      seuilTolerance: this.toNullableNumber(this.seuilTolerance),
      seuilAlerte: this.toNullableNumber(this.seuilAlerte),
      seuilAppetence: this.toNullableNumber(this.seuilAppetence),
      description: this.description.trim(),
      isActive: this.isActive,
    };
  }

  private toNullableNumber(value: number | null): number | null {
    if (value === null || value === undefined || value === ('' as unknown as number)) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private fillMissingParamCodes(node: RatioFormulaNode | undefined): void {
    if (!node) {
      return;
    }

    if (node.type === 'PARAM') {
      if (!node.code?.trim()) {
        node.code = this.parameterCodes[0] ?? '';
      }
      return;
    }

    this.fillMissingParamCodes(node.left);
    this.fillMissingParamCodes(node.right);
  }

  private extractApiError(error: unknown): ApiErrorResponse {
    if (error instanceof RatioApiHttpError) {
      return error.apiError;
    }

    return {
      timestamp: new Date().toISOString(),
      status: 0,
      error: 'INCONNU',
      message: error instanceof Error ? error.message : 'Erreur inattendue',
      details: [],
      path: '/ratios',
    };
  }

  private createDefaultFormula(): RatioFormulaNode {
    return {
      type: 'DIVIDE',
      left: {
        type: 'PARAM',
        code: this.parameterCodes[0] ?? '',
      },
      right: {
        type: 'PARAM',
        code: this.parameterCodes[1] ?? this.parameterCodes[0] ?? '',
      },
    };
  }

  private cloneFormula(formula: RatioFormulaNode): RatioFormulaNode {
    return JSON.parse(JSON.stringify(formula)) as RatioFormulaNode;
  }

  private buildLookupNames(items: RatioLookupItem[]): string[] {
    return Array.from(
      new Set(
        items
          .map((item) => item.name.trim())
          .filter((name) => name.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  private groupLookupNames(names: string[]): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    names.forEach((name) => {
      const letter = name.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : '#';

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(name);
    });

    return grouped;
  }

  private resolveLookupNameById(items: RatioLookupItem[], id: number | null): string {
    if (!id || id <= 0) {
      return '';
    }

    return items.find((item) => item.id === id)?.name ?? '';
  }

  private resolveLookupIdByName(items: RatioLookupItem[], name: string): number | null {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const match = items.find((item) => item.name.trim().toLowerCase() === normalized);
    return match ? match.id : null;
  }
}
