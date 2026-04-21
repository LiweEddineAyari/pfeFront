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
  RatioExecutionResponseDTO,
  RatioSimulationResponseDTO,
} from '../../../core/models/ratio.model';
import { RatioApiHttpError, RatiosApiService } from '../../../core/services/ratios-api.service';

@Component({
  selector: 'app-ratio-details-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './ratio-details-dialog.component.html',
  styleUrl: './ratio-details-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatioDetailsDialogComponent implements OnInit, OnChanges {
  @Input() ratioCode: string | null = null;
  @Input() initialRatio: RatioConfigResponseDTO | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<RatioConfigResponseDTO>();
  @Output() deleteRequested = new EventEmitter<RatioConfigResponseDTO>();

  loading = false;
  ratio: RatioConfigResponseDTO | null = null;
  apiError: ApiErrorResponse | null = null;

  activeTab: 'formula' | 'execute' | 'simulate' = 'formula';

  executeLoading = false;
  referenceDate = '';
  executionResult: RatioExecutionResponseDTO | null = null;

  simulateLoading = false;
  simulationResult: RatioSimulationResponseDTO | null = null;

  private initialized = false;

  constructor(
    private ratiosApi: RatiosApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }

    if (changes['ratioCode'] || changes['initialRatio']) {
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
    if (!this.ratio) {
      return;
    }

    this.editRequested.emit(this.ratio);
  }

  requestDelete(): void {
    if (!this.ratio) {
      return;
    }

    this.deleteRequested.emit(this.ratio);
  }

  async selectTab(tab: 'formula' | 'execute' | 'simulate'): Promise<void> {
    this.activeTab = tab;
    this.cdr.markForCheck();

    if (tab === 'simulate' && !this.simulationResult) {
      await this.simulateCurrentFormula();
    }
  }

  async executeAtDate(): Promise<void> {
    if (!this.ratio?.code || this.executeLoading || !this.referenceDate.trim()) {
      return;
    }

    this.executeLoading = true;
    this.apiError = null;

    try {
      this.executionResult = await this.ratiosApi.executeAtDate(
        this.ratio.code,
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

  async simulateCurrentFormula(): Promise<void> {
    if (!this.ratio?.formula || this.simulateLoading) {
      return;
    }

    this.simulateLoading = true;
    this.apiError = null;

    try {
      this.simulationResult = await this.ratiosApi.simulate(this.ratio.formula);
      this.activeTab = 'simulate';
    } catch (error) {
      this.apiError = this.extractApiError(error);
    } finally {
      this.simulateLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async initialize(): Promise<void> {
    this.initialized = true;
    this.loading = true;
    this.apiError = null;
    this.activeTab = 'formula';
    this.executionResult = null;
    this.simulationResult = null;
    this.referenceDate = '';

    if (this.initialRatio) {
      this.ratio = this.initialRatio;
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
      this.ratio = await this.ratiosApi.getByCode(code);
    } catch (error) {
      this.apiError = this.extractApiError(error);
      this.ratio = null;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
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
}
