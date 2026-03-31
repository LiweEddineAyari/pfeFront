import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { FieldMappingComponent } from '../../shared/components/field-mapping/field-mapping.component';
import { ColumnExtractorService, ExtractionResult } from '../../core/services/column-extractor.service';
import { exportToExcel } from '../../core/utils/excel-export.util';
import { DatamartComptaResult, DatamartContratResult, DatamartTiersResult, DbColumnMetadata, DbConnectionConfig, DbType, EtlApiService, ProcessResult, QualityTiersResult, QualityContratResult, QualityComptaResult, QualityListResponse, TransformResult } from '../../core/services/etl-api.service';

@Component({
  selector: 'app-etl-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FieldMappingComponent],
  templateUrl: './etl-pipeline.component.html',
  styleUrls: ['./etl-pipeline.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtlPipelineComponent {
  @ViewChild(FieldMappingComponent) fieldMappingComponent!: FieldMappingComponent;

  step: 'intro' | 'form' | 'mapping' | 'loading' | 'result' | 'quality-loading' | 'quality-result' | 'transform-loading' | 'transform-result' | 'datamart-loading' | 'datamart-result' = 'intro';
  
  isDragging = false;
  sourceMode: 'file' | 'database' = 'file';
  selectedFile: File | null = null;
  fileType: 'SQL' | 'TIERS' | 'CONTRAT' | 'COMPTA' = 'TIERS';
  dbTypeOptions: DbType[] = ['POSTGRES', 'MYSQL', 'SQLSERVER', 'ORACLE'];
  dbConnection: DbConnectionConfig = {
    host: '',
    port: 5432,
    database: '',
    dbType: 'POSTGRES',
    username: '',
    password: '',
    table: ''
  };
  
  extractionResult: ExtractionResult | null = null;
  isExtracting = false;
  extractionError: ExtractionResult | null = null;

  // Upload state
  uploadResult: ProcessResult | null = null;
  uploadError: string | null = null;
  isUploading = false;
  private uploadRequestSeq = 0;

  // Quality state
  qualityTiersResult: QualityTiersResult | null = null;
  qualityContratResult: QualityContratResult | null = null;
  qualityComptaResult: QualityComptaResult | null = null;
  qualityError: string | null = null;
  qualityLoading = false;
  qualityLoadingMessage = '';
  downloadingFields = new Set<string>();

  // Transform state
  transformResult: TransformResult | null = null;
  transformError: string | null = null;
  transformLoadingMessage = '';

  // Datamart state
  datamartTiersResult: DatamartTiersResult | null = null;
  datamartContratResult: DatamartContratResult | null = null;
  datamartComptaResult: DatamartComptaResult | null = null;
  datamartError: string | null = null;
  datamartLoadingMessage = '';

  get canContinueToMapping(): boolean {
    if (this.isExtracting) return false;
    if (this.sourceMode === 'file' && !this.selectedFile) return false;
    if (this.sourceMode === 'database' && !this.isDbConnectionValid) return false;
    if (this.fileType === 'COMPTA' && !this.isDateValid) return false;
    return true;
  }

  get isDatabaseMode(): boolean {
    return this.sourceMode === 'database';
  }

  get isDbConnectionValid(): boolean {
    const { host, port, database, username, password, table } = this.dbConnection;
    return !!host.trim()
      && Number.isFinite(port)
      && port > 0
      && !!database.trim()
      && !!username.trim()
      && !!password
      && !!table.trim();
  }

  get loadingSourceBadge(): string {
    return this.sourceMode === 'database' ? this.mappingFileType : this.fileType;
  }

  get loadingSourceLabel(): string {
    if (this.sourceMode === 'database') {
      return this.dbConnection.table || `${this.dbConnection.host}:${this.dbConnection.port}`;
    }
    return this.selectedFile?.name || 'Fichier';
  }

  get loadingTitle(): string {
    return this.sourceMode === 'database'
      ? 'Chargement des donnees depuis la base'
      : 'Traitement de votre fichier';
  }

  get uploadSuccessTitle(): string {
    return this.sourceMode === 'database' ? 'Chargement termine !' : 'Televersement termine !';
  }

  loadingMessages = ['Veuillez patienter...', 'Lecture de votre fichier...', 'Chargement des lignes...', 'Mappage des colonnes...', 'Traitement des donnees...', 'Cela peut prendre un instant...'];
  dbLoadingMessages = ['Connexion a la base de donnees...', 'Lecture des colonnes source...', 'Preparation du chargement en staging...', 'Application du mapping...', 'Traitement des donnees...', 'Cela peut prendre un instant...'];
  currentLoadingMessage = this.loadingMessages[0];
  msgInterval: any;

  qualityMessages = ['Execution des controles de valeurs nulles...', 'Detection des doublons...', 'Validation des types de donnees...', 'Verification de l\'integrite referentielle...', 'Nettoyage des tables de staging...', 'Presque termine, veuillez patienter...'];
  qualityMsgInterval: any;

  transformMessages = [
    'Application des regles metier...',
    'Normalisation des champs de donnees...',
    'Enrichissement des enregistrements de staging...',
    'Execution des transformations...',
    'Presque termine, veuillez patienter...'
  ];
  transformMsgInterval: any;

  datamartMessages = [
    'Chargement des tables de dimension...',
    'Alimentation des tables de faits...',
    'Construction de la structure du datamart...',
    'Liaison des dimensions...',
    'Presque termine, veuillez patienter...'
  ];
  datamartMsgInterval: any;

  startLoadingMessages() {
    const messages = this.sourceMode === 'database' ? this.dbLoadingMessages : this.loadingMessages;
    this.currentLoadingMessage = messages[0];
    let msgIndex = 0;
    this.msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      this.currentLoadingMessage = messages[msgIndex];
      this.cdr.markForCheck();
    }, 5000);
  }

  stopLoadingMessages() {
    if (this.msgInterval) {
      clearInterval(this.msgInterval);
      this.msgInterval = null;
    }
  }

  startQualityMessages() {
    this.qualityLoadingMessage = this.qualityMessages[0];
    let msgIndex = 0;
    this.qualityMsgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % this.qualityMessages.length;
      this.qualityLoadingMessage = this.qualityMessages[msgIndex];
      this.cdr.markForCheck();
    }, 5000);
  }

  stopQualityMessages() {
    if (this.qualityMsgInterval) {
      clearInterval(this.qualityMsgInterval);
      this.qualityMsgInterval = null;
    }
  }

  startTransformMessages() {
    this.transformLoadingMessage = this.transformMessages[0];
    let msgIndex = 0;
    this.transformMsgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % this.transformMessages.length;
      this.transformLoadingMessage = this.transformMessages[msgIndex];
      this.cdr.markForCheck();
    }, 5000);
  }

  stopTransformMessages() {
    if (this.transformMsgInterval) {
      clearInterval(this.transformMsgInterval);
      this.transformMsgInterval = null;
    }
  }

  startDatamartMessages() {
    this.datamartLoadingMessage = this.datamartMessages[0];
    let msgIndex = 0;
    this.datamartMsgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % this.datamartMessages.length;
      this.datamartLoadingMessage = this.datamartMessages[msgIndex];
      this.cdr.markForCheck();
    }, 5000);
  }

  stopDatamartMessages() {
    if (this.datamartMsgInterval) {
      clearInterval(this.datamartMsgInterval);
      this.datamartMsgInterval = null;
    }
  }

  async runQuality(): Promise<void> {
    this.qualityTiersResult   = null;
    this.qualityContratResult = null;
    this.qualityComptaResult  = null;
    this.qualityError         = null;
    this.qualityLoading       = true;
    this.setStep('quality-loading');

    this.startQualityMessages();

    try {
      const type = this.mappingFileType;

      if (type === 'TIERS') {
        this.qualityTiersResult = await this.etlApi.qualityTiers();
      } else if (type === 'CONTRAT') {
        this.qualityContratResult = await this.etlApi.qualityContrat();
      } else if (type === 'COMPTA') {
        this.qualityComptaResult = await this.etlApi.qualityCompta();
      }

      this.setStep('quality-result');
    } catch (err: any) {
      this.qualityError = err.message ?? 'Echec du controle qualite';
      this.setStep('quality-result');
    } finally {
      this.stopQualityMessages();
      this.qualityLoading = false;
      this.cdr.markForCheck();
    }
  }

  async runTransform(): Promise<void> {
    this.transformResult = null;
    this.transformError = null;
    this.setStep('transform-loading');
    this.startTransformMessages();

    try {
      const type = this.mappingFileType;

      if (type === 'TIERS') {
        this.transformResult = await this.etlApi.transformTiers();
      } else if (type === 'CONTRAT') {
        this.transformResult = await this.etlApi.transformContrat();
      }

      this.setStep('transform-result');
    } catch (err: any) {
      this.transformError = err.message ?? 'Echec de la transformation';
      this.setStep('transform-result');
    } finally {
      this.stopTransformMessages();
      this.cdr.markForCheck();
    }
  }

  async runDatamart(): Promise<void> {
    this.datamartTiersResult = null;
    this.datamartContratResult = null;
    this.datamartComptaResult = null;
    this.datamartError = null;
    this.setStep('datamart-loading');
    this.startDatamartMessages();

    try {
      const type = this.mappingFileType;

      if (type === 'TIERS') {
        this.datamartTiersResult = await this.etlApi.datamartTiers();
      } else if (type === 'CONTRAT') {
        this.datamartContratResult = await this.etlApi.datamartContrat();
      } else if (type === 'COMPTA') {
        this.datamartComptaResult = await this.etlApi.datamartCompta();
      }

      this.setStep('datamart-result');
    } catch (err: any) {
      this.datamartError = err.message ?? 'Echec du chargement du datamart';
      this.setStep('datamart-result');
    } finally {
      this.stopDatamartMessages();
      this.cdr.markForCheck();
    }
  }

  downloadComptaReport(): void {
    if (!this.qualityComptaResult) return;
    const r = this.qualityComptaResult;
    const rows = [
      ['Controle', 'Nombre'],
      ['Problemes de valeurs nulles', r.nullCheckCount],
      ['Problemes de doublons', r.duplicateCount],
      ['Problemes de type', r.typeCheckCount],
      ['Problemes de relation contrat', r.contratRelationCheck],
      ['Problemes de relation tiers', r.tiersRelationCheck],
      ['Somme balance', r.balanceSum],
      ['Total des problemes', r.totalIssues],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compta-quality-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async downloadComptaField(field: keyof QualityComptaResult): Promise<void> {
    if (this.downloadingFields.has(field as string)) return;
    this.downloadingFields.add(field as string);
    this.cdr.markForCheck();

    const fieldToEndpoint: Partial<Record<keyof QualityComptaResult, {
      fetch: () => Promise<QualityListResponse>;
      filename: string;
    }>> = {
      nullCheckCount: {
        fetch: () => this.etlApi.fetchComptaNullCheckList(),
        filename: 'compta-null-issues'
      },
      duplicateCount: {
        fetch: () => this.etlApi.fetchComptaDuplicateList(),
        filename: 'compta-duplicate-issues'
      },
      typeCheckCount: {
        fetch: () => this.etlApi.fetchComptaTypeCheckList(),
        filename: 'compta-type-issues'
      },
      contratRelationCheck: {
        fetch: () => this.etlApi.fetchComptaContratRelationList(),
        filename: 'compta-contrat-relations'
      },
      tiersRelationCheck: {
        fetch: () => this.etlApi.fetchComptaTiersRelationList(),
        filename: 'compta-tiers-relations'
      }
    };

    const config = fieldToEndpoint[field];
    if (!config) {
      this.downloadingFields.delete(field as string);
      this.cdr.markForCheck();
      return;
    }

    try {
      const result = await config.fetch();

      if (!result.rows || result.rows.length === 0) {
        console.warn('Aucune ligne retournee pour', field);
        return;
      }

      exportToExcel(result.rows, config.filename);
    } catch (err: any) {
      console.error('Echec du telechargement pour', field, err);
    } finally {
      this.downloadingFields.delete(field as string);
      this.cdr.markForCheck();
    }
  }

  get mappingFileType(): 'TIERS' | 'CONTRAT' | 'COMPTA' {
    return this.fileType === 'SQL' ? 'TIERS' : this.fileType;
  }
  
  fileColumns: string[] = [];
  
  dd = '';
  mm = '';
  yyyy = '';

  get isDateValid(): boolean {
    const d = parseInt(this.dd, 10);
    const m = parseInt(this.mm, 10);
    const y = parseInt(this.yyyy, 10);
    return !isNaN(d) && d >= 1 && d <= 31 && !isNaN(m) && m >= 1 && m <= 12 && !isNaN(y) && y >= 1900 && y <= 2100 && this.yyyy.length === 4;
  }

  get isDdInvalid(): boolean {
    const d = parseInt(this.dd, 10);
    return this.dd.length > 0 && (isNaN(d) || d < 1 || d > 31);
  }

  get isMmInvalid(): boolean {
    const m = parseInt(this.mm, 10);
    return this.mm.length > 0 && (isNaN(m) || m < 1 || m > 12);
  }

  onDdInput(event: Event, nextField: HTMLInputElement) {
    const input = event.target as HTMLInputElement;
    this.dd = input.value.replace(/\D/g, '').slice(0, 2);
    input.value = this.dd;
    if (this.dd.length === 2 && !this.isDdInvalid) {
      nextField.focus();
    }
  }

  onMmInput(event: Event, nextField: HTMLInputElement) {
    const input = event.target as HTMLInputElement;
    this.mm = input.value.replace(/\D/g, '').slice(0, 2);
    input.value = this.mm;
    if (this.mm.length === 2 && !this.isMmInvalid) {
      nextField.focus();
    }
  }

  onYyyyInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.yyyy = input.value.replace(/\D/g, '').slice(0, 4);
    input.value = this.yyyy;
  }

  onBackspace(event: any, prevField: HTMLInputElement | null) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && input.value.length === 0 && prevField) {
       prevField.focus();
    }
  }

  collectionName = '';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  steps = [
    {
      key:         'upload',
      title:       'Televersement et mapping',
      icon:        'file-up',          // lucide
      description: 'Televersez votre fichier source (Excel, JSON ou SQL), selectionnez le type de donnees et mappez les colonnes du fichier vers les champs cibles de la base.',
      stepLabel:   'Etape 1 sur 4'
    },
    {
      key:         'staging',
      title:       'Chargement vers le staging',
      icon:        'database-backup',  // lucide
      description: 'Les donnees validees et mappees sont extraites puis chargees dans les tables de staging brutes (stg_tiers_raw, stg_contrat_raw, stg_compta_raw).',
      stepLabel:   'Etape 2 sur 4'
    },
    {
      key:         'quality',
      title:       'Qualite et transformation',
      icon:        'shield-check',     // lucide
      description: 'Les controles de valeurs nulles, la suppression des doublons, la validation des types, les verifications d\'integrite referentielle et les transformations des regles metier sont executes sur les donnees de staging.',
      stepLabel:   'Etape 3 sur 4'
    },
    {
      key:         'datamart',
      title:       'Datamart',
      icon:        'layout-dashboard', // lucide
      description: 'Les donnees nettoyees et transformees sont chargees dans les tables de dimension et de faits : dim_client, dim_contrat, fact_balance et toutes les sous-dimensions.',
      stepLabel:   'Etape 4 sur 4'
    }
  ];

  constructor(
    private cdr: ChangeDetectorRef,
    private columnExtractor: ColumnExtractorService,
    private etlApi: EtlApiService
  ) {}

  setStep(newStep: 'intro' | 'form' | 'mapping' | 'loading' | 'result' | 'quality-loading' | 'quality-result' | 'transform-loading' | 'transform-result' | 'datamart-loading' | 'datamart-result') {
    if (newStep === 'mapping' && this.fieldMappingComponent) {
      this.fieldMappingComponent.resetMappings();
    }
    this.step = newStep;
  }

  onSourceModeChange(mode: 'file' | 'database'): void {
    if (this.sourceMode === mode) return;

    this.sourceMode = mode;
    this.isDragging = false;
    this.clearError();
    this.extractionResult = null;
    this.fileColumns = [];

    if (mode === 'database') {
      this.selectedFile = null;
      if (this.fileType === 'SQL') {
        this.fileType = 'TIERS';
      }
    }

    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }

    this.cdr.markForCheck();
  }

  onDbConnectionFieldChange(): void {
    this.clearError();
    this.extractionResult = null;
    this.fileColumns = [];
    this.cdr.markForCheck();
  }

  private buildDbConnectionPayload(): DbConnectionConfig {
    return {
      host: this.dbConnection.host.trim(),
      port: Number(this.dbConnection.port),
      database: this.dbConnection.database.trim(),
      dbType: this.dbConnection.dbType,
      username: this.dbConnection.username.trim(),
      password: this.dbConnection.password,
      table: this.dbConnection.table.trim()
    };
  }

  private normalizeDbColumns(columns: DbColumnMetadata[]): string[] {
    return Array.from(new Set(columns
      .map(col => col.columnName?.trim())
      .filter((name): name is string => !!name)));
  }

  async onContinueToMapping() {
    if (!this.canContinueToMapping) return;
    this.isExtracting = true;
    this.extractionError = null;
    this.extractionResult = null;
    this.cdr.markForCheck();

    try {
      if (this.sourceMode === 'database') {
        const dbColumns = await this.etlApi.fetchColumnsFromDb(this.buildDbConnectionPayload());
        const columnNames = this.normalizeDbColumns(dbColumns);

        if (columnNames.length === 0) {
          this.extractionError = {
            status: 'no-columns',
            columns: [],
            fileType: 'unknown',
            errorMessage: 'Aucune colonne detectee pour la table renseignee.'
          };
          return;
        }

        this.fileColumns = columnNames;
        this.extractionResult = {
          status: 'success',
          columns: columnNames,
          fileType: 'unknown',
          rowCount: undefined
        };
        this.setStep('mapping');
      } else {
        if (!this.selectedFile) return;
        const result = await this.columnExtractor.extract(this.selectedFile);

        if (result.status === 'success') {
          this.fileColumns = result.columns;
          this.extractionResult = result;
          this.setStep('mapping');
        } else {
          this.extractionError = result;
        }
      }
    } catch (err: any) {
      this.extractionError = {
        status: 'parse-error',
        columns: [],
        fileType: 'unknown',
        errorMessage: err?.message ?? 'Impossible de recuperer les colonnes de la source.'
      };
    } finally {
      this.isExtracting = false;
      this.cdr.markForCheck();
    }
  }

  getErrorTitle(status: string): string {
    if (this.sourceMode === 'database') {
      switch (status) {
        case 'no-columns': return 'Aucune colonne detectee';
        case 'parse-error': return 'Connexion impossible';
        default: return 'Erreur de connexion';
      }
    }

    switch (status) {
      case 'empty': return 'Fichier vide';
      case 'no-columns': return 'Aucune colonne detectee';
      case 'parse-error': return 'Le fichier n\'a pas pu etre lu';
      case 'unsupported': return 'Format de fichier non pris en charge';
      case 'too-large': return 'Fichier trop volumineux';
      default: return 'Erreur d\'extraction';
    }
  }

  getErrorHint(status: string): string {
    if (this.sourceMode === 'database') {
      switch (status) {
        case 'no-columns': return 'Verifiez le schema/nom de table et les permissions de lecture de cet utilisateur.';
        case 'parse-error': return 'Verifiez host, port, identifiants, type de base et acces reseau, puis reessayez.';
        default: return 'Veuillez verifier les parametres de connexion puis reessayer.';
      }
    }

    switch (status) {
      case 'empty': return 'Essayez de televerser un fichier contenant des lignes de donnees.';
      case 'no-columns': return 'Assurez-vous que la ligne 1 contient les en-tetes de colonnes (Excel) ou que votre JSON contient des objets avec des cles.';
      case 'parse-error': return 'Le fichier est peut-etre corrompu. Essayez de le re-exporter.';
      case 'unsupported': return 'Utilisez uniquement des fichiers .xlsx, .xls, .json ou .sql.';
      case 'too-large': return 'Decoupez le fichier en parties plus petites de moins de 50 Mo.';
      default: return 'Veuillez verifier le fichier puis reessayer.';
    }
  }

  clearError() {
    this.extractionError = null;
  }

  get columnCountWarning(): string | null {
    if (!this.extractionResult?.columns) return null;
    
    const SCHEMAS = {
      TIERS: { target: ['idtiers','nomprenom','raisonsoc','residence','agenteco','sectionactivite','chiffreaffaires','nationalite','douteux','datdouteux','grpaffaires','nomgrpaffaires'] },
      CONTRAT: { target: ['idcontrat','agence','devise','ancienneteimpaye','objetfinance','typcontrat','datouv','datech','idtiers','tauxcontrat','actif'] },
      COMPTA: { target: ['agence','devise','compte','chapitre','libellecompte','idtiers','soldeorigine','soldeconvertie','devisebbnq','cumulmvtdb','cumulmvtcr','soldeinitdebmois','idcontrat','amount','actif'] }
    };
    
    // SQL defaults to mapping to TIERS usually, so fallback mapped to mappingFileType
    const schemaKey = this.mappingFileType;
    if (!SCHEMAS[schemaKey]) return null;
    
    const expected = SCHEMAS[schemaKey].target.length;
    const got = this.extractionResult.columns.length;
    const diff = Math.abs(expected - got);
    
    if (diff > 3) {
      const sourceLabel = this.sourceMode === 'database' ? 'La table source' : 'Votre fichier';
      return `${sourceLabel} contient ${got} colonnes, mais le schema ${this.mappingFileType} en attend ${expected}. Certains champs peuvent rester non mappes.`;
    }
    return null;
  }

  private toDbLoadMapping(mappings: Record<string, string>): Record<string, string> | null {
    if (Object.keys(mappings).length === 0) return null;

    return Object.entries(mappings).reduce<Record<string, string>>((acc, [target, source]) => {
      acc[target.toUpperCase()] = source;
      return acc;
    }, {});
  }

  async onMappingComplete(mappings: Record<string, string>) {
    if (this.isUploading) return;
    if (this.sourceMode === 'file' && !this.selectedFile) return;

    const requestSeq = ++this.uploadRequestSeq;
    this.isUploading = true;

    // Set loading state
    this.setStep('loading');
    this.uploadError = null;
    this.uploadResult = null;
    this.startLoadingMessages();
    this.cdr.markForCheck();

    try {
      // Build dateBal only for COMPTA with valid date
      const dateBal = (this.fileType === 'COMPTA' && this.isDateValid)
        ? `${this.dd}/${this.mm}/${this.yyyy}`
        : undefined;

      // Determine mappings to pass (null means auto-match)
      const hasMappings = Object.keys(mappings).length > 0;

      const result = this.sourceMode === 'database'
        ? await this.etlApi.loadFromDatabase({
            connection: this.buildDbConnectionPayload(),
            type: this.mappingFileType,
            mapping: hasMappings ? this.toDbLoadMapping(mappings) : null,
            dateBal
          })
        : await this.etlApi.processFile({
            file: this.selectedFile!,
            type: this.fileType,
            mappings: hasMappings ? mappings : null,
            dateBal
          });

      if (requestSeq !== this.uploadRequestSeq) return;

      this.uploadResult = result;
      console.log('Resultat du televersement :', result);
      this.stopLoadingMessages();
      this.setStep('result');
      this.cdr.detectChanges();

    } catch (err: any) {
      if (requestSeq !== this.uploadRequestSeq) return;
      this.uploadError = err.message || 'Une erreur inconnue est survenue';
      this.stopLoadingMessages();
      this.setStep('result');
      this.cdr.detectChanges();
    } finally {
      if (requestSeq === this.uploadRequestSeq) {
        this.stopLoadingMessages();
        // Hard fail-safe: never leave UI stuck in loading after upload settles.
        if (this.step === 'loading' && (this.uploadResult || this.uploadError)) {
          this.setStep('result');
        }
        this.isUploading = false;
        this.cdr.markForCheck();
      }
    }
  }

  onMappingBack() {
    this.setStep('form');
  }

  onDragOver(event: DragEvent) {
    if (this.sourceMode !== 'file') return;
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    if (this.sourceMode !== 'file') return;
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    if (this.sourceMode !== 'file') return;
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  triggerFileInput() {
    if (this.sourceMode !== 'file') return;
    this.fileInput.nativeElement.click();
  }

  onFileChange(event: Event) {
    if (this.sourceMode !== 'file') return;
    const target = event.target as HTMLInputElement;
    if (target.files?.length) {
      this.handleFile(target.files[0]);
    }
  }

  handleFile(file: File) {
    this.sourceMode = 'file';
    this.selectedFile = file;
    this.extractionError = null;
    this.extractionResult = null;
    this.fileColumns = [];
    
    const name = file.name.toLowerCase();
    
    if (name.endsWith('.sql')) {
      this.fileType = 'SQL';
    } else {
      if (this.fileType === 'SQL') {
        this.fileType = 'TIERS';
      }
    }
    this.cdr.markForCheck();
  }


  isSqlFile(): boolean {
    if (this.sourceMode !== 'file') return false;
    return this.selectedFile?.name?.toLowerCase().endsWith('.sql') ?? false;
  }

  // ── Slider Transform ───────────────────────────────────

  getSliderTransform(): string {
    switch (this.step) {
      case 'intro':             return 'translateX(0%)';
      case 'form':              return 'translateX(-9.0909%)';
      case 'mapping':           return 'translateX(-18.1818%)';
      case 'loading':           return 'translateX(-27.2727%)';
      case 'result':            return 'translateX(-36.3636%)';
      case 'quality-loading':   return 'translateX(-45.4545%)';
      case 'quality-result':    return 'translateX(-54.5454%)';
      case 'transform-loading': return 'translateX(-63.6363%)';
      case 'transform-result':  return 'translateX(-72.7272%)';
      case 'datamart-loading':  return 'translateX(-81.8181%)';
      case 'datamart-result':   return 'translateX(-90.9090%)';
      default:                  return 'translateX(0%)';
    }
  }

  // ── Result Panel Helpers ───────────────────────────────

  getMappingEntries(): { fileCol: string; dbCol: string }[] {
    if (!this.uploadResult?.mappedColumns) return [];
    return Object.entries(this.uploadResult.mappedColumns)
      .filter(([key]) => key !== 'id')
      .map(([dbCol, fileCol]) => ({ fileCol, dbCol }));
  }

  getMappedCount(): number {
    return this.getMappingEntries().filter(e => e.fileCol !== e.dbCol).length;
  }

  getTotalMappedKeys(): number {
    return this.getMappingEntries().length;
  }

  formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  }

  getErrorDisplayMessage(err: string): string {
    if (err.toLowerCase().includes('timed out')) {
      return 'Le televersement a expire. Le fichier est peut-etre trop volumineux - essayez de le decouper en parties plus petites.';
    }
    if (err.toLowerCase().includes('failed to fetch')) {
      return 'Impossible de joindre le serveur. Verifiez votre connexion puis reessayez.';
    }
    if (err.includes('500')) {
      return 'Une erreur interne du serveur est survenue. Veuillez reessayer ou contacter le support.';
    }
    return err;
  }

  resetPipeline(): void {
    this.sourceMode = 'file';
    this.selectedFile = null;
    this.dbConnection = {
      host: '',
      port: 5432,
      database: '',
      dbType: 'POSTGRES',
      username: '',
      password: '',
      table: ''
    };
    this.fileColumns = [];
    this.extractionResult = null;
    this.extractionError = null;
    this.uploadResult = null;
    this.uploadError = null;
    this.isUploading = false;
    this.qualityTiersResult = null;
    this.qualityContratResult = null;
    this.qualityComptaResult = null;
    this.qualityError = null;
    this.transformResult = null;
    this.transformError = null;
    this.datamartTiersResult = null;
    this.datamartContratResult = null;
    this.datamartComptaResult = null;
    this.datamartError = null;
    this.downloadingFields.clear();
    this.stopLoadingMessages();
    this.stopQualityMessages();
    this.stopTransformMessages();
    this.stopDatamartMessages();
    this.dd = '';
    this.mm = '';
    this.yyyy = '';
    this.setStep('form');
    this.cdr.markForCheck();
  }

  retryUpload(): void {
    this.uploadError = null;
    this.uploadResult = null;
    this.isUploading = false;
    this.stopLoadingMessages();
    this.setStep('mapping');
    this.cdr.markForCheck();
  }
}
