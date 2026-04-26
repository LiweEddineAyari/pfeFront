import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, takeUntil } from 'rxjs';
import {
  BalanceAdjustmentDTO,
  ParameterAdjustmentDTO,
  StressTestDiagnosticsResponseDTO,
  StressTestMethod,
  StressTestRequestDTO,
  StressTestResponseDTO,
} from '../../core/models/stress-test.model';
import { ApiErrorResponse } from '../../core/models/parameter.model';
import {
  StressTestApiError,
  StressTestApiService,
} from '../../core/services/stress-test-api.service';
import { ParametersApiService } from '../../core/services/parameters-api.service';
import { fadeInUp, fadeIn, expandCollapse } from '../../core/animations';

import { StressMethodSelectorComponent } from './components/method-selector.component';
import { BalanceValidatorState } from './components/balance-validator-bar.component';
import { BalanceAdjustmentsComponent } from './components/balance-adjustments.component';
import { ParameterAdjustmentsComponent } from './components/parameter-adjustments.component';
import { StressTestResultsComponent } from './components/stress-test-results.component';
import { CodeAutocompleteOption } from './components/code-autocomplete.component';

export interface BalanceSuggestion {
  row: BalanceAdjustmentDTO;
  suggestedValue: number;
}

export interface UnbalancedDetails {
  positive: number;
  negative: number;
  difference: number;
  addSuggestions: BalanceSuggestion[];
  subtractSuggestions: BalanceSuggestion[];
}

