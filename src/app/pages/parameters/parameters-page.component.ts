import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiErrorResponse, ParameterConfigResponseDTO } from '../../core/models/parameter.model';
import { ApiHttpError, ParametersApiService } from '../../core/services/parameters-api.service';
import { ParameterFormDialogComponent } from './components/parameter-form-dialog.component';
import { ParameterDetailsDialogComponent } from './components/parameter-details-dialog.component';

interface SupportedFieldGroupView {
  table: string;
  displayName: string;
  fields: string[];
  visibleFields: string[];
  hiddenCount: number;
  expanded: boolean;
}

@Component({
  selector: 'app-parameters-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ParameterFormDialogComponent,
    ParameterDetailsDialogComponent,
  ],
  templateUrl: './parameters-page.component.html',
  styleUrl: './parameters-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametersPageComponent implements OnInit {
  private readonly maxCollapsedFieldsPerTable = 10;
  private readonly supportedGroupsPageSize = 2;

  searchDraft = '';
  quickCodeDraft = '';

  loading = false;
  rows: ParameterConfigResponseDTO[] = [];
  totalElements = 0;
  page = 0;
  size = 20;

  bannerError: ApiErrorResponse | null = null;
  infoMessage: string | null = null;

  supportedFields: string[] = [];
  supportedFieldsByTable: Record<string, string[]> = {};
  loadingSupportedFields = false;
  supportedFieldSearchDraft = '';
  supportedGroupsPage = 0;
  expandedSupportedFieldTables: Record<string, boolean> = {};

  formDialogOpen = false;
  formDialogMode: 'create' | 'edit' = 'create';
  formDialogCode: string | null = null;
  formDialogInitial: ParameterConfigResponseDTO | null = null;

  detailsDialogOpen = false;
  detailsDialogCode: string | null = null;
  detailsDialogInitial: ParameterConfigResponseDTO | null = null;

  deleteConfirmOpen = false;
  deleteConfirmCode = '';
  deleteInProgress = false;

  constructor(
    private parametersApi: ParametersApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadList();
    void this.ensureSupportedFields();
  }

  get supportedTablesCount(): number {
    return this.supportedFieldGroups.length;
  }

  get supportedFieldGroupsTotalPages(): number {
    return Math.max(1, Math.ceil(this.supportedFieldGroups.length / this.supportedGroupsPageSize));
  }

  get currentSupportedGroupsPage(): number {
    return Math.min(this.supportedGroupsPage, this.supportedFieldGroupsTotalPages - 1);
  }

  get pagedSupportedFieldGroups(): SupportedFieldGroupView[] {
    const page = this.currentSupportedGroupsPage;
    const start = page * this.supportedGroupsPageSize;
    return this.supportedFieldGroups.slice(start, start + this.supportedGroupsPageSize);
  }

  get hasPreviousSupportedGroupsPage(): boolean {
    return this.currentSupportedGroupsPage > 0;
  }

  get hasNextSupportedGroupsPage(): boolean {
    return this.currentSupportedGroupsPage + 1 < this.supportedFieldGroupsTotalPages;
  }

  get supportedFieldGroups(): SupportedFieldGroupView[] {
    const search = this.supportedFieldSearchDraft.trim().toLowerCase();

    return Object.entries(this.resolveSupportedFieldsByTable())
      .map(([table, rawFields]) => {
        const fields = Array.from(
          new Set(
            rawFields
              .map((field) => field.trim())
              .filter((field) => field.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));

        const filteredFields = search
          ? fields.filter((field) => field.toLowerCase().includes(search))
          : fields;

        if (filteredFields.length === 0) {
          return null;
        }

        const expanded = this.expandedSupportedFieldTables[table] === true;
        const visibleFields = expanded
          ? filteredFields
          : filteredFields.slice(0, this.maxCollapsedFieldsPerTable);

        return {
          table,
          displayName: this.formatTableName(table),
          fields: filteredFields,
          visibleFields,
          hiddenCount: Math.max(0, filteredFields.length - visibleFields.length),
          expanded,
        };
      })
      .filter((group): group is SupportedFieldGroupView => group !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  get hasPreviousPage(): boolean {
    return this.page > 0;
  }

  get hasNextPage(): boolean {
    const shown = (this.page + 1) * this.size;
    return shown < this.totalElements;
  }

  async loadList(): Promise<void> {
    this.loading = true;
    this.bannerError = null;

    try {
      const response = await this.parametersApi.list({
        page: this.page,
        size: this.size,
        search: this.searchDraft.trim(),
      });

      this.rows = response.items;
      this.totalElements = response.totalElements;
      this.infoMessage =
        response.source === 'cache'
          ? 'Le endpoint de liste backend est indisponible. Affichage des parametres en cache/connus.'
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

  async runSearch(): Promise<void> {
    this.page = 0;
    await this.loadList();
  }

  async clearSearch(): Promise<void> {
    this.searchDraft = '';
    this.page = 0;
    await this.loadList();
  }

  onSupportedFieldSearchChanged(): void {
    this.supportedGroupsPage = 0;
  }

  toggleSupportedFieldsVisibility(table: string): void {
    this.expandedSupportedFieldTables[table] = !(this.expandedSupportedFieldTables[table] ?? false);
  }

  async refreshSupportedFields(): Promise<void> {
    await this.ensureSupportedFields(true);
  }

  previousSupportedGroupsPage(): void {
    if (!this.hasPreviousSupportedGroupsPage) {
      return;
    }

    this.supportedGroupsPage = this.currentSupportedGroupsPage - 1;
  }

  nextSupportedGroupsPage(): void {
    if (!this.hasNextSupportedGroupsPage) {
      return;
    }

    this.supportedGroupsPage = this.currentSupportedGroupsPage + 1;
  }

  async previousPage(): Promise<void> {
    if (!this.hasPreviousPage) {
      return;
    }

    this.page -= 1;
    await this.loadList();
  }

  async nextPage(): Promise<void> {
    if (!this.hasNextPage) {
      return;
    }

    this.page += 1;
    await this.loadList();
  }

  async openCreateDialog(): Promise<void> {
    await this.ensureSupportedFields();

    this.detailsDialogOpen = false;
    this.formDialogMode = 'create';
    this.formDialogCode = null;
    this.formDialogInitial = null;
    this.formDialogOpen = true;
    this.cdr.markForCheck();
  }

  async openEditDialog(parameter: ParameterConfigResponseDTO): Promise<void> {
    const code = this.safeCode(parameter);
    if (!code) {
      this.infoMessage = 'Ce parametre est incomplet et ne peut pas etre modifie.';
      this.cdr.markForCheck();
      return;
    }

    await this.ensureSupportedFields();

    this.detailsDialogOpen = false;
    this.formDialogMode = 'edit';
    this.formDialogCode = code;
    this.formDialogInitial = this.canUseParameterAsInitial(parameter) ? parameter : null;
    this.formDialogOpen = true;
    this.cdr.markForCheck();
  }

  async deleteFromList(parameter: ParameterConfigResponseDTO): Promise<void> {
    const code = this.safeCode(parameter);
    if (!code) {
      this.infoMessage = 'Ce parametre est incomplet et ne peut pas etre supprime.';
      this.cdr.markForCheck();
      return;
    }

    this.openDeleteConfirmation(code);
  }

  openDetailsDialog(parameter: ParameterConfigResponseDTO): void {
    const code = this.safeCode(parameter);
    if (!code) {
      this.infoMessage = 'Ce parametre est incomplet et ne peut pas etre affiche.';
      this.cdr.markForCheck();
      return;
    }

    this.formDialogOpen = false;
    this.detailsDialogCode = code;
    this.detailsDialogInitial = this.canUseParameterAsInitial(parameter) ? parameter : null;
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

  closeFormDialog(): void {
    this.formDialogOpen = false;
    this.cdr.markForCheck();
  }

  closeDetailsDialog(): void {
    this.detailsDialogOpen = false;
    this.cdr.markForCheck();
  }

  async onFormSaved(saved: ParameterConfigResponseDTO): Promise<void> {
    this.formDialogOpen = false;
    this.infoMessage = 'Le parametre a ete enregistre avec succes.';
    await this.loadList();
    this.openDetailsDialog(saved);
  }

  async onDeleteRequested(parameter: ParameterConfigResponseDTO): Promise<void> {
    this.detailsDialogOpen = false;
    const code = this.safeCode(parameter);
    if (!code) {
      this.infoMessage = 'Ce parametre est incomplet et ne peut pas etre supprime.';
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

    await this.deleteParameterByCode(code);
  }

  async onEditRequested(parameter: ParameterConfigResponseDTO): Promise<void> {
    this.detailsDialogOpen = false;
    await this.openEditDialog(parameter);
  }

  trackByCode = (index: number, row: ParameterConfigResponseDTO): string => {
    const code = row?.code?.trim() ?? '';
    if (code) {
      return code;
    }

    const rawId = row?.id;
    const id = typeof rawId === 'number' && Number.isFinite(rawId) ? rawId : index;
    return `ligne-${id}-${index}`;
  };

  trackBySupportedTable(_: number, group: SupportedFieldGroupView): string {
    return group.table;
  }

  private async ensureSupportedFields(force = false): Promise<void> {
    if ((!force && this.supportedFields.length > 0) || this.loadingSupportedFields) {
      return;
    }

    this.loadingSupportedFields = true;
    if (force) {
      this.supportedFields = [];
      this.supportedFieldsByTable = {};
      this.supportedGroupsPage = 0;
      this.expandedSupportedFieldTables = {};
    }

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
      this.supportedGroupsPage = 0;
      this.expandedSupportedFieldTables = {};
    } catch (error) {
      this.bannerError = this.extractApiError(error);
    } finally {
      this.loadingSupportedFields = false;
      this.cdr.markForCheck();
    }
  }

  private async deleteParameterByCode(code: string): Promise<void> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      return;
    }

    this.bannerError = null;
    this.infoMessage = null;
    this.deleteInProgress = true;

    try {
      await this.parametersApi.deleteByCode(normalizedCode);

      if (this.rows.length === 1 && this.page > 0) {
        this.page -= 1;
      }

      this.infoMessage = `Le parametre ${normalizedCode} a ete supprime avec succes.`;
      this.deleteConfirmOpen = false;
      this.deleteConfirmCode = '';
      await this.loadList();
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

  private safeCode(parameter: ParameterConfigResponseDTO | null | undefined): string {
    return parameter?.code?.trim() ?? '';
  }

  private canUseParameterAsInitial(parameter: ParameterConfigResponseDTO | null | undefined): boolean {
    if (!parameter) {
      return false;
    }

    const hasCode = this.safeCode(parameter).length > 0;
    const hasLabel = (parameter.label ?? '').trim().length > 0;
    const hasFormula = !!parameter.formula?.expression;

    return hasCode && hasLabel && hasFormula;
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

  private resolveSupportedFieldsByTable(): Record<string, string[]> {
    if (Object.keys(this.supportedFieldsByTable).length > 0) {
      return this.supportedFieldsByTable;
    }

    if (this.supportedFields.length > 0) {
      return {
        champs_supportes: this.supportedFields,
      };
    }

    return {};
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

  private formatTableName(table: string): string {
    const normalized = table
      .replace(/^datamart\./i, '')
      .replace(/[._]+/g, ' ')
      .trim();

    if (!normalized) {
      return 'Champs';
    }

    const lowered = normalized.toLowerCase();
    if (lowered === 'supported fields' || lowered === 'champs supportes') {
      return 'Champs supportes';
    }

    if (lowered === 'other fields' || lowered === 'autres champs') {
      return 'Autres champs';
    }

    return normalized
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
