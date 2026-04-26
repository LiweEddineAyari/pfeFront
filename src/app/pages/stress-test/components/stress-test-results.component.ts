import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  ParameterImpactDTO,
  RatioImpactDTO,
  StressTestResponseDTO,
} from '../../../core/models/stress-test.model';
import { fadeInUp, fadeIn, staggerList } from '../../../core/animations';

type SortMode = 'impact-desc' | 'impact-asc' | 'code-asc';

interface ImpactComputed {
  /** Magnitude (0..1) used for visual scaling — capped at 1. */
  magnitude: number;
  /** True if increase (positive delta). */
  isIncrease: boolean;
  /** True if decrease. */
  isDecrease: boolean;
  /** Pre-formatted relative bar width, in percent. */
  barWidthPercent: number;
}

@Component({
  selector: 'app-stress-test-results',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp, fadeIn, staggerList],
  templateUrl: './stress-test-results.component.html',
  styleUrl: './stress-test-results.component.css',
})
export class StressTestResultsComponent implements OnChanges {
  @Input() response: StressTestResponseDTO | null = null;

  paramSearch = '';
  paramSort: SortMode = 'impact-desc';
  paramOnlyImpacted = true;

  ratioSearch = '';
  ratioSort: SortMode = 'impact-desc';
  ratioOnlyImpacted = true;

  paramsExpanded = true;
  ratiosExpanded = true;

  /** Computed visualization helpers per parameter / ratio code. */
  private impactByCode = new Map<string, ImpactComputed>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['response']) {
      this.recomputeImpactScales();
    }
  }

  get filteredParameters(): ParameterImpactDTO[] {
    return this.applyFilters(
      this.response?.parameters ?? [],
      this.paramSearch,
      this.paramSort,
      this.paramOnlyImpacted,
    );
  }

  get filteredRatios(): RatioImpactDTO[] {
    return this.applyFilters(
      this.response?.ratios ?? [],
      this.ratioSearch,
      this.ratioSort,
      this.ratioOnlyImpacted,
    ) as RatioImpactDTO[];
  }

  toggleParams(): void {
    this.paramsExpanded = !this.paramsExpanded;
  }

  toggleRatios(): void {
    this.ratiosExpanded = !this.ratiosExpanded;
  }

  trackByCode(_: number, item: { code: string }): string {
    return item.code;
  }

  getImpact(code: string): ImpactComputed {
    return this.impactByCode.get(code) ?? {
      magnitude: 0,
      isIncrease: false,
      isDecrease: false,
      barWidthPercent: 0,
    };
  }

  /**
   * Always shows full precision so analysts can spot small differences.
   * Large numbers keep the thousands separator with up to 4 decimals.
   * Numbers below 1 show up to 15 significant decimals.
   */
  smartDecimalsFormat(value: number): string {
    const abs = Math.abs(value);
    if (abs === 0) return '1.0-0';
    if (abs >= 1_000_000) return '1.0-4';
    if (abs >= 1)         return '1.0-8';
    return '1.0-15';
  }

  formatPercent(value: number): string {
    if (!Number.isFinite(value)) return '0%';
    const abs = Math.abs(value);
    if (abs === 0) return '0%';
    if (abs < 0.001) return `${value > 0 ? '+' : ''}${value.toFixed(4)}%`;
    if (abs < 1) return `${value > 0 ? '+' : ''}${value.toFixed(3)}%`;
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  hasDashboardValue(ratio: RatioImpactDTO): boolean {
    return ratio.dashboardValue !== null && ratio.dashboardValue !== undefined;
  }

  private applyFilters<T extends ParameterImpactDTO>(
    items: T[],
    search: string,
    sort: SortMode,
    onlyImpacted: boolean,
  ): T[] {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (onlyImpacted && !item.changed) return false;
      if (!normalizedSearch) return true;
      return (
        item.code.toLowerCase().includes(normalizedSearch) ||
        item.label.toLowerCase().includes(normalizedSearch)
      );
    });

    const sorted = [...filtered];
    switch (sort) {
      case 'impact-desc':
        sorted.sort((a, b) => Math.abs(b.impactPercent) - Math.abs(a.impactPercent));
        break;
      case 'impact-asc':
        sorted.sort((a, b) => Math.abs(a.impactPercent) - Math.abs(b.impactPercent));
        break;
      case 'code-asc':
        sorted.sort((a, b) => a.code.localeCompare(b.code));
        break;
    }
    return sorted;
  }

  private recomputeImpactScales(): void {
    this.impactByCode.clear();
    if (!this.response) return;

    const allItems: Array<ParameterImpactDTO | RatioImpactDTO> = [
      ...this.response.parameters,
      ...this.response.ratios,
    ];

    const maxAbs = allItems.reduce(
      (max, item) => Math.max(max, Math.abs(item.impactPercent)),
      0,
    );

    const denominator = maxAbs > 0 ? maxAbs : 1;
    for (const item of allItems) {
      const abs = Math.abs(item.impactPercent);
      const magnitude = Math.min(1, abs / denominator);
      this.impactByCode.set(item.code, {
        magnitude,
        isIncrease: item.delta > 0,
        isDecrease: item.delta < 0,
        barWidthPercent: Math.max(6, magnitude * 100),
      });
    }
  }
}
