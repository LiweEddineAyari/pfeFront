import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { FieldMappingComponent } from '../../shared/components/field-mapping/field-mapping.component';
import { ColumnExtractorService, ExtractionResult } from '../../core/services/column-extractor.service';
import { EtlApiService, ProcessResult, QualityTiersResult, QualityContratResult, QualityComptaResult, TransformResult } from '../../core/services/etl-api.service';

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

  step: 'intro' | 'form' | 'mapping' | 'loading' | 'result' | 'quality-loading' | 'quality-result' | 'transform-loading' | 'transform-result' = 'intro';
  
  isDragging = false;
  selectedFile: File | null = null;
  fileType: 'SQL' | 'TIERS' | 'CONTRAT' | 'COMPTA' = 'TIERS';
  
  extractionResult: ExtractionResult | null = null;
  isExtracting = false;
  extractionError: ExtractionResult | null = null;

  // Upload state
  uploadResult: ProcessResult | null = null;
  uploadError: string | null = null;

  // Quality state
  qualityTiersResult: QualityTiersResult | null = null;
  qualityContratResult: QualityContratResult | null = null;
  qualityComptaResult: QualityComptaResult | null = null;
  qualityError: string | null = null;
  qualityLoading = false;
  qualityLoadingMessage = '';

  // Transform state
  transformResult: TransformResult | null = null;
  transformError: string | null = null;
  transformLoadingMessage = '';

  get canContinueToMapping(): boolean {
    if (!this.selectedFile || this.isExtracting) return false;
    if (!this.isSqlFile() && this.fileType === 'COMPTA' && !this.isDateValid) return false;
    return true;
  }

  loadingMessages = ['Please wait...', 'Reading your file...', 'Loading rows...', 'Mapping columns...', 'Processing data...', 'This may take a moment...'];
  currentLoadingMessage = this.loadingMessages[0];
  msgInterval: any;

  qualityMessages = ['Running null checks...', 'Detecting duplicates...', 'Validating data types...', 'Checking referential integrity...', 'Cleaning staging tables...', 'Almost done, please wait...'];
  qualityMsgInterval: any;

  transformMessages = [
    'Applying business rules...',
    'Normalizing data fields...',
    'Enriching staging records...',
    'Running transformations...',
    'Almost done, please wait...'
  ];
  transformMsgInterval: any;

  startLoadingMessages() {
    this.currentLoadingMessage = this.loadingMessages[0];
    let msgIndex = 0;
    this.msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % this.loadingMessages.length;
      this.currentLoadingMessage = this.loadingMessages[msgIndex];
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
      this.qualityError = err.message ?? 'Quality check failed';
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
      this.transformError = err.message ?? 'Transform failed';
      this.setStep('transform-result');
    } finally {
      this.stopTransformMessages();
      this.cdr.markForCheck();
    }
  }

  downloadComptaReport(): void {
    if (!this.qualityComptaResult) return;
    const r = this.qualityComptaResult;
    const rows = [
      ['Check', 'Count'],
      ['Null issues', r.nullCheckCount],
      ['Duplicate issues', r.duplicateCount],
      ['Type issues', r.typeCheckCount],
      ['Contrat relation issues', r.contratRelationCheck],
      ['Tiers relation issues', r.tiersRelationCheck],
      ['Balance sum', r.balanceSum],
      ['Total issues', r.totalIssues],
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

  downloadComptaField(field: keyof QualityComptaResult): void {
    if (!this.qualityComptaResult) return;
    
    // In a real app this would call an API, but for now we just dump a quick stub CSV
    const val = this.qualityComptaResult[field];
    
    const labelMap: Record<string, string> = {
      nullCheckCount: 'null-issues',
      duplicateCount: 'duplicate-issues',
      typeCheckCount: 'type-issues',
      contratRelationCheck: 'contrat-relations',
      tiersRelationCheck: 'tiers-relations',
    };

    const fileNameFragment = labelMap[field as string] || String(field).toLowerCase();
    const csv = `Entity,Issue Type,Count\nCOMPTA,` + fileNameFragment + `,${val}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compta-${fileNameFragment}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      title:       'Upload & Mapping',
      icon:        'file-up',          // lucide
      description: 'Upload your source file (Excel, JSON or SQL), select the data type and map your file columns to the database target fields.',
      stepLabel:   'Step 1 of 4'
    },
    {
      key:         'staging',
      title:       'Load to Staging',
      icon:        'database-backup',  // lucide
      description: 'Validated and mapped data is extracted and loaded into the raw staging tables (stg_tiers_raw, stg_contrat_raw, stg_compta_raw).',
      stepLabel:   'Step 2 of 4'
    },
    {
      key:         'quality',
      title:       'Quality & Transform',
      icon:        'shield-check',     // lucide
      description: 'Null checks, duplicate removal, type validation, referential integrity checks and business rule transformations run on staging data.',
      stepLabel:   'Step 3 of 4'
    },
    {
      key:         'datamart',
      title:       'Datamart',
      icon:        'layout-dashboard', // lucide
      description: 'Cleaned, transformed data is loaded into dimension and fact tables: dim_client, dim_contrat, fact_balance and all sub-dims.',
      stepLabel:   'Step 4 of 4'
    }
  ];

  constructor(
    private cdr: ChangeDetectorRef,
    private columnExtractor: ColumnExtractorService,
    private etlApi: EtlApiService
  ) {}

  setStep(newStep: 'intro' | 'form' | 'mapping' | 'loading' | 'result' | 'quality-loading' | 'quality-result' | 'transform-loading' | 'transform-result') {
    if (newStep === 'mapping' && this.fieldMappingComponent) {
      this.fieldMappingComponent.resetMappings();
    }
    this.step = newStep;
  }

  async onContinueToMapping() {
    if (!this.canContinueToMapping || !this.selectedFile) return;
    this.isExtracting = true;
    this.extractionError = null;
    this.cdr.markForCheck();

    try {
      const result = await this.columnExtractor.extract(this.selectedFile);
      
      if (result.status === 'success') {
        this.fileColumns = result.columns;
        this.extractionResult = result;
        this.setStep('mapping');
      } else {
        this.extractionError = result;
      }
    } finally {
      this.isExtracting = false;
      this.cdr.markForCheck();
    }
  }

  getErrorTitle(status: string): string {
    switch (status) {
      case 'empty': return 'Empty file';
      case 'no-columns': return 'No columns detected';
      case 'parse-error': return 'File could not be read';
      case 'unsupported': return 'Unsupported file format';
      case 'too-large': return 'File too large';
      default: return 'Extraction Error';
    }
  }

  getErrorHint(status: string): string {
    switch (status) {
      case 'empty': return 'Try uploading a file with data rows.';
      case 'no-columns': return 'Make sure row 1 contains column headers (Excel) or your JSON contains objects with keys.';
      case 'parse-error': return 'The file may be corrupted. Try re-exporting it.';
      case 'unsupported': return 'Use .xlsx, .xls, .json or .sql files only.';
      case 'too-large': return 'Split the file into smaller chunks under 50MB.';
      default: return 'Please review the file and try again.';
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
      COMPTA: { target: ['agence','devise','compte','chapitre','libellecompte','idtiers','solde'] }
    };
    
    // SQL defaults to mapping to TIERS usually, so fallback mapped to mappingFileType
    const schemaKey = this.mappingFileType;
    if (!SCHEMAS[schemaKey]) return null;
    
    const expected = SCHEMAS[schemaKey].target.length;
    const got = this.extractionResult.columns.length;
    const diff = Math.abs(expected - got);
    
    if (diff > 3) {
      return `Your file has ${got} columns but ${this.fileType} schema expects ${expected}. Some fields may remain unmapped.`;
    }
    return null;
  }

  async onMappingComplete(mappings: Record<string, string>) {
    if (!this.selectedFile) return;

    // Set loading state
    this.step = 'loading';
    this.uploadError = null;
    this.uploadResult = null;
    this.startLoadingMessages();
    this.cdr.markForCheck();

    // Give Angular one CD cycle to render loading panel
    await new Promise(resolve => setTimeout(resolve, 80));

    try {
      // Build dateBal only for COMPTA with valid date
      const dateBal = (this.fileType === 'COMPTA' && this.isDateValid)
        ? `${this.dd}/${this.mm}/${this.yyyy}`
        : undefined;

      // Determine mappings to pass (null means auto-match)
      const hasMappings = Object.keys(mappings).length > 0;

      const result = await this.etlApi.processFile({
        file: this.selectedFile,
        type: this.fileType,
        mappings: hasMappings ? mappings : null,
        dateBal
      });

      // Success
      this.stopLoadingMessages();

      await new Promise(resolve => setTimeout(resolve, 400));

      this.uploadResult = result;
      console.log('Upload result:', result);
      this.step = 'result';
      this.cdr.markForCheck();

    } catch (err: any) {
      this.stopLoadingMessages();
      this.uploadError = err.message || 'An unknown error occurred';
      this.step = 'result';
      this.cdr.markForCheck();
    }
  }

  onMappingBack() {
    this.setStep('form');
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files?.length) {
      this.handleFile(target.files[0]);
    }
  }

  handleFile(file: File) {
    this.selectedFile = file;
    this.extractionError = null;
    this.extractionResult = null;
    
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
    return this.selectedFile?.name?.toLowerCase().endsWith('.sql') ?? false;
  }

  // ── Slider Transform ───────────────────────────────────

  getSliderTransform(): string {
    switch (this.step) {
      case 'intro':             return 'translateX(0%)';
      case 'form':              return 'translateX(-11.1111%)';
      case 'mapping':           return 'translateX(-22.2222%)';
      case 'loading':           return 'translateX(-33.3333%)';
      case 'result':            return 'translateX(-44.4444%)';
      case 'quality-loading':   return 'translateX(-55.5555%)';
      case 'quality-result':    return 'translateX(-66.6666%)';
      case 'transform-loading': return 'translateX(-77.7777%)';
      case 'transform-result':  return 'translateX(-88.8888%)';
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
      return 'The upload timed out. The file may be too large — try splitting it into smaller chunks.';
    }
    if (err.toLowerCase().includes('failed to fetch')) {
      return 'Could not reach the server. Please check your connection and try again.';
    }
    if (err.includes('500')) {
      return 'An internal server error occurred. Please try again or contact support.';
    }
    return err;
  }

  resetPipeline(): void {
    this.selectedFile = null;
    this.fileColumns = [];
    this.extractionResult = null;
    this.extractionError = null;
    this.uploadResult = null;
    this.uploadError = null;
    this.stopLoadingMessages();
    this.dd = '';
    this.mm = '';
    this.yyyy = '';
    this.setStep('form');
    this.cdr.markForCheck();
  }

  retryUpload(): void {
    this.uploadError = null;
    this.uploadResult = null;
    this.stopLoadingMessages();
    this.setStep('mapping');
    this.cdr.markForCheck();
  }
}
