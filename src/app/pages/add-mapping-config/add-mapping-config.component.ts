import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  DbConnectionConfig,
  DbType,
  EtlApiService,
  MappingConfigUpsertRequest,
  SourceTableMetadata,
} from '../../core/services/etl-api.service';
import { FieldMappingComponent } from '../../shared/components/field-mapping/field-mapping.component';

type MappingTarget = 'TIERS' | 'CONTRAT' | 'COMPTA';
type AddMappingStep =
  | 'intro'
  | 'connect'
  | 'table-match'
  | 'map-tiers'
  | 'map-contrat'
  | 'map-compta'
  | 'submitting'
  | 'result';

interface MappingTargetDefinition {
  key: MappingTarget;
  label: string;
  targetTable: string;
  hint: string;
  icon: string;
  suggestFrom: string[];
}

@Component({
  selector: 'app-add-mapping-config',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FieldMappingComponent],
  templateUrl: './add-mapping-config.component.html',
  styleUrls: ['./add-mapping-config.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddMappingConfigComponent {
  step: AddMappingStep = 'intro';

  readonly dbTypeOptions: DbType[] = ['POSTGRES', 'MYSQL', 'SQLSERVER', 'ORACLE'];

  dbConnection: DbConnectionConfig = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    dbType: 'POSTGRES',
    username: 'postgres',
    password: '',
    table: '',
    schema: 'source',
  };

  configGroupNumber = 1;

  readonly targets: MappingTargetDefinition[] = [
    {
      key: 'TIERS',
      label: 'Tiers',
      targetTable: 'staging.stg_tiers_raw',
      hint: 'Mappez une table source client/tiers',
      icon: 'users',
      suggestFrom: ['client', 'tiers'],
    },
    {
      key: 'CONTRAT',
      label: 'Contrat',
      targetTable: 'staging.stg_contrat_raw',
      hint: 'Mappez une table source contrat',
      icon: 'file-text',
      suggestFrom: ['contrat'],
    },
    {
      key: 'COMPTA',
      label: 'Compta',
      targetTable: 'staging.stg_compta_raw',
      hint: 'Mappez une table source balance/compta',
      icon: 'dollar-sign',
      suggestFrom: ['balance', 'compta'],
    },
  ];

  sourceTables: SourceTableMetadata[] = [];
  isFetchingSchema = false;
  schemaError: string | null = null;

  selectedSourceByTarget: Record<MappingTarget, string> = {
    TIERS: '',
    CONTRAT: '',
    COMPTA: '',
  };

  mappingsByTarget: Record<MappingTarget, Record<string, string>> = {
    TIERS: {},
    CONTRAT: {},
    COMPTA: {},
  };

  isSubmitting = false;
  submitError: string | null = null;
  submitSuccessMessage: string | null = null;
  submittedCount = 0;

  constructor(
    private etlApi: EtlApiService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  setStep(step: AddMappingStep): void {
    this.step = step;
    this.cdr.markForCheck();
  }

  getSliderTransform(): string {
    switch (this.step) {
      case 'intro':
        return 'translateX(0%)';
      case 'connect':
        return 'translateX(-12.5%)';
      case 'table-match':
        return 'translateX(-25%)';
      case 'map-tiers':
        return 'translateX(-37.5%)';
      case 'map-contrat':
        return 'translateX(-50%)';
      case 'map-compta':
        return 'translateX(-62.5%)';
      case 'submitting':
        return 'translateX(-75%)';
      case 'result':
        return 'translateX(-87.5%)';
      default:
        return 'translateX(0%)';
    }
  }

  get canDiscoverSchema(): boolean {
    const c = this.dbConnection;
    return !!c.host.trim()
      && Number.isFinite(Number(c.port))
      && Number(c.port) > 0
      && !!c.database.trim()
      && !!c.username.trim()
      && !!c.password
      && !!(c.schema ?? '').trim();
  }

  get canContinueToMappings(): boolean {
    return this.targets.every((target) => !!this.selectedSourceByTarget[target.key]);
  }

  get hasSourceTables(): boolean {
    return this.sourceTables.length > 0;
  }

  get totalMappedColumns(): number {
    return Object.values(this.mappingsByTarget)
      .reduce((sum, current) => sum + Object.keys(current).length, 0);
  }

  getSelectedSource(target: MappingTarget): string {
    return this.selectedSourceByTarget[target];
  }

  onSelectedSourceChange(target: MappingTarget, qualifiedTable: string): void {
    this.selectedSourceByTarget[target] = qualifiedTable;
    this.mappingsByTarget[target] = {};
    this.cdr.markForCheck();
  }

  async discoverSchema(): Promise<void> {
    if (!this.canDiscoverSchema || this.isFetchingSchema) {
      return;
    }

    this.isFetchingSchema = true;
    this.schemaError = null;

    try {
      const response = await this.etlApi.fetchSourceTablesAndColumns(this.buildConnectionPayload());
      this.sourceTables = [...response.tables].sort((a, b) => a.qualifiedTable.localeCompare(b.qualifiedTable));
      this.autoAssignSourceTables();
      await this.suggestNextConfigGroup();
      this.setStep('table-match');
    } catch (err: any) {
      this.schemaError = err?.message ?? 'Impossible de recuperer les tables et colonnes.';
    } finally {
      this.isFetchingSchema = false;
      this.cdr.markForCheck();
    }
  }

  continueToTiersMapping(): void {
    if (!this.canContinueToMappings) {
      this.schemaError = 'Selectionnez une table source pour Tiers, Contrat et Compta.';
      this.cdr.markForCheck();
      return;
    }

    this.schemaError = null;
    this.setStep('map-tiers');
  }

  onTiersMapped(mappings: Record<string, string>): void {
    this.mappingsByTarget.TIERS = mappings;
    this.setStep('map-contrat');
  }

  onContratMapped(mappings: Record<string, string>): void {
    this.mappingsByTarget.CONTRAT = mappings;
    this.setStep('map-compta');
  }

  onComptaMapped(mappings: Record<string, string>): void {
    this.mappingsByTarget.COMPTA = mappings;
    void this.submitBulkMappings();
  }

  async submitBulkMappings(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.submitError = null;
    this.submitSuccessMessage = null;
    this.isSubmitting = true;
    this.setStep('submitting');

    try {
      const payload = this.buildBulkPayload();

      if (payload.length === 0) {
        throw new Error('Aucun mapping selectionne. Veuillez associer des colonnes avant enregistrement.');
      }

      const response = await this.etlApi.createMappingConfigsBulk(payload);
      this.submittedCount = payload.length;
      const responseMessage = response?.message?.trim();
      this.submitSuccessMessage = responseMessage && responseMessage.length > 0
        ? responseMessage
        : `Configuration ${this.configGroupNumber} enregistree avec ${payload.length} mappings.`;
    } catch (err: any) {
      this.submitError = err?.message ?? 'Echec de creation de la configuration de mapping.';
    } finally {
      this.isSubmitting = false;
      this.setStep('result');
      this.cdr.markForCheck();
    }
  }

  getSourceColumnsForTarget(target: MappingTarget): string[] {
    const selected = this.selectedSourceByTarget[target];
    if (!selected) {
      return [];
    }

    const table = this.sourceTables.find((candidate) => candidate.qualifiedTable === selected);
    if (!table) {
      return [];
    }

    return table.columns.map((column) => column.columnName);
  }

  getColumnCountForTarget(target: MappingTarget): number {
    return this.getSourceColumnsForTarget(target).length;
  }

  getSourceTablePreview(target: MappingTarget): string {
    const selected = this.selectedSourceByTarget[target];
    return selected || 'Aucune table selectionnee';
  }

  getMappingSubtitle(target: MappingTarget): string {
    const sourceTable = this.getSourceTablePreview(target);
    const targetTable = this.targets.find((item) => item.key === target)?.targetTable ?? '';
    return `Table source: ${sourceTable}  ->  Table cible: ${targetTable}`;
  }

  retryFromResult(): void {
    this.submitError = null;
    this.setStep('map-compta');
  }

  resetWizard(): void {
    this.selectedSourceByTarget = {
      TIERS: '',
      CONTRAT: '',
      COMPTA: '',
    };
    this.mappingsByTarget = {
      TIERS: {},
      CONTRAT: {},
      COMPTA: {},
    };
    this.submitError = null;
    this.submitSuccessMessage = null;
    this.submittedCount = 0;
    this.setStep('connect');
  }

  goToList(): void {
    void this.router.navigate(['/mapping/configurations']);
  }

  private buildConnectionPayload(): DbConnectionConfig {
    return {
      host: this.dbConnection.host.trim(),
      port: Number(this.dbConnection.port),
      database: this.dbConnection.database.trim(),
      dbType: this.dbConnection.dbType,
      username: this.dbConnection.username.trim(),
      password: this.dbConnection.password,
      table: this.dbConnection.table.trim(),
      schema: (this.dbConnection.schema ?? '').trim(),
    };
  }

  private autoAssignSourceTables(): void {
    const available = [...this.sourceTables];

    this.targets.forEach((target) => {
      const picked = available.find((table) => {
        const normalized = `${table.schema}.${table.tableName}`.toLowerCase();
        return target.suggestFrom.some((keyword) => normalized.includes(keyword.toLowerCase()));
      });

      if (picked) {
        this.selectedSourceByTarget[target.key] = picked.qualifiedTable;
      }
    });

    this.cdr.markForCheck();
  }

  private async suggestNextConfigGroup(): Promise<void> {
    try {
      const all = await this.etlApi.getAllMappingConfigs();
      const max = all.reduce((acc, row) => Math.max(acc, row.configGroupNumber), 0);
      this.configGroupNumber = max + 1;
    } catch {
      // Keep current value when suggestion endpoint fails.
    }
  }

  private buildBulkPayload(): MappingConfigUpsertRequest[] {
    const payload: MappingConfigUpsertRequest[] = [];

    this.targets.forEach((target) => {
      const sourceTable = this.selectedSourceByTarget[target.key];
      const mappings = this.mappingsByTarget[target.key];

      Object.entries(mappings).forEach(([columnTarget, columnSource]) => {
        payload.push({
          tableSource: sourceTable,
          tableTarget: target.targetTable,
          columnSource,
          columnTarget,
          configGroupNumber: this.configGroupNumber,
        });
      });
    });

    return payload;
  }
}
