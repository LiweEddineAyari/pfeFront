import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, combineLatest } from 'rxjs';
import {
  EtlApiService,
  MappingConfigRow,
  MappingConfigUpsertRequest,
} from '../../core/services/etl-api.service';

type EditableField = 'tableSource' | 'tableTarget' | 'columnSource' | 'columnTarget';

interface EditableMappingConfig extends MappingConfigRow {}

@Component({
  selector: 'app-mapping-config-details',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule],
  templateUrl: './mapping-config-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingConfigDetailsComponent implements OnInit, OnDestroy {
  private etlApi = inject(EtlApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private routeSubscription?: Subscription;

  groupNumber = signal<number | null>(null);
  items = signal<MappingConfigRow[]>([]);
  draftItems = signal<EditableMappingConfig[]>([]);

  rowCount = computed(() => this.items().length);

  editMode = signal(false);
  loading = signal(false);
  savingId = signal<number | null>(null);
  error = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  readonly skeletonRows = Array.from({ length: 4 }, (_, i) => i);

  ngOnInit(): void {
    this.routeSubscription = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(
      ([params, queryParams]) => {
        const parsedGroup = Number(params.get('configGroupNumber'));

        if (!Number.isInteger(parsedGroup)) {
          this.groupNumber.set(null);
          this.items.set([]);
          this.draftItems.set([]);
          this.error.set('Numero de groupe invalide.');
          this.cdr.markForCheck();
          return;
        }

        this.groupNumber.set(parsedGroup);
        this.editMode.set((queryParams.get('mode') ?? '').toLowerCase() === 'edit');
        void this.loadGroup(parsedGroup);
      }
    );
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  async loadGroup(configGroupNumber: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const rows = await this.etlApi.getMappingConfigsByGroupNumber(configGroupNumber);
      const sorted = [...rows].sort((a, b) => a.id - b.id);
      this.items.set(sorted);
      this.draftItems.set(this.cloneRows(sorted));

      if (sorted.length === 0) {
        this.infoMessage.set(`Aucune ligne trouvee pour Config ${configGroupNumber}.`);
      } else {
        this.infoMessage.set(null);
      }
    } catch (err: any) {
      this.error.set(err?.message ?? `Erreur de chargement de Config ${configGroupNumber}`);
      this.items.set([]);
      this.draftItems.set([]);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  async refresh(): Promise<void> {
    const currentGroup = this.groupNumber();
    if (currentGroup === null) {
      return;
    }

    await this.loadGroup(currentGroup);
  }

  goBack(): void {
    void this.router.navigate(['/mapping/configurations']);
  }

  toggleEditMode(): void {
    const nextEditMode = !this.editMode();
    this.editMode.set(nextEditMode);

    if (nextEditMode) {
      this.infoMessage.set('Mode edition active. Modifiez puis enregistrez chaque ligne.');
      return;
    }

    this.resetDrafts();
    this.infoMessage.set('Mode lecture active.');
  }

  updateDraftValue(rowId: number, field: EditableField, value: string): void {
    this.draftItems.update((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  }

  resetRow(rowId: number): void {
    const original = this.items().find((item) => item.id === rowId);
    if (!original) {
      return;
    }

    this.draftItems.update((rows) => rows.map((row) => (row.id === rowId ? { ...original } : row)));
  }

  isRowDirty(row: EditableMappingConfig): boolean {
    const original = this.items().find((item) => item.id === row.id);
    if (!original) {
      return false;
    }

    return (
      row.tableSource !== original.tableSource ||
      row.tableTarget !== original.tableTarget ||
      row.columnSource !== original.columnSource ||
      row.columnTarget !== original.columnTarget
    );
  }

  canSaveRow(row: EditableMappingConfig): boolean {
    if (!this.editMode()) {
      return false;
    }

    if (this.savingId() === row.id) {
      return false;
    }

    return this.hasRequiredValues(row) && this.isRowDirty(row);
  }

  async saveRow(rowId: number): Promise<void> {
    const currentGroup = this.groupNumber();
    if (currentGroup === null) {
      this.error.set('Impossible de sauvegarder: groupe invalide.');
      return;
    }

    const row = this.draftItems().find((item) => item.id === rowId);
    if (!row) {
      return;
    }

    if (!this.hasRequiredValues(row)) {
      this.error.set('Tous les champs doivent etre renseignes avant de sauvegarder.');
      return;
    }

    const payload: MappingConfigUpsertRequest = {
      tableSource: row.tableSource.trim(),
      tableTarget: row.tableTarget.trim(),
      columnSource: row.columnSource.trim(),
      columnTarget: row.columnTarget.trim(),
      configGroupNumber: currentGroup,
    };

    this.savingId.set(rowId);
    this.error.set(null);
    this.infoMessage.set(null);

    try {
      const updated = await this.etlApi.updateMappingConfig(rowId, payload);

      this.items.update((rows) => rows.map((item) => (item.id === rowId ? updated : item)));
      this.draftItems.update((rows) => rows.map((item) => (item.id === rowId ? { ...updated } : item)));
      this.infoMessage.set(`Mapping ${rowId} enregistre avec succes.`);
    } catch (err: any) {
      this.error.set(err?.message ?? `Impossible de sauvegarder le mapping ${rowId}`);
    } finally {
      this.savingId.set(null);
      this.cdr.markForCheck();
    }
  }

  trackById(_: number, item: EditableMappingConfig): number {
    return item.id;
  }

  private resetDrafts(): void {
    this.draftItems.set(this.cloneRows(this.items()));
  }

  private cloneRows(rows: MappingConfigRow[]): EditableMappingConfig[] {
    return rows.map((row) => ({ ...row }));
  }

  private hasRequiredValues(row: EditableMappingConfig): boolean {
    return (
      row.tableSource.trim().length > 0 &&
      row.tableTarget.trim().length > 0 &&
      row.columnSource.trim().length > 0 &&
      row.columnTarget.trim().length > 0
    );
  }
}
