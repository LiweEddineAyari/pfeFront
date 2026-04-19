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
  FormulaExecutionResponseDTO,
  FormulaSqlResponseDTO,
  ParameterConfigResponseDTO,
} from '../../../core/models/parameter.model';
import { ApiHttpError, ParametersApiService } from '../../../core/services/parameters-api.service';

@Component({
  selector: 'app-parameter-details-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './parameter-details-dialog.component.html',
  styleUrl: './parameter-details-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParameterDetailsDialogComponent implements OnInit, OnChanges {
  @Input() parameterCode: string | null = null;
  @Input() initialParameter: ParameterConfigResponseDTO | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<ParameterConfigResponseDTO>();
  @Output() deleteRequested = new EventEmitter<ParameterConfigResponseDTO>();

  loading = false;
  parameter: ParameterConfigResponseDTO | null = null;
  apiError: ApiErrorResponse | null = null;

  activeTab: 'formula' | 'sql' | 'execute' = 'formula';

  sqlPreview: FormulaSqlResponseDTO | null = null;
  sqlLoading = false;

  executionResult: FormulaExecutionResponseDTO | null = null;
  executeLoading = false;
  referenceDate = '';

  private initialized = false;

  constructor(
    private parametersApi: ParametersApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }

    if (changes['parameterCode'] || changes['initialParameter']) {
      void this.initialize();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDialog();
  }

  closeDialog(): void {
    this.closed.emit();
  }

  requestEdit(): void {
    if (!this.parameter) {
      return;
    }

    this.editRequested.emit(this.parameter);
  }

  requestDelete(): void {
    if (!this.parameter) {
      return;
    }

    this.deleteRequested.emit(this.parameter);
  }

  async selectTab(tab: 'formula' | 'sql' | 'execute'): Promise<void> {
    this.activeTab = tab;
    this.cdr.markForCheck();

    if (tab === 'sql') {
      await this.loadSqlPreview();
    }
  }

  async loadSqlPreview(): Promise<void> {
    if (!this.parameter?.code || this.sqlLoading) {
      return;
    }

    this.sqlLoading = true;
    this.apiError = null;

    try {
      this.sqlPreview = await this.parametersApi.compileSql(this.parameter.code);
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.sqlLoading = false;
      this.cdr.markForCheck();
    }
  }

  async executeNow(): Promise<void> {
    if (!this.parameter?.code || this.executeLoading) {
      return;
    }

    this.executeLoading = true;
    this.apiError = null;

    try {
      this.executionResult = await this.parametersApi.execute(this.parameter.code);
      this.activeTab = 'execute';
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.executeLoading = false;
      this.cdr.markForCheck();
    }
  }

  async executeAtDate(): Promise<void> {
    if (!this.parameter?.code || this.executeLoading || !this.referenceDate.trim()) {
      return;
    }

    this.executeLoading = true;
    this.apiError = null;

    try {
      this.executionResult = await this.parametersApi.executeAtDate(
        this.parameter.code,
        this.referenceDate.trim()
      );
      this.activeTab = 'execute';
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.executeLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async initialize(): Promise<void> {
    this.initialized = true;
    this.loading = true;
    this.activeTab = 'formula';
    this.sqlPreview = null;
    this.executionResult = null;
    this.apiError = null;

    if (this.initialParameter) {
      this.parameter = this.initialParameter;
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
      this.parameter = await this.parametersApi.getByCode(code);
    } catch (error) {
      this.apiError = this.extractApiError(error);
      this.parameter = null;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
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
}