@Component({
  selector: 'app-stress-test-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DecimalPipe,
    StressMethodSelectorComponent,
    BalanceAdjustmentsComponent,
    ParameterAdjustmentsComponent,
    StressTestResultsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp, fadeIn, expandCollapse],
  templateUrl: './stress-test-page.component.html',
  styleUrl: './stress-test-page.component.css',
})
export class StressTestPageComponent implements OnInit, OnDestroy {
  private api = inject(StressTestApiService);
  private parametersApi = inject(ParametersApiService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  @ViewChild('resultsSection') resultsSection?: ElementRef<HTMLElement>;

  /* ----------------------------- Configuration state ----------------------------- */

  method: StressTestMethod = 'BALANCE';
  referenceDate: string = this.todayIso();

  balanceAdjustments: BalanceAdjustmentDTO[] = [];
  parameterAdjustments: ParameterAdjustmentDTO[] = [];

  validatorState: BalanceValidatorState = {
    positive: 0,
    negative: 0,
    difference: 0,
    balanced: false,
    hasSetOperation: false,
    rowCount: 0,
  };
  parameterAdjustmentsValid = false;

  /* ----------------------------- Diagnostics state ----------------------------- */

  diagnostics: StressTestDiagnosticsResponseDTO | null = null;
  diagnosticsLoading = false;

  /* ----------------------------- Reference data ----------------------------- */

  supportedFields: string[] = [];
  supportedFieldsByTable: Record<string, string[]> = {};
  parameterOptions: CodeAutocompleteOption[] = [];

  /* ----------------------------- Run / response state ----------------------------- */

  running = false;
  response: StressTestResponseDTO | null = null;
  error: ApiErrorResponse | null = null;
  lastRunDuration = 0;

  /**
   * Method used in the last simulation run (so we know whether to show balance card
   * even after the user switches method selector post-run).
   */
  lastRunMethod: StressTestMethod | null = null;

  /**
   * Adjustments sent in the last BALANCE run — needed to compute correction suggestions
   * when the server returns UNBALANCED_SIMULATION.
   */
  lastBalanceAdjustments: BalanceAdjustmentDTO[] = [];

  /**
   * Parsed server-side unbalanced details with per-row correction suggestions.
   * Only set when error.error === 'UNBALANCED_SIMULATION'.
   */
  unbalancedDetails: UnbalancedDetails | null = null;

  /** Whether the last BALANCE simulation succeeded (balance was verified by server). */
  get balanceVerifiedByServer(): boolean {
    return (
      this.lastRunMethod === 'BALANCE' &&
      this.response !== null &&
      this.error === null
    );
  }

  /** Whether we have an unbalanced error to show guidance for. */
  get isUnbalancedError(): boolean {
    return this.error?.error === 'UNBALANCED_SIMULATION';
  }

  /* ============================== Lifecycle ============================== */

  ngOnInit(): void {
    this.refreshDiagnostics();
    this.loadSupportedFields();
    this.loadParameterCodes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ============================== Method handling ============================== */

  onMethodChange(method: StressTestMethod): void {
    if (method === this.method) return;
    this.method = method;
    this.response = null;
    this.error = null;
    this.unbalancedDetails = null;
    this.cdr.markForCheck();
  }

  /* ============================== Reference date ============================== */

  onReferenceDateChange(value: string): void {
    this.referenceDate = value;
    this.refreshDiagnostics();
  }

  refreshDiagnostics(): void {
    this.diagnosticsLoading = true;
    this.api
      .diagnostics(this.referenceDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.diagnostics = response;
          this.diagnosticsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.diagnostics = null;
          this.diagnosticsLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  pickAvailableDate(date: string): void {
    if (!date) return;
    this.referenceDate = date;
    this.refreshDiagnostics();
  }

  /* ============================== Adjustments handling ============================== */

  onBalanceRowsChange(rows: BalanceAdjustmentDTO[]): void {
    this.balanceAdjustments = rows;
  }

  onValidatorStateChange(state: BalanceValidatorState): void {
    this.validatorState = state;
    this.cdr.markForCheck();
  }

  onParameterRowsChange(rows: ParameterAdjustmentDTO[]): void {
    this.parameterAdjustments = rows;
  }

  onParameterValidityChange(valid: boolean): void {
    this.parameterAdjustmentsValid = valid;
    this.cdr.markForCheck();
  }

  /* ============================== Run simulation ============================== */

  get configuredCount(): number {
    return this.method === 'BALANCE'
      ? this.balanceAdjustments.length
      : this.parameterAdjustments.length;
  }

  get canRun(): boolean {
    return !this.running && !this.runDisabledReason;
  }

  /**
   * Returns a user-visible blocking reason, or null when the simulation can run.
   *
   * BALANCE rules (client-side structural checks only — the server performs the
   * authoritative numeric balance check after filter expansion):
   *   1. Need ≥ 2 adjustment rows.
   *   2. Every row must have a finite value.
   *   3. Cannot have only SUBTRACT rows; at least one ADD (or SET) must be present.
   *   4. A SET row with a positive value requires at least one negative counterpart
   *      (a SUBTRACT row, or an ADD / SET row with a negative value).
   */
  get runDisabledReason(): string | null {
    if (!this.referenceDate) return 'Selectionnez une date de reference.';

    if (this.method === 'BALANCE') {
      const rows = this.balanceAdjustments;

      if (rows.length < 2)
        return 'Ajoutez au moins 2 ajustements de balance (un cote positif et un cote negatif).';

      if (!rows.every((r) => Number.isFinite(r.value)))
        return 'Renseignez la valeur de chaque ajustement.';

      const hasAdd      = rows.some((r) => r.operation === 'ADD');
      const hasSubtract = rows.some((r) => r.operation === 'SUBTRACT');

      // Can't have only SUBTRACT rows with no ADD / SET counterpart
      if (hasSubtract && !hasAdd && !rows.some((r) => r.operation === 'SET'))
        return 'Ajoutez au moins un ajustement ADD pour compenser les SUBTRACT.';

      // SET positive without any negative counterpart
      const hasSetPositive = rows.some((r) => r.operation === 'SET' && r.value > 0);
      if (hasSetPositive) {
        const hasNegativeSide = rows.some(
          (r) =>
            (r.operation === 'SUBTRACT' && r.value > 0) ||
            (r.operation === 'ADD' && r.value < 0) ||
            (r.operation === 'SET' && r.value < 0),
        );
        if (!hasNegativeSide)
          return 'Un SET positif necessite un ajustement negatif (SUBTRACT ou valeur negative) pour equilibrer.';
      }

      return null;
    }

    if (this.parameterAdjustments.length === 0)
      return 'Ajoutez au moins un override de parametre.';
    if (!this.parameterAdjustmentsValid)
      return 'Verifiez les codes et valeurs des parametres.';

    return null;
  }

  runSimulation(): void {
    if (!this.canRun) return;

    const request: StressTestRequestDTO = {
      method: this.method,
      referenceDate: this.referenceDate,
    };

    if (this.method === 'BALANCE') {
      request.balanceAdjustments = this.balanceAdjustments;
      this.lastBalanceAdjustments = [...this.balanceAdjustments];
    } else {
      request.parameterAdjustments = this.parameterAdjustments;
    }

    this.lastRunMethod = this.method;
    this.running = true;
    this.error = null;
    this.response = null;
    this.unbalancedDetails = null;
    const startedAt = performance.now();

    this.api
      .simulate(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.response = response;
          this.running = false;
          this.lastRunDuration = Math.round(performance.now() - startedAt);
          this.cdr.markForCheck();
          this.scrollToResults();
        },
        error: (err: unknown) => {
          if (err instanceof StressTestApiError) {
            this.error = err.apiError;
            if (err.apiError.error === 'UNBALANCED_SIMULATION') {
              this.unbalancedDetails = this.parseUnbalancedError(
                err.apiError,
                this.lastBalanceAdjustments,
              );
            }
          } else if (err instanceof Error) {
            this.error = {
              timestamp: new Date().toISOString(),
              status: 0,
              error: 'CLIENT_ERROR',
              message: err.message,
              details: [],
              path: '/api/stress-test/simulate',
            };
          }
          this.running = false;
          this.lastRunDuration = Math.round(performance.now() - startedAt);
          this.cdr.markForCheck();
          this.scrollToResults();
        },
      });
  }

  resetResults(): void {
    this.response = null;
    this.error = null;
    this.unbalancedDetails = null;
    this.lastRunMethod = null;
    this.cdr.markForCheck();
  }

  private scrollToResults(): void {
    // Give Angular one tick to render the results zone before scrolling.
    setTimeout(() => {
      this.resultsSection?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }

  copyToClipboard(value: number): void {
    navigator.clipboard.writeText(String(value)).catch(() => undefined);
  }

  /* ============================== Unbalanced error helpers ============================== */

  /**
   * Parse the UNBALANCED_SIMULATION error details and compute what each per-row
   * value should be to make both sides equal.
   *
   * Algorithm (per row):
   *   numRows_i  = totalSide / perRowValue_i
   *   suggested_i = otherSideTotal / numRows_i
   *              = perRowValue_i * (otherSideTotal / thisSideTotal)
   */
  private parseUnbalancedError(
    error: ApiErrorResponse,
    adjustments: BalanceAdjustmentDTO[],
  ): UnbalancedDetails {
    let positive = 0;
    let negative = 0;
    let difference = 0;

    for (const detail of error.details ?? []) {
      const eqIdx = detail.indexOf('=');
      if (eqIdx === -1) continue;
      const key = detail.slice(0, eqIdx).trim();
      const val = parseFloat(detail.slice(eqIdx + 1));
      if (key === 'positive') positive = val;
      else if (key === 'negative') negative = val;
      else if (key === 'difference') difference = val;
    }

    const ratioForAdd = positive > 0 ? negative / positive : 1;
    const ratioForSubtract = negative > 0 ? positive / negative : 1;

    const addRows = adjustments.filter((r) => r.operation === 'ADD');
    const subtractRows = adjustments.filter((r) => r.operation === 'SUBTRACT');

    return {
      positive,
      negative,
      difference,
      addSuggestions: addRows.map((row) => ({
        row,
        suggestedValue: row.value * ratioForAdd,
      })),
      subtractSuggestions: subtractRows.map((row) => ({
        row,
        suggestedValue: row.value * ratioForSubtract,
      })),
    };
  }

  describeRowFilters(row: BalanceAdjustmentDTO): string {
    const conditions = row.filters?.conditions;
    if (!conditions?.length) return 'Sans filtre';
    return conditions
      .map((c) => `${c.field} ${c.operator} ${c.value}`)
      .join(', ');
  }

  /* ============================== Reference data loading ============================== */

  private async loadSupportedFields(): Promise<void> {
    try {
      const response = await this.parametersApi.supportedFields();
      this.supportedFields = response.fields;
      this.supportedFieldsByTable = response.fieldsByTable;
      this.cdr.markForCheck();
    } catch {
      // silent fail — filters still work without grouping
    }
  }

  private async loadParameterCodes(): Promise<void> {
    try {
      const response = await this.parametersApi.list({ page: 0, size: 500 });
      this.parameterOptions = response.items.map((p) => ({
        code: p.code,
        label: p.label,
      }));
      this.cdr.markForCheck();
    } catch {
      this.parameterOptions = [];
    }
  }

  private todayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
