import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  ApiErrorResponse,
  RatioConfigResponseDTO,
  RatioLookupItem,
} from '../../core/models/ratio.model';
import { RatioApiHttpError, RatiosApiService } from '../../core/services/ratios-api.service';
import {
  ApiErrorResponse as ParameterApiErrorResponse,
  ParameterConfigResponseDTO,
} from '../../core/models/parameter.model';
import { ApiHttpError, ParametersApiService } from '../../core/services/parameters-api.service';
import { RatioFormDialogComponent } from './components/ratio-form-dialog.component';
import { RatioDetailsDialogComponent } from './components/ratio-details-dialog.component';

@Component({
  selector: 'app-ratios-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    RatioFormDialogComponent,
    RatioDetailsDialogComponent,
  ],
  templateUrl: './ratios-page.component.html',
  styleUrl: './ratios-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatiosPageComponent implements OnInit {
  private readonly parametersPageSize = 10;
  private readonly lookupPageSize = 3;

  searchDraft = '';
  quickCodeDraft = '';

  loading = false;
  rows: RatioConfigResponseDTO[] = [];
  totalElements = 0;
  page = 0;
  size = 12;

  loadingLookups = false;
  lookupMutationInProgress = false;
  families: RatioLookupItem[] = [];
  categories: RatioLookupItem[] = [];
  familySearchDraft = '';
  categorySearchDraft = '';
  familyPage = 0;
  categoryPage = 0;

  lookupEditorOpen = false;
  lookupEditorMode: 'create' | 'edit' = 'create';
  lookupEditorType: 'family' | 'category' = 'family';
  lookupEditorId: number | null = null;
  lookupEditorNameDraft = '';
  lookupEditorError: string | null = null;

  lookupDeleteOpen = false;
  lookupDeleteType: 'family' | 'category' = 'family';
  lookupDeleteItem: RatioLookupItem | null = null;

  loadingParameters = false;
  parametersRows: ParameterConfigResponseDTO[] = [];
  parameterSearchDraft = '';
  parameterPage = 0;

  bannerError: ApiErrorResponse | null = null;
  infoMessage: string | null = null;

  formDialogOpen = false;
  formDialogMode: 'create' | 'edit' = 'create';
  formDialogCode: string | null = null;
  formDialogInitial: RatioConfigResponseDTO | null = null;

  detailsDialogOpen = false;
  detailsDialogCode: string | null = null;
  detailsDialogInitial: RatioConfigResponseDTO | null = null;

  deleteConfirmOpen = false;
  deleteConfirmCode = '';
  deleteInProgress = false;

  constructor(
    private ratiosApi: RatiosApiService,
    private parametersApi: ParametersApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void Promise.all([
      this.loadRatios(),
      this.loadLookups(),
      this.loadParameters(),
    ]);
  }

  get hasPreviousPage(): boolean {
    return this.page > 0;
  }

  get hasNextPage(): boolean {
    const shown = (this.page + 1) * this.size;
    return shown < this.totalElements;
  }

  get familyRows(): RatioLookupItem[] {
    const search = this.familySearchDraft.trim().toLowerCase();
    const lookup = this.mergeLookup(this.families, this.lookupFromRatios('familleId', 'Famille'));

    if (!search) {
      return lookup;
    }

    return lookup.filter(
      (item) => item.name.toLowerCase().includes(search) || String(item.id).includes(search)
    );
  }

  get familyTotalPages(): number {
    return Math.max(1, Math.ceil(this.familyRows.length / this.lookupPageSize));
  }

  get currentFamilyPage(): number {
    return Math.min(this.familyPage, this.familyTotalPages - 1);
  }

  get pagedFamilyRows(): RatioLookupItem[] {
    const start = this.currentFamilyPage * this.lookupPageSize;
    return this.familyRows.slice(start, start + this.lookupPageSize);
  }

  get hasPreviousFamilyPage(): boolean {
    return this.currentFamilyPage > 0;
  }

  get hasNextFamilyPage(): boolean {
    return this.currentFamilyPage + 1 < this.familyTotalPages;
  }

  get categoryRows(): RatioLookupItem[] {
    const search = this.categorySearchDraft.trim().toLowerCase();
    const lookup = this.mergeLookup(this.categories, this.lookupFromRatios('categorieId', 'Categorie'));

    if (!search) {
      return lookup;
    }

    return lookup.filter(
      (item) => item.name.toLowerCase().includes(search) || String(item.id).includes(search)
    );
  }

  get categoryTotalPages(): number {
    return Math.max(1, Math.ceil(this.categoryRows.length / this.lookupPageSize));
  }

  get currentCategoryPage(): number {
    return Math.min(this.categoryPage, this.categoryTotalPages - 1);
  }

  get pagedCategoryRows(): RatioLookupItem[] {
    const start = this.currentCategoryPage * this.lookupPageSize;
    return this.categoryRows.slice(start, start + this.lookupPageSize);
  }

  get hasPreviousCategoryPage(): boolean {
    return this.currentCategoryPage > 0;
  }

  get hasNextCategoryPage(): boolean {
    return this.currentCategoryPage + 1 < this.categoryTotalPages;
  }

  get lookupDeleteTypeLabel(): string {
    return this.lookupDeleteType === 'family' ? 'famille' : 'categorie';
  }

  get parameterCodes(): string[] {
    return Array.from(
      new Set(
        this.parametersRows
          .map((item) => item.code?.trim() ?? '')
          .filter((code) => code.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  get groupedParameterCodes(): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    this.parameterCodes.forEach((code) => {
      const parts = code.split('_').filter((part) => part.length > 0);
      const key = parts.length > 1 ? parts[0].toLowerCase() : 'parametres';

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(code);
    });

    return grouped;
  }

  get filteredParameters(): ParameterConfigResponseDTO[] {
    const search = this.parameterSearchDraft.trim().toLowerCase();
    if (!search) {
      return this.parametersRows;
    }

    return this.parametersRows.filter((item) => {
      const code = item.code?.toLowerCase() ?? '';
      const label = item.label?.toLowerCase() ?? '';
      return code.includes(search) || label.includes(search);
    });
  }

  get parameterTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredParameters.length / this.parametersPageSize));
  }

  get currentParameterPage(): number {
    return Math.min(this.parameterPage, this.parameterTotalPages - 1);
  }

  get pagedParameters(): ParameterConfigResponseDTO[] {
    const start = this.currentParameterPage * this.parametersPageSize;
    return this.filteredParameters.slice(start, start + this.parametersPageSize);
  }

  get hasPreviousParameterPage(): boolean {
    return this.currentParameterPage > 0;
  }

  get hasNextParameterPage(): boolean {
    return this.currentParameterPage + 1 < this.parameterTotalPages;
  }

  get lookupFamiliesForDialog(): RatioLookupItem[] {
    return this.mergeLookup(this.families, this.lookupFromRatios('familleId', 'Famille'));
  }

  get lookupCategoriesForDialog(): RatioLookupItem[] {
    return this.mergeLookup(this.categories, this.lookupFromRatios('categorieId', 'Categorie'));
  }

  familyLabel(id: number): string {
    return this.resolveLookupLabel(id, 'family');
  }

  categoryLabel(id: number): string {
    return this.resolveLookupLabel(id, 'category');
  }

  familyBadgeTone(id: number): 'family' | 'unknown' {
    return this.resolvePrimaryLookupName(this.families, id) ? 'family' : 'unknown';
  }

  categoryBadgeTone(id: number): 'category' | 'unknown' {
    return this.resolvePrimaryLookupName(this.categories, id) ? 'category' : 'unknown';
  }

  async loadRatios(): Promise<void> {
    this.loading = true;
    this.bannerError = null;

    try {
      const response = await this.ratiosApi.list({
        page: this.page,
        size: this.size,
        search: this.searchDraft.trim(),
      });

      this.rows = response.items;
      this.totalElements = response.totalElements;
      this.infoMessage =
        response.source === 'cache'
          ? 'Le endpoint backend de ratios est indisponible. Affichage en cache local.'
          : null;
    } catch (error) {
      this.bannerError = this.extractApiError(error);
      this.rows = [];
      this.totalElements = 0;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async loadLookups(): Promise<void> {
    if (this.loadingLookups) {
      return;
    }

    this.loadingLookups = true;

    try {
      const [families, categories] = await Promise.all([
        this.ratiosApi.listFamilies(),
        this.ratiosApi.listCategories(),
      ]);

      this.families = families;
      this.categories = categories;
      this.familyPage = 0;
      this.categoryPage = 0;
    } catch (error) {
      this.bannerError = this.extractApiError(error);
    } finally {
      this.loadingLookups = false;
      this.cdr.markForCheck();
    }
  }

  addLookupItem(type: 'family' | 'category'): void {
    this.openLookupEditor(type, 'create');
  }

  editLookupItem(type: 'family' | 'category', item: RatioLookupItem): void {
    this.openLookupEditor(type, 'edit', item);
  }

  async deleteLookupItem(type: 'family' | 'category', item: RatioLookupItem): Promise<void> {
    if (this.lookupMutationInProgress) {
      return;
    }

    this.lookupDeleteType = type;
    this.lookupDeleteItem = item;
    this.lookupDeleteOpen = true;
    this.cdr.markForCheck();
  }

  async loadParameters(): Promise<void> {
    this.loadingParameters = true;

    try {
      const response = await this.parametersApi.list({
        page: 0,
        size: 500,
      });

      this.parametersRows = response.items
        .filter((item) => !!item.code?.trim())
        .sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''));
      this.parameterPage = 0;
    } catch (error) {
      this.bannerError = this.extractApiError(error);
      this.parametersRows = [];
    } finally {
      this.loadingParameters = false;
      this.cdr.markForCheck();
    }
  }

  async runSearch(): Promise<void> {
    this.page = 0;
    await this.loadRatios();
  }

  async clearSearch(): Promise<void> {
    this.searchDraft = '';
    this.page = 0;
    await this.loadRatios();
  }

  onParameterSearchChanged(): void {
    this.parameterPage = 0;
  }

  onFamilySearchChanged(): void {
    this.familyPage = 0;
  }

  onCategorySearchChanged(): void {
    this.categoryPage = 0;
  }

  previousParameterPage(): void {
    if (!this.hasPreviousParameterPage) {
      return;
    }

    this.parameterPage = this.currentParameterPage - 1;
  }

  nextParameterPage(): void {
    if (!this.hasNextParameterPage) {
      return;
    }

    this.parameterPage = this.currentParameterPage + 1;
  }

  previousFamilyPage(): void {
    if (!this.hasPreviousFamilyPage) {
      return;
    }

    this.familyPage = this.currentFamilyPage - 1;
  }

  nextFamilyPage(): void {
    if (!this.hasNextFamilyPage) {
      return;
    }

    this.familyPage = this.currentFamilyPage + 1;
  }

  previousCategoryPage(): void {
    if (!this.hasPreviousCategoryPage) {
      return;
    }

    this.categoryPage = this.currentCategoryPage - 1;
  }

  nextCategoryPage(): void {
    if (!this.hasNextCategoryPage) {
      return;
    }

    this.categoryPage = this.currentCategoryPage + 1;
  }

  closeLookupEditor(): void {
    if (this.lookupMutationInProgress) {
      return;
    }

    this.lookupEditorOpen = false;
    this.lookupEditorError = null;
    this.lookupEditorNameDraft = '';
    this.lookupEditorId = null;
    this.cdr.markForCheck();
  }

  async submitLookupEditor(): Promise<void> {
    if (!this.lookupEditorOpen || this.lookupMutationInProgress) {
      return;
    }

    const name = this.lookupEditorNameDraft.trim();
    if (!name) {
      this.lookupEditorError = 'Le libelle est obligatoire.';
      this.cdr.markForCheck();
      return;
    }

    const type = this.lookupEditorType;
    const mode = this.lookupEditorMode;
    const label = this.lookupTypeLabel(type);

    this.lookupEditorError = null;

    const ok = await this.runLookupMutation(async () => {
      if (mode === 'create') {
        if (type === 'family') {
          await this.ratiosApi.createFamily(name);
        } else {
          await this.ratiosApi.createCategory(name);
        }

        this.infoMessage = `${this.capitalize(label)} ajoutee avec succes.`;
        return;
      }

      const id = this.lookupEditorId;
      if (!id) {
        throw new Error('Identifiant manquant pour la mise a jour.');
      }

      if (type === 'family') {
        await this.ratiosApi.updateFamily(id, name);
      } else {
        await this.ratiosApi.updateCategory(id, name);
      }

      this.infoMessage = `${this.capitalize(label)} #${id} mise a jour.`;
    });

    if (ok) {
      this.closeLookupEditor();
    }
  }

  closeLookupDeletePopup(): void {
    if (this.lookupMutationInProgress) {
      return;
    }

    this.lookupDeleteOpen = false;
    this.lookupDeleteItem = null;
    this.cdr.markForCheck();
  }

  async confirmLookupDeleteFromPopup(): Promise<void> {
    if (this.lookupMutationInProgress || !this.lookupDeleteItem) {
      return;
    }

    const item = this.lookupDeleteItem;
    const type = this.lookupDeleteType;
    const label = this.lookupTypeLabel(type);

    const ok = await this.runLookupMutation(async () => {
      if (type === 'family') {
        await this.ratiosApi.deleteFamily(item.id);
      } else {
        await this.ratiosApi.deleteCategory(item.id);
      }

      this.infoMessage = `${this.capitalize(label)} #${item.id} supprimee.`;
    });

    if (ok) {
      this.closeLookupDeletePopup();
    }
  }

  async previousPage(): Promise<void> {
    if (!this.hasPreviousPage) {
      return;
    }

    this.page -= 1;
    await this.loadRatios();
  }

  async nextPage(): Promise<void> {
    if (!this.hasNextPage) {
      return;
    }

    this.page += 1;
    await this.loadRatios();
  }

  openCreateDialog(): void {
    this.detailsDialogOpen = false;
    this.formDialogMode = 'create';
    this.formDialogCode = null;
    this.formDialogInitial = null;
    this.formDialogOpen = true;
    this.cdr.markForCheck();
  }

  openEditDialog(ratio: RatioConfigResponseDTO): void {
    const code = this.safeCode(ratio);
    if (!code) {
      this.infoMessage = 'Ce ratio est incomplet et ne peut pas etre modifie.';
      this.cdr.markForCheck();
      return;
    }

    this.detailsDialogOpen = false;
    this.formDialogMode = 'edit';
    this.formDialogCode = code;
    this.formDialogInitial = ratio;
    this.formDialogOpen = true;
    this.cdr.markForCheck();
  }

  openDetailsDialog(ratio: RatioConfigResponseDTO): void {
    const code = this.safeCode(ratio);
    if (!code) {
      this.infoMessage = 'Ce ratio est incomplet et ne peut pas etre affiche.';
      this.cdr.markForCheck();
      return;
    }

    this.formDialogOpen = false;
    this.detailsDialogCode = code;
    this.detailsDialogInitial = ratio;
    this.detailsDialogOpen = true;
    this.cdr.markForCheck();
  }

  openDetailsByCode(): void {
    const code = this.quickCodeDraft.trim();
    if (!code) {
      return;
    }

    this.formDialogOpen = false;
    this.detailsDialogCode = code;
    this.detailsDialogInitial = null;
    this.detailsDialogOpen = true;
    this.quickCodeDraft = '';
    this.cdr.markForCheck();
  }

  deleteFromList(ratio: RatioConfigResponseDTO): void {
    const code = this.safeCode(ratio);
    if (!code) {
      this.infoMessage = 'Ce ratio est incomplet et ne peut pas etre supprime.';
      this.cdr.markForCheck();
      return;
    }

    this.openDeleteConfirmation(code);
  }

  closeFormDialog(): void {
    this.formDialogOpen = false;
    this.cdr.markForCheck();
  }

  closeDetailsDialog(): void {
    this.detailsDialogOpen = false;
    this.cdr.markForCheck();
  }

  async onFormSaved(saved: RatioConfigResponseDTO): Promise<void> {
    this.formDialogOpen = false;
    this.infoMessage = 'Le ratio a ete enregistre avec succes.';
    await this.loadRatios();
    this.openDetailsDialog(saved);
  }

  async onEditRequested(ratio: RatioConfigResponseDTO): Promise<void> {
    this.detailsDialogOpen = false;
    this.openEditDialog(ratio);
  }

  onDeleteRequested(ratio: RatioConfigResponseDTO): void {
    this.detailsDialogOpen = false;

    const code = this.safeCode(ratio);
    if (!code) {
      this.infoMessage = 'Ce ratio est incomplet et ne peut pas etre supprime.';
      this.cdr.markForCheck();
      return;
    }

    this.openDeleteConfirmation(code);
  }

  cancelDeleteConfirmation(): void {
    if (this.deleteInProgress) {
      return;
    }

    this.deleteConfirmOpen = false;
    this.deleteConfirmCode = '';
    this.cdr.markForCheck();
  }

  async confirmDeleteFromPopup(): Promise<void> {
    if (this.deleteInProgress) {
      return;
    }

    const code = this.deleteConfirmCode.trim();
    if (!code) {
      this.cancelDeleteConfirmation();
      return;
    }

    await this.deleteRatioByCode(code);
  }

  trackByCode = (index: number, row: RatioConfigResponseDTO): string => {
    const code = row?.code?.trim() ?? '';
    if (code) {
      return code;
    }

    const rawId = row?.id;
    const id = typeof rawId === 'number' && Number.isFinite(rawId) ? rawId : index;
    return `ligne-${id}-${index}`;
  };

  trackByLookup(_: number, item: RatioLookupItem): number {
    return item.id;
  }

  trackByParameterCode(_: number, item: ParameterConfigResponseDTO): string {
    return item.code;
  }

  private async deleteRatioByCode(code: string): Promise<void> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      return;
    }

    this.bannerError = null;
    this.infoMessage = null;
    this.deleteInProgress = true;

    try {
      await this.ratiosApi.deleteByCode(normalizedCode);

      if (this.rows.length === 1 && this.page > 0) {
        this.page -= 1;
      }

      this.infoMessage = `Le ratio ${normalizedCode} a ete supprime avec succes.`;
      this.deleteConfirmOpen = false;
      this.deleteConfirmCode = '';
      await this.loadRatios();
    } catch (error) {
      this.bannerError = this.extractApiError(error);
      this.infoMessage = null;
      this.cdr.markForCheck();
    } finally {
      this.deleteInProgress = false;
      this.cdr.markForCheck();
    }
  }

  private openDeleteConfirmation(code: string): void {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      return;
    }

    this.deleteConfirmCode = normalizedCode;
    this.deleteConfirmOpen = true;
    this.cdr.markForCheck();
  }

  private safeCode(ratio: RatioConfigResponseDTO | null | undefined): string {
    return ratio?.code?.trim() ?? '';
  }

  private lookupFromRatios(
    key: 'familleId' | 'categorieId',
    label: string
  ): RatioLookupItem[] {
    const ids = Array.from(
      new Set(
        this.rows
          .map((row) => Number(row[key]))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    ).sort((a, b) => a - b);

    return ids.map((id) => ({
      id,
      name: `${label} ${id}`,
    }));
  }

  private mergeLookup(primary: RatioLookupItem[], fallback: RatioLookupItem[]): RatioLookupItem[] {
    const merged = new Map<number, RatioLookupItem>();

    [...primary, ...fallback].forEach((item) => {
      if (!item || !Number.isFinite(item.id) || item.id <= 0) {
        return;
      }

      const previous = merged.get(item.id);
      const currentName = item.name?.trim() || '';
      const previousName = previous?.name?.trim() || '';
      const name = this.pickBestLookupName(item.id, previousName, currentName);

      merged.set(item.id, {
        id: item.id,
        name,
      });
    });

    return Array.from(merged.values()).sort((a, b) => a.id - b.id);
  }

  private pickBestLookupName(id: number, previousName: string, currentName: string): string {
    if (!previousName) {
      return currentName || `ID ${id}`;
    }

    if (!currentName) {
      return previousName;
    }

    const previousGeneric = this.isGenericLookupName(previousName);
    const currentGeneric = this.isGenericLookupName(currentName);

    if (previousGeneric && !currentGeneric) {
      return currentName;
    }

    if (!previousGeneric && currentGeneric) {
      return previousName;
    }

    return previousName;
  }

  private isGenericLookupName(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return /^id\s+\d+$/.test(normalized)
      || /^famille\s+\d+$/.test(normalized)
      || /^categorie\s+\d+$/.test(normalized)
      || /^category\s+\d+$/.test(normalized)
      || /^family\s+\d+$/.test(normalized);
  }

  private resolveLookupLabel(id: number, type: 'family' | 'category'): string {
    const normalizedId = Number(id);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
      return 'Inconnu';
    }

    const primary = type === 'family' ? this.families : this.categories;
    const primaryName = this.resolvePrimaryLookupName(primary, normalizedId);
    if (primaryName) {
      return primaryName;
    }

    const fallback = type === 'family'
      ? this.lookupFromRatios('familleId', 'Famille')
      : this.lookupFromRatios('categorieId', 'Categorie');

    const fallbackName = this.resolvePrimaryLookupName(fallback, normalizedId);
    return fallbackName ?? 'Inconnu';
  }

  private resolvePrimaryLookupName(items: RatioLookupItem[], id: number): string | null {
    const match = items.find((item) => item.id === id);
    const name = match?.name?.trim() ?? '';
    return name.length > 0 ? name : null;
  }

  private openLookupEditor(
    type: 'family' | 'category',
    mode: 'create' | 'edit',
    item?: RatioLookupItem
  ): void {
    this.lookupEditorType = type;
    this.lookupEditorMode = mode;
    this.lookupEditorError = null;
    this.lookupEditorOpen = true;

    if (mode === 'edit' && item) {
      this.lookupEditorId = item.id;
      this.lookupEditorNameDraft = item.name;
    } else {
      this.lookupEditorId = null;
      this.lookupEditorNameDraft = '';
    }

    this.cdr.markForCheck();
  }

  private async runLookupMutation(action: () => Promise<void>): Promise<boolean> {
    this.lookupMutationInProgress = true;
    this.bannerError = null;

    try {
      await action();
      await this.loadLookups();
      return true;
    } catch (error) {
      this.bannerError = this.extractApiError(error);
      return false;
    } finally {
      this.lookupMutationInProgress = false;
      this.cdr.markForCheck();
    }
  }

  private lookupTypeLabel(type: 'family' | 'category'): string {
    return type === 'family' ? 'famille' : 'categorie';
  }

  private capitalize(value: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private extractApiError(error: unknown): ApiErrorResponse {
    if (error instanceof RatioApiHttpError) {
      return error.apiError;
    }

    if (error instanceof ApiHttpError) {
      return this.mapFromParameterError(error.apiError);
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

  private mapFromParameterError(error: ParameterApiErrorResponse): ApiErrorResponse {
    return {
      timestamp: error.timestamp,
      status: error.status,
      error: error.error,
      message: error.message,
      details: Array.isArray(error.details) ? error.details : [],
      path: error.path,
    };
  }
}
