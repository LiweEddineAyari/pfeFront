import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  DatamartPipelineResponse,
  DatamartPipelineTableResult,
  DbType,
  EtlApiService,
  MappingConfigRow,
  PipelineLoadFromDbResponse,
  PipelineLoadTableResult,
  QualityListResponse,
  QualityTransformResponse,
  QualityTransformTableResult,
} from '../../core/services/etl-api.service';

type EtlPipelineStep =
  | 'intro'
  | 'connection'
  | 'matching'
  | 'pipeline-loading'
  | 'pipeline-result'
  | 'datamart-loading'
  | 'datamart-result';

interface MappingConfigGroupSummary {
  configGroupNumber: number;
  totalMappings: number;
  sourceTables: string[];
  targetTables: string[];
}

interface MetricEntry {
  key: string;
  label: string;
  value: number;
  downloadable: boolean;
}

@Component({
  selector: 'app-etl-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './etl-pipeline.component.html',
  styleUrls: ['./etl-pipeline.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtlPipelineComponent implements OnDestroy {
  step: EtlPipelineStep = 'intro';

  readonly dbTypeOptions: DbType[] = ['POSTGRES', 'MYSQL', 'SQLSERVER', 'ORACLE'];

  dbConnection = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    dbType: 'POSTGRES' as DbType,
    username: 'postgres',
    password: '',
  };

  dd = '';
  mm = '';
  yyyy = '';

  mappingGroups: MappingConfigGroupSummary[] = [];
  selectedConfigGroupNumber: number | null = null;
  configLoading = false;
  configError: string | null = null;

  isExecutingPipeline = false;
  pipelineLoadingMessage = 'Connexion a la base source...';
  private pipelineLoadingInterval: ReturnType<typeof setInterval> | null = null;
  pipelineLoadResult: PipelineLoadFromDbResponse | null = null;
  qualityTransformResult: QualityTransformResponse | null = null;
  pipelineError: string | null = null;

  isExecutingDatamart = false;
  datamartLoadingMessage = 'Construction du datamart en cours...';
  private datamartLoadingInterval: ReturnType<typeof setInterval> | null = null;
  datamartResult: DatamartPipelineResponse | null = null;
  datamartError: string | null = null;
  private downloadingMetrics = new Set<string>();

  readonly steps = [
    {
      title: 'Connexion base source',
      icon: 'database-backup',
      description:
        'Configurez la connexion PostgreSQL/MySQL/Oracle/SQL Server et renseignez la date de balance.',
      stepLabel: 'Etape 1 sur 4',
    },
    {
      title: 'Selection matching',
      icon: 'layout-grid',
      description:
        'Choisissez un groupe de configuration existant depuis la liste des configurations groupees.',
      stepLabel: 'Etape 2 sur 4',
    },
    {
      title: 'Chargement, qualite et transformation',
      icon: 'shield-check',
      description:
        'Le pipeline charge automatiquement les donnees puis execute quality_transform en sequence complete.',
      stepLabel: 'Etape 3 sur 4',
    },
    {
      title: 'Datamart',
      icon: 'layout-dashboard',
      description:
        'Les dimensions et faits sont alimentes apres validation des controles qualite et des transformations.',
      stepLabel: 'Etape 4 sur 4',
    },
  ];

  constructor(
    private etlApi: EtlApiService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnDestroy(): void {
    this.stopPipelineLoadingMessages();
    this.stopDatamartLoadingMessages();
  }

  get isDbConnectionValid(): boolean {
    const { host, port, database, username, password } = this.dbConnection;
    return !!host.trim()
      && Number.isFinite(Number(port))
      && Number(port) > 0
      && !!database.trim()
      && !!username.trim()
      && !!password;
  }

  get isDateValid(): boolean {
    const d = parseInt(this.dd, 10);
    const m = parseInt(this.mm, 10);
    const y = parseInt(this.yyyy, 10);
    return !isNaN(d)
      && d >= 1
      && d <= 31
      && !isNaN(m)
      && m >= 1
      && m <= 12
      && !isNaN(y)
      && y >= 1900
      && y <= 2100
      && this.yyyy.length === 4;
  }

  get isDdInvalid(): boolean {
    const d = parseInt(this.dd, 10);
    return this.dd.length > 0 && (isNaN(d) || d < 1 || d > 31);
  }

  get isMmInvalid(): boolean {
    const m = parseInt(this.mm, 10);
    return this.mm.length > 0 && (isNaN(m) || m < 1 || m > 12);
  }

  get canContinueToMatching(): boolean {
    return this.isDbConnectionValid && this.isDateValid && !this.isExecutingPipeline;
  }

  get canStartPipeline(): boolean {
    return this.canContinueToMatching && this.selectedConfigGroupNumber !== null && !this.configLoading;
  }

  get pipelineTableEntries(): Array<{ key: string; value: PipelineLoadTableResult }> {
    return Object.entries(this.pipelineLoadResult?.tableResults ?? {}).map(([key, value]) => ({ key, value }));
  }

  get qualityTableEntries(): Array<{ key: string; value: QualityTransformTableResult }> {
    return Object.entries(this.qualityTransformResult?.tables ?? {}).map(([key, value]) => ({ key, value }));
  }

  get datamartTableEntries(): Array<{ key: string; value: DatamartPipelineTableResult }> {
    return Object.entries(this.datamartResult?.tables ?? {}).map(([key, value]) => ({ key, value }));
  }

  get selectedGroupSummary(): MappingConfigGroupSummary | null {
    if (this.selectedConfigGroupNumber === null) {
      return null;
    }

    return this.mappingGroups.find(
      (group) => group.configGroupNumber === this.selectedConfigGroupNumber
    ) ?? null;
  }

  get totalLoadedRows(): number {
    return this.pipelineLoadResult?.rowCount ?? 0;
  }

  setStep(nextStep: EtlPipelineStep): void {
    this.step = nextStep;
    this.cdr.markForCheck();
  }

  getSliderTransform(): string {
    switch (this.step) {
      case 'intro':
        return 'translateX(0%)';
      case 'connection':
        return 'translateX(-14.2857%)';
      case 'matching':
        return 'translateX(-28.5714%)';
      case 'pipeline-loading':
        return 'translateX(-42.8571%)';
      case 'pipeline-result':
        return 'translateX(-57.1428%)';
      case 'datamart-loading':
        return 'translateX(-71.4285%)';
      case 'datamart-result':
        return 'translateX(-85.7142%)';
      default:
        return 'translateX(0%)';
    }
  }

  onDdInput(event: Event, nextField: HTMLInputElement): void {
    const input = event.target as HTMLInputElement;
    this.dd = input.value.replace(/\D/g, '').slice(0, 2);
    input.value = this.dd;

    if (this.dd.length === 2 && !this.isDdInvalid) {
      nextField.focus();
    }
  }

  onMmInput(event: Event, nextField: HTMLInputElement): void {
    const input = event.target as HTMLInputElement;
    this.mm = input.value.replace(/\D/g, '').slice(0, 2);
    input.value = this.mm;

    if (this.mm.length === 2 && !this.isMmInvalid) {
      nextField.focus();
    }
  }

  onYyyyInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.yyyy = input.value.replace(/\D/g, '').slice(0, 4);
    input.value = this.yyyy;
  }

  onBackspace(event: Event, prevField: HTMLInputElement | null): void {
    const input = event.target as HTMLInputElement | null;
    if (input && prevField && input.value.length === 0) {
      prevField.focus();
    }
  }

  async goToMatchingSelection(): Promise<void> {
    if (!this.canContinueToMatching) {
      return;
    }

    await this.loadMappingGroups();
    this.setStep('matching');
  }

  async loadMappingGroups(): Promise<void> {
    this.configLoading = true;
    this.configError = null;

    try {
      const rows = await this.etlApi.getAllMappingConfigs();
      this.mappingGroups = this.buildMappingGroupSummaries(rows);

      if (this.mappingGroups.length === 0) {
        this.selectedConfigGroupNumber = null;
      } else if (
        this.selectedConfigGroupNumber === null
        || !this.mappingGroups.some((g) => g.configGroupNumber === this.selectedConfigGroupNumber)
      ) {
        this.selectedConfigGroupNumber = this.mappingGroups[0].configGroupNumber;
      }
    } catch (err: any) {
      this.configError = err?.message ?? 'Impossible de charger la liste des configurations de mapping.';
      this.mappingGroups = [];
      this.selectedConfigGroupNumber = null;
    } finally {
      this.configLoading = false;
      this.cdr.markForCheck();
    }
  }

  selectConfigGroup(configGroupNumber: number): void {
    this.selectedConfigGroupNumber = configGroupNumber;
  }

  async startPipelineExecution(): Promise<void> {
    if (!this.canStartPipeline || this.selectedConfigGroupNumber === null) {
      return;
    }

    this.pipelineError = null;
    this.pipelineLoadResult = null;
    this.qualityTransformResult = null;
    this.isExecutingPipeline = true;
    this.setStep('pipeline-loading');
    this.startPipelineLoadingMessages();

    try {
      this.pipelineLoadingMessage = 'Chargement depuis la base de donnees...';
      this.pipelineLoadResult = await this.etlApi.loadFromDatabaseByConfigGroup({
        connection: this.buildConnectionPayload(),
        configGroupNumber: this.selectedConfigGroupNumber,
        dateBal: this.getBalanceDate(),
      });

      this.pipelineLoadingMessage = 'Execution automatique de quality_transform...';
      this.qualityTransformResult = await this.etlApi.runQualityTransform();
      this.setStep('pipeline-result');
    } catch (err: any) {
      this.pipelineError = err?.message ?? 'Erreur pendant le chargement et la transformation.';
      this.setStep('pipeline-result');
    } finally {
      this.isExecutingPipeline = false;
      this.stopPipelineLoadingMessages();
      this.cdr.markForCheck();
    }
  }

  async runDatamartPipeline(): Promise<void> {
    this.datamartError = null;
    this.datamartResult = null;
    this.isExecutingDatamart = true;
    this.setStep('datamart-loading');
    this.startDatamartLoadingMessages();

    try {
      this.datamartResult = await this.etlApi.runDatamartPipeline();
      this.setStep('datamart-result');
    } catch (err: any) {
      this.datamartError = err?.message ?? 'Erreur pendant la construction du datamart.';
      this.setStep('datamart-result');
    } finally {
      this.isExecutingDatamart = false;
      this.stopDatamartLoadingMessages();
      this.cdr.markForCheck();
    }
  }

  restartPipelineFlow(): void {
    this.pipelineError = null;
    this.pipelineLoadResult = null;
    this.qualityTransformResult = null;
    this.datamartError = null;
    this.datamartResult = null;
    this.setStep('connection');
  }

  openDatamartPage(): void {
    void this.router.navigate(['/datamart']);
  }

  getMappedCount(tableResult: PipelineLoadTableResult): number {
    return Object.keys(tableResult.mappedColumns ?? {}).length;
  }

  getMetricEntries(tableKey: string, metrics?: Record<string, number>): MetricEntry[] {
    if (!metrics) {
      return [];
    }

    return Object.entries(metrics).map(([key, value]) => ({
      key,
      label: this.getMetricLabel(key),
      value,
      downloadable: this.isQualityMetricDownloadable(tableKey, key),
    }));
  }

  getDatamartMetricEntries(table: DatamartPipelineTableResult): Array<{ label: string; value: number }> {
    return Object.entries(table)
      .filter(([key]) => key !== 'durationMs')
      .map(([key, value]) => ({
        label: this.getMetricLabel(key),
        value,
      }));
  }

  formatDuration(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) {
      return '—';
    }

    if (ms < 1000) {
      return `${ms} ms`;
    }

    return `${(ms / 1000).toFixed(2)} s`;
  }

  trackByGroup(_: number, group: MappingConfigGroupSummary): number {
    return group.configGroupNumber;
  }

  isDownloadInProgress(tableKey: string, metricKey: string): boolean {
    return this.downloadingMetrics.has(this.getMetricDownloadKey(tableKey, metricKey));
  }

  async downloadQualityMetric(tableKey: string, metricKey: string): Promise<void> {
    if (!this.isQualityMetricDownloadable(tableKey, metricKey)) {
      return;
    }

    const downloadKey = this.getMetricDownloadKey(tableKey, metricKey);
    if (this.downloadingMetrics.has(downloadKey)) {
      return;
    }

    this.downloadingMetrics.add(downloadKey);
    this.cdr.markForCheck();

    try {
      const response = await this.fetchQualityList(tableKey, metricKey);
      const rows = response.rows ?? [];
      this.downloadCsv(rows, this.buildDownloadFilename(tableKey, metricKey));
    } catch (err) {
      console.error('Download quality list failed', err);
    } finally {
      this.downloadingMetrics.delete(downloadKey);
      this.cdr.markForCheck();
    }
  }

  private getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      duplicateDeleted: 'Doublons supprimes',
      totalDeleted: 'Total supprime',
      typeCheckDeleted: 'Erreurs type supprimees',
      nullCheckDeleted: 'Nuls supprimes',
      rowsTransformed: 'Lignes transformees',
      totalIssues: 'Total anomalies',
      balanceSum: 'Somme balance',
      duplicateCount: 'Doublons',
      nullCheckCount: 'Valeurs nulles',
      tiersRelationCheck: 'Relations tiers',
      typeCheckCount: 'Erreurs type',
      contratRelationCheck: 'Relations contrat',
      subDimResidenceRows: 'Residence',
      subDimAgentecoRows: 'Agent eco',
      subDimDouteuxRows: 'Douteux',
      subDimGrpaffaireRows: 'Groupe affaire',
      subDimSectionactiviteRows: 'Section activite',
      dimClientRows: 'Dim client',
      subDimAgenceRows: 'Agence',
      subDimDeviseRows: 'Devise',
      subDimObjetfinanceRows: 'Objet finance',
      subDimTypcontratRows: 'Type contrat',
      subDimDateRows: 'Date',
      dimContratRows: 'Dim contrat',
      subDimChapitreRows: 'Chapitre',
      subDimCompteRows: 'Compte',
      factBalanceRows: 'Fact balance',
      durationMs: 'Duree',
    };

    if (labels[metric]) {
      return labels[metric];
    }

    return metric
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/^./, (char) => char.toUpperCase());
  }

  private isQualityMetricDownloadable(tableKey: string, metricKey: string): boolean {
    const normalizedTable = tableKey.toLowerCase();

    if (normalizedTable === 'tiers' || normalizedTable === 'contrat') {
      return metricKey === 'nullCheckDeleted'
        || metricKey === 'duplicateDeleted'
        || metricKey === 'typeCheckDeleted';
    }

    if (normalizedTable === 'compta') {
      return metricKey === 'nullCheckCount'
        || metricKey === 'duplicateCount'
        || metricKey === 'typeCheckCount'
        || metricKey === 'contratRelationCheck'
        || metricKey === 'tiersRelationCheck';
    }

    return false;
  }

  private getMetricDownloadKey(tableKey: string, metricKey: string): string {
    return `${tableKey.toLowerCase()}:${metricKey}`;
  }

  private async fetchQualityList(tableKey: string, metricKey: string): Promise<QualityListResponse> {
    const normalizedTable = tableKey.toLowerCase();

    if (normalizedTable === 'tiers') {
      if (metricKey === 'nullCheckDeleted') {
        return this.etlApi.fetchTiersNullCheckList();
      }
      if (metricKey === 'duplicateDeleted') {
        return this.etlApi.fetchTiersDuplicateList();
      }
      if (metricKey === 'typeCheckDeleted') {
        return this.etlApi.fetchTiersTypeCheckList();
      }
    }

    if (normalizedTable === 'contrat') {
      if (metricKey === 'nullCheckDeleted') {
        return this.etlApi.fetchContratNullCheckList();
      }
      if (metricKey === 'duplicateDeleted') {
        return this.etlApi.fetchContratDuplicateList();
      }
      if (metricKey === 'typeCheckDeleted') {
        return this.etlApi.fetchContratTypeCheckList();
      }
    }

    if (normalizedTable === 'compta') {
      if (metricKey === 'nullCheckCount') {
        return this.etlApi.fetchComptaNullCheckList();
      }
      if (metricKey === 'duplicateCount') {
        return this.etlApi.fetchComptaDuplicateList();
      }
      if (metricKey === 'typeCheckCount') {
        return this.etlApi.fetchComptaTypeCheckList();
      }
      if (metricKey === 'contratRelationCheck') {
        return this.etlApi.fetchComptaContratRelationList();
      }
      if (metricKey === 'tiersRelationCheck') {
        return this.etlApi.fetchComptaTiersRelationList();
      }
    }

    throw new Error(`No endpoint configured for ${normalizedTable}/${metricKey}`);
  }

  private buildDownloadFilename(tableKey: string, metricKey: string): string {
    const datePart = new Date().toISOString().slice(0, 10);
    return `${tableKey.toLowerCase()}-${metricKey}-${datePart}`;
  }

  private downloadCsv(rows: Record<string, any>[], filename: string): void {
    if (!rows.length) {
      this.downloadFile('message\nNo data', filename);
      return;
    }

    const headerSet = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => headerSet.add(key));
    });
    const headers = Array.from(headerSet);

    const headerLine = headers.map((header) => this.escapeCsvCell(header)).join(',');
    const lines = rows.map((row) =>
      headers.map((header) => this.escapeCsvCell(row[header])).join(',')
    );
    const content = [headerLine, ...lines].join('\n');
    this.downloadFile(content, filename);
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${filename}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  private escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const escaped = raw.replace(/"/g, '""');

    if (/[",\n\r]/.test(escaped)) {
      return `"${escaped}"`;
    }

    return escaped;
  }

  private buildMappingGroupSummaries(rows: MappingConfigRow[]): MappingConfigGroupSummary[] {
    const grouped = new Map<number, { count: number; sources: Set<string>; targets: Set<string> }>();

    rows.forEach((row) => {
      const current = grouped.get(row.configGroupNumber) ?? {
        count: 0,
        sources: new Set<string>(),
        targets: new Set<string>(),
      };

      current.count += 1;
      if (row.tableSource?.trim()) {
        current.sources.add(row.tableSource.trim());
      }
      if (row.tableTarget?.trim()) {
        current.targets.add(row.tableTarget.trim());
      }

      grouped.set(row.configGroupNumber, current);
    });

    return Array.from(grouped.entries())
      .map(([configGroupNumber, value]) => ({
        configGroupNumber,
        totalMappings: value.count,
        sourceTables: Array.from(value.sources).sort((a, b) => a.localeCompare(b)),
        targetTables: Array.from(value.targets).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.configGroupNumber - b.configGroupNumber);
  }

  private buildConnectionPayload(): {
    host: string;
    port: number;
    database: string;
    dbType: DbType;
    username: string;
    password: string;
  } {
    return {
      host: this.dbConnection.host.trim(),
      port: Number(this.dbConnection.port),
      database: this.dbConnection.database.trim(),
      dbType: this.dbConnection.dbType,
      username: this.dbConnection.username.trim(),
      password: this.dbConnection.password,
    };
  }

  private getBalanceDate(): string {
    return `${this.dd}/${this.mm}/${this.yyyy}`;
  }

  private startPipelineLoadingMessages(): void {
    this.stopPipelineLoadingMessages();

    const messages = [
      'Connexion a la base source...',
      'Chargement des tables selon la configuration selectionnee...',
      'Initialisation des controles qualite...',
      'Execution des transformations metier...',
      'Finalisation du pipeline...',
    ];

    let idx = 0;
    this.pipelineLoadingMessage = messages[idx];
    this.pipelineLoadingInterval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      this.pipelineLoadingMessage = messages[idx];
      this.cdr.markForCheck();
    }, 2300);
  }

  private stopPipelineLoadingMessages(): void {
    if (this.pipelineLoadingInterval) {
      clearInterval(this.pipelineLoadingInterval);
      this.pipelineLoadingInterval = null;
    }
  }

  private startDatamartLoadingMessages(): void {
    this.stopDatamartLoadingMessages();

    const messages = [
      'Preparation du chargement dimensionnel...',
      'Insertion des sous-dimensions...',
      'Alimentation des dimensions principales...',
      'Alimentation des tables de faits...',
      'Optimisation et finalisation du datamart...',
    ];

    let idx = 0;
    this.datamartLoadingMessage = messages[idx];
    this.datamartLoadingInterval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      this.datamartLoadingMessage = messages[idx];
      this.cdr.markForCheck();
    }, 2300);
  }

  private stopDatamartLoadingMessages(): void {
    if (this.datamartLoadingInterval) {
      clearInterval(this.datamartLoadingInterval);
      this.datamartLoadingInterval = null;
    }
  }
}
