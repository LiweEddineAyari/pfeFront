import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import {
  DashboardGroupedByRatioResponse,
  DashboardRowResponseDTO,
} from '../../core/models/dashboard.model';
import { RatioLookupItem } from '../../core/models/ratio.model';
import { DashboardApiHttpError, DashboardService } from '../../core/services/dashboard.service';
import { fadeInUp, fadeIn, staggerList } from '../../core/animations';
import { RatioLineChartCardComponent } from './components/ratio-line-chart-card.component';

type GaugeTone = 'critical' | 'warning' | 'elevated' | 'watch' | 'good' | 'excellent';

interface GaugeSegment {
  startPercent: number;
  endPercent: number;
}

interface GaugeModel {
  min: number;
  max: number;
  tolerance: number;
  alert: number;
  appetite: number;
  segments: GaugeSegment[];
  needlePercent: number;
  needleAngle: number;
  tone: GaugeTone;
  isInverted: boolean;
}

interface DashboardRatioCard extends DashboardRowResponseDTO {
  familyName: string;
  categoryName: string;
  gauge: GaugeModel;
  currentAngle: number;
  currentValue: number;
  currentValueLabel: string;
}

interface DashboardFamilyGroup {
  familyId: number;
  familyName: string;
  rows: DashboardRatioCard[];
}

/** A single time-series card data shape for the "Toutes les dates" view. */
export interface RatioSeriesCard {
  code: string;
  label: string;
  categoryName: string;
  familyId: number;
  familyName: string;
  data: Record<string, number>;
}

/** Grouped time-series view. */
export interface RatioSeriesFamilyGroup {
  familyId: number;
  familyName: string;
  cards: RatioSeriesCard[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RatioLineChartCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp, fadeIn, staggerList],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  refreshing = false;
  errorMessage: string | null = null;

  selectedDate = '';
  ratioCodeFilter = '';
  selectedCategoryId: number | 'all' = 'all';

  availableDates: string[] = [];
  categoryOptions: RatioLookupItem[] = [];
  ratioCodeOptions: { code: string; label: string }[] = [];
  showCodeDropdown = false;
  showDateDropdown = false;

  private allRows: DashboardRatioCard[] = [];
  groupedRows: DashboardFamilyGroup[] = [];
  visibleRatios = 0;

  /** Time-series data, only populated when "Toutes les dates" is active. */
  private groupedByRatio: DashboardGroupedByRatioResponse = {};
  /** Time-series cards, grouped by family, ready to render. */
  groupedSeries: RatioSeriesFamilyGroup[] = [];
  /** Number of distinct ratios in the time-series view. */
  visibleSeriesRatios = 0;
  /** True while we're fetching the grouped-by-ratio payload. */
  seriesLoading = false;

  /** True once `groupedByRatio` has been loaded at least once. */
  seriesFetched = false;

  /** Whether the dashboard is in the time-series view ("Toutes les dates" mode). */
  get isAllDatesMode(): boolean {
    return !this.selectedDate.trim();
  }

  readonly gaugeCenterX = 120;
  readonly gaugeCenterY = 130;
  readonly gaugeRadius = 70;
  readonly gaugeNeedleRadius = 60;
  readonly gaugeStrokePalette = [
    'url(#dashTone1)',
    'url(#dashTone2)',
    'url(#dashTone3)',
    'url(#dashTone4)',
    'url(#dashTone5)',
    'url(#dashTone6)',
  ];

  private numberFormatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });

  ngOnInit(): void {
    void this.loadDashboard(false);
  }

  get latestDate(): string {
    return this.availableDates[0] ?? '-';
  }

  get selectedCategoryName(): string {
    if (this.selectedCategoryId === 'all') {
      return 'Toutes les categories';
    }

    const found = this.categoryOptions.find((item) => item.id === this.selectedCategoryId);
    return found?.name ?? `Categorie ${this.selectedCategoryId}`;
  }

  refreshDashboard(): void {
    window.location.reload();
  }

  onDateChange(nextDate: string): void {
    this.selectedDate = nextDate;
    this.applyFilters();
    if (this.isAllDatesMode) {
      void this.loadGroupedSeries();
    }
  }

  onCodeFilterChange(nextCode: string): void {
    this.ratioCodeFilter = nextCode;
    this.applyFilters();
  }

  onCategorySelect(nextCategory: number | 'all'): void {
    this.selectedCategoryId = nextCategory;
    this.applyFilters();
  }

  clearCodeFilter(): void {
    this.ratioCodeFilter = '';
    this.applyFilters();
  }

  get filteredCodeOptions() {
    const filter = this.ratioCodeFilter.trim().toLowerCase();
    if (!filter) return this.ratioCodeOptions;
    return this.ratioCodeOptions.filter(opt => 
      opt.code.toLowerCase().includes(filter) || 
      opt.label.toLowerCase().includes(filter)
    );
  }

  onCodeBlur(): void {
    this.showCodeDropdown = false;
  }

  selectCodeOption(code: string): void {
    this.ratioCodeFilter = code;
    this.showCodeDropdown = false;
    this.applyFilters();
  }

  onDateBlur(): void {
    this.showDateDropdown = false;
  }

  selectDateOption(date: string): void {
    this.selectedDate = date;
    this.showDateDropdown = false;
    this.onDateChange(date);
  }

  thresholdLabel(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return '-';
    }

    return this.numberFormatter.format(value);
  }

  segmentPath(segment: GaugeSegment, segmentIndex: number): string {
    const isFirst = segmentIndex === 0;
    const isLast = segmentIndex === 5;
    const gap = 0.008;

    const startP = segment.startPercent + (isFirst ? 0 : gap);
    const endP = segment.endPercent - (isLast ? 0 : gap);

    const startAngle = this.percentToAngle(startP);
    const endAngle = this.percentToAngle(endP);
    const start = this.pointOnGauge(this.gaugeRadius, startAngle);
    const end = this.pointOnGauge(this.gaugeRadius, endAngle);

    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${this.gaugeRadius} ${this.gaugeRadius} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  gaugeSegmentStroke(index: number, gauge?: GaugeModel): string {
    const i = gauge?.isInverted ? (5 - index) : index;
    return this.gaugeStrokePalette[i] ?? this.gaugeStrokePalette[this.gaugeStrokePalette.length - 1];
  }

  needlePath(): string {
    const centerX = this.gaugeCenterX;
    const centerY = this.gaugeCenterY;
    const tipLength = this.gaugeNeedleRadius;
    const baseHalfWidth = 4.5;

    const tipX = centerX + tipLength;
    const tipY = centerY;
    const baseLeftX = centerX;
    const baseLeftY = centerY + baseHalfWidth;
    const baseRightX = centerX;
    const baseRightY = centerY - baseHalfWidth;

    return `M ${baseLeftX.toFixed(2)} ${baseLeftY.toFixed(2)} L ${tipX.toFixed(2)} ${tipY.toFixed(2)} L ${baseRightX.toFixed(2)} ${baseRightY.toFixed(2)} Z`;
  }

  markerX(gauge: GaugeModel, value: number, radius = this.gaugeRadius + 8): number {
    const radians = (this.valueToAngle(gauge, value) * Math.PI) / 180;
    return this.gaugeCenterX + radius * Math.cos(radians);
  }

  markerY(gauge: GaugeModel, value: number, radius = this.gaugeRadius + 8): number {
    const radians = (this.valueToAngle(gauge, value) * Math.PI) / 180;
    return this.gaugeCenterY - radius * Math.sin(radians);
  }

  toneLabel(tone: GaugeTone): string {
    switch (tone) {
      case 'critical':
        return 'Zone critique';
      case 'warning':
        return 'Zone sous surveillance';
      case 'elevated':
        return 'Zone alerte';
      case 'watch':
        return 'Zone de vigilance';
      case 'good':
        return 'Zone saine';
      default:
        return 'Zone excellente';
    }
  }

  toneClass(tone: GaugeTone): string {
    return `tone-${tone}`;
  }

  trackByFamily(_: number, group: DashboardFamilyGroup): string {
    return `${group.familyId}-${group.familyName}`;
  }

  trackByRatio(_: number, row: DashboardRatioCard): number {
    return row.id;
  }

  trackByCategory(_: number, category: RatioLookupItem): number {
    return category.id;
  }

  trackByCode(_: number, code: string): string {
    return code;
  }

  private async loadDashboard(isRefresh: boolean): Promise<void> {
    if (isRefresh) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }

    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const [rows, families, categories] = await Promise.all([
        this.dashboardService.listRows(),
        this.dashboardService.listFamilies(),
        this.dashboardService.listCategories(),
      ]);

      const familyMap = new Map<number, string>();
      const categoryMap = new Map<number, string>();

      this.normalizeLookups(families, 'Famille').forEach((item) => {
        familyMap.set(item.id, item.name);
      });
      this.normalizeLookups(categories, 'Categorie').forEach((item) => {
        categoryMap.set(item.id, item.name);
      });

      this.allRows = rows
        .map((row) => this.decorateRow(row, familyMap, categoryMap))
        .sort((a, b) => a.code.localeCompare(b.code));

      this.availableDates = this.extractDates(this.allRows);
      if (!this.availableDates.includes(this.selectedDate)) {
        this.selectedDate = this.availableDates[0] ?? '';
      }

      this.categoryOptions = this.buildCategoryOptions(this.allRows, categoryMap);
      
      const codeMap = new Map<string, string>();
      this.allRows.forEach((row) => {
        if (!codeMap.has(row.code)) {
          codeMap.set(row.code, row.label || row.description || '');
        }
      });
      this.ratioCodeOptions = Array.from(codeMap.entries())
        .map(([code, label]) => ({ code, label }))
        .sort((a, b) => a.code.localeCompare(b.code));

      this.applyFilters();

      // Kick off the time-series fetch in parallel if "Toutes les dates" is active.
      if (this.isAllDatesMode) {
        void this.loadGroupedSeries();
      }

      setTimeout(() => {
        this.animateCards();
      }, 50);
    } catch (error) {
      this.groupedRows = [];
      this.visibleRatios = 0;
      this.errorMessage = this.extractErrorMessage(error);
    } finally {
      this.loading = false;
      this.refreshing = false;
      this.cdr.markForCheck();
    }
  }

  private animateCards(): void {
    const duration = 1500;
    const startTime = performance.now();

    this.allRows.forEach(row => {
      row.currentAngle = row.gauge.needleAngle;
    });
    this.cdr.markForCheck();

    const animateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);
      let needsAnotherFrame = false;

      this.allRows.forEach(row => {
        const targetValue = Number.isFinite(row.value) ? row.value : 0;
        if (row.currentValue !== targetValue) {
          row.currentValue = row.gauge.alert + (targetValue - row.gauge.alert) * easeOut;
          row.currentValueLabel = this.formatValue(row.currentValue);
          if (progress < 1) {
            needsAnotherFrame = true;
          } else {
            row.currentValue = targetValue;
            row.currentValueLabel = this.formatValue(targetValue);
          }
        }
      });

      this.cdr.markForCheck();

      if (needsAnotherFrame) {
        requestAnimationFrame(animateNumber);
      }
    };

    requestAnimationFrame(animateNumber);
  }

  private applyFilters(): void {
    const date = this.selectedDate.trim();
    const codeFilter = this.ratioCodeFilter.trim().toLowerCase();

    if (date) {
      // Specific date selected → render gauge cards (existing behaviour).
      const filtered = this.allRows.filter((row) => {
        const matchesDate = row.date === date;
        const matchesCategory =
          this.selectedCategoryId === 'all' || row.categorieId === this.selectedCategoryId;
        const matchesCode = !codeFilter || row.code.toLowerCase().includes(codeFilter);
        return matchesDate && matchesCategory && matchesCode;
      });

      this.visibleRatios = filtered.length;
      this.groupedRows = this.groupByFamily(filtered);
    } else {
      this.visibleRatios = 0;
      this.groupedRows = [];
    }

    // Always rebuild the time-series view so it reflects current category/code filters.
    this.rebuildSeriesView();
    this.cdr.markForCheck();
  }

  /* ============================== Time-series view ============================== */

  /** Fetches the grouped-by-ratio payload and refreshes the time-series view. */
  private async loadGroupedSeries(): Promise<void> {
    this.seriesLoading = true;
    this.cdr.markForCheck();

    try {
      this.groupedByRatio = await this.dashboardService.groupedByRatio();
    } catch (error) {
      this.groupedByRatio = {};
      this.errorMessage = this.extractErrorMessage(error);
    } finally {
      this.seriesLoading = false;
      this.seriesFetched = true;
      this.rebuildSeriesView();
      this.cdr.markForCheck();
    }
  }

  /**
   * Rebuilds `groupedSeries` from the cached `groupedByRatio` payload, applying
   * the current category and code filters. Metadata (label, category, family)
   * is taken from `allRows` — we always have a row per ratio because listRows()
   * runs first.
   */
  private rebuildSeriesView(): void {
    if (!this.isAllDatesMode) {
      this.groupedSeries = [];
      this.visibleSeriesRatios = 0;
      return;
    }

    const codeFilter = this.ratioCodeFilter.trim().toLowerCase();
    const metaByCode = new Map<string, DashboardRatioCard>();
    for (const row of this.allRows) {
      if (!metaByCode.has(row.code)) {
        metaByCode.set(row.code, row);
      }
    }

    const cards: RatioSeriesCard[] = [];
    for (const [code, series] of Object.entries(this.groupedByRatio)) {
      const meta = metaByCode.get(code);
      if (!meta) continue;
      if (
        this.selectedCategoryId !== 'all' &&
        meta.categorieId !== this.selectedCategoryId
      ) continue;
      if (codeFilter && !code.toLowerCase().includes(codeFilter)) continue;

      cards.push({
        code,
        label: meta.label || code,
        categoryName: meta.categoryName,
        familyId: meta.familleId,
        familyName: meta.familyName,
        data: series,
      });
    }

    this.visibleSeriesRatios = cards.length;
    this.groupedSeries = this.groupSeriesByFamily(cards);
  }

  private groupSeriesByFamily(cards: RatioSeriesCard[]): RatioSeriesFamilyGroup[] {
    const map = new Map<number, RatioSeriesFamilyGroup>();

    for (const card of cards) {
      const existing = map.get(card.familyId);
      if (!existing) {
        map.set(card.familyId, {
          familyId: card.familyId,
          familyName: card.familyName,
          cards: [card],
        });
        continue;
      }

      if (this.isGenericName(existing.familyName) && !this.isGenericName(card.familyName)) {
        existing.familyName = card.familyName;
      }
      existing.cards.push(card);
    }

    const groups = Array.from(map.values());
    groups.forEach((g) => g.cards.sort((a, b) => a.code.localeCompare(b.code)));
    return groups.sort((a, b) => a.familyName.localeCompare(b.familyName));
  }

  trackBySeriesFamily(_: number, group: RatioSeriesFamilyGroup): string {
    return `${group.familyId}-${group.familyName}`;
  }

  trackBySeriesCard(_: number, card: RatioSeriesCard): string {
    return card.code;
  }

  private groupByFamily(rows: DashboardRatioCard[]): DashboardFamilyGroup[] {
    const map = new Map<number, DashboardFamilyGroup>();

    rows.forEach((row) => {
      const existing = map.get(row.familleId);

      if (!existing) {
        map.set(row.familleId, {
          familyId: row.familleId,
          familyName: row.familyName,
          rows: [row],
        });
        return;
      }

      if (this.isGenericName(existing.familyName) && !this.isGenericName(row.familyName)) {
        existing.familyName = row.familyName;
      }

      existing.rows.push(row);
    });

    const groups = Array.from(map.values());
    groups.forEach((group) => {
      group.rows.sort((a, b) => a.code.localeCompare(b.code));
    });

    return groups.sort((a, b) => a.familyName.localeCompare(b.familyName));
  }

  private decorateRow(
    row: DashboardRowResponseDTO,
    familyMap: Map<number, string>,
    categoryMap: Map<number, string>
  ): DashboardRatioCard {
    const familyName = this.pickBestName(
      row.familleId,
      familyMap.get(row.familleId) ?? '',
      row.familleCode,
      'Famille'
    );
    const categoryName = this.pickBestName(
      row.categorieId,
      categoryMap.get(row.categorieId) ?? '',
      row.categorieCode,
      'Categorie'
    );
    
    const gauge = this.createGaugeModel(row);
    const aleAngle = 90;

    return {
      ...row,
      familyName,
      categoryName,
      gauge,
      currentAngle: aleAngle,
      currentValue: gauge.alert,
      currentValueLabel: this.formatValue(gauge.alert),
    };
  }

  private normalizeLookups(items: RatioLookupItem[], fallback: string): RatioLookupItem[] {
    const map = new Map<number, RatioLookupItem>();

    items.forEach((item) => {
      if (!Number.isFinite(item.id) || item.id <= 0) {
        return;
      }

      const cleanedName = item.name?.trim() || `${fallback} ${item.id}`;
      const previous = map.get(item.id);

      if (!previous) {
        map.set(item.id, { id: item.id, name: cleanedName });
        return;
      }

      map.set(item.id, {
        id: item.id,
        name: this.pickBestName(item.id, previous.name, cleanedName, fallback),
      });
    });

    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }

  private buildCategoryOptions(
    rows: DashboardRatioCard[],
    categoryMap: Map<number, string>
  ): RatioLookupItem[] {
    const merged = new Map<number, string>();

    categoryMap.forEach((name, id) => {
      merged.set(id, name);
    });

    rows.forEach((row) => {
      const existing = merged.get(row.categorieId) ?? '';
      const chosen = this.pickBestName(row.categorieId, existing, row.categoryName, 'Categorie');
      merged.set(row.categorieId, chosen);
    });

    return Array.from(merged.entries())
      .filter(([id]) => id > 0)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private extractDates(rows: DashboardRatioCard[]): string[] {
    return Array.from(new Set(rows.map((row) => row.date).filter((value) => value.length > 0)))
      .sort((a, b) => b.localeCompare(a));
  }

  private pickBestName(id: number, left: string, right: string, label: string): string {
    const leftValue = left.trim();
    const rightValue = right.trim();

    if (!leftValue && !rightValue) {
      return `${label} ${id}`;
    }

    if (!leftValue) {
      return rightValue;
    }

    if (!rightValue) {
      return leftValue;
    }

    const leftGeneric = this.isGenericName(leftValue);
    const rightGeneric = this.isGenericName(rightValue);

    if (leftGeneric && !rightGeneric) {
      return rightValue;
    }

    if (!leftGeneric && rightGeneric) {
      return leftValue;
    }

    return leftValue;
  }

  private isGenericName(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return /^id\s+\d+$/.test(normalized)
      || /^famille\s+\d+$/.test(normalized)
      || /^categorie\s+\d+$/.test(normalized)
      || /^family\s+\d+$/.test(normalized)
      || /^category\s+\d+$/.test(normalized);
  }

  private createGaugeModel(row: DashboardRowResponseDTO): GaugeModel {
    const value = Number.isFinite(row.value) ? row.value : 0;
    const baseline = Math.max(Math.abs(value), 1);

    const rawTolerance = Number.isFinite(row.seuilTolerance as number)
      ? (row.seuilTolerance as number)
      : value - baseline * 0.4;
    const rawAlert = Number.isFinite(row.seuilAlerte as number)
      ? (row.seuilAlerte as number)
      : value;
    const rawAppetite = Number.isFinite(row.seuilAppetence as number)
      ? (row.seuilAppetence as number)
      : value + baseline * 0.4;

    // Invert the needle when the worst threshold is the highest value (App > Tol).
    const isInverted =
      Number.isFinite(row.seuilTolerance as number) &&
      Number.isFinite(row.seuilAppetence as number) &&
      rawAppetite > rawTolerance;

    const orderedThresholds = [rawTolerance, rawAlert, rawAppetite].sort((a, b) => a - b);
    const tolerance = orderedThresholds[0];
    const alert = orderedThresholds[1];
    const appetite = orderedThresholds[2];

    const thresholdMin = tolerance;
    const thresholdMid = alert;
    const thresholdMax = appetite;

    const thresholdSpan = Math.max(thresholdMax - thresholdMin, baseline * 0.4, 1);
    const min = thresholdMin - thresholdSpan;
    const max = thresholdMax + thresholdSpan;

    const rawStops = [
      min,
      thresholdMin - thresholdSpan * 0.5,
      thresholdMin,
      thresholdMid,
      thresholdMax,
      thresholdMax + thresholdSpan * 0.5,
      max,
    ];

    const stops = this.ensureIncreasingStops(rawStops);

    const segments: GaugeSegment[] = Array.from({ length: 6 }, (_, index) => ({
      startPercent: index / 6,
      endPercent: (index + 1) / 6,
    }));

    const needlePercent = this.valueToPercent(stops[0], stops[6], value);
    const tone = isInverted
      ? this.resolveToneInverted(stops, value)
      : this.resolveTone(stops, value);

    const needleAngle = 180 - needlePercent * 180;

    return {
      min: stops[0],
      max: stops[6],
      tolerance,
      alert,
      appetite,
      segments,
      needlePercent,
      needleAngle,
      tone,
      isInverted,
    };
  }

  private ensureIncreasingStops(stops: number[]): number[] {
    const normalized = [...stops];
    const minStep = Math.max((normalized[normalized.length - 1] - normalized[0]) / 1000, 0.0001);

    for (let index = 1; index < normalized.length; index += 1) {
      if (normalized[index] <= normalized[index - 1]) {
        normalized[index] = normalized[index - 1] + minStep;
      }
    }

    return normalized;
  }

  private resolveTone(stops: number[], value: number): GaugeTone {
    if (value <= stops[1]) {
      return 'critical';
    }
    if (value <= stops[2]) {
      return 'warning';
    }
    if (value <= stops[3]) {
      return 'elevated';
    }
    if (value <= stops[4]) {
      return 'watch';
    }
    if (value <= stops[5]) {
      return 'good';
    }
    return 'excellent';
  }

  private resolveToneInverted(stops: number[], value: number): GaugeTone {
    if (value >= stops[5]) return 'critical';
    if (value >= stops[4]) return 'warning';
    if (value >= stops[3]) return 'elevated';
    if (value >= stops[2]) return 'watch';
    if (value >= stops[1]) return 'good';
    return 'excellent';
  }

  private valueToAngle(gauge: GaugeModel, value: number): number {
    const percent = this.valueToPercent(gauge.min, gauge.max, value);
    return 180 - percent * 180;
  }

  private percentToAngle(percent: number): number {
    return 180 - percent * 180;
  }

  private phaseBoundaryPercent(phase: 'tol' | 'ale' | 'app'): number {
    if (phase === 'app') {
      return 2 / 6;
    }

    if (phase === 'ale') {
      return 3 / 6;
    }

    return 4 / 6;
  }

  private phaseBoundaryPercentForGauge(gauge: GaugeModel, phase: 'tol' | 'ale' | 'app'): number {
    if (gauge.isInverted) {
      if (phase === 'tol') return 2 / 6;
      if (phase === 'ale') return 3 / 6;
      return 4 / 6;
    }
    return this.phaseBoundaryPercent(phase);
  }

  phaseMarkerXForGauge(gauge: GaugeModel, phase: 'tol' | 'ale' | 'app', radius = this.gaugeRadius + 8): number {
    const point = this.pointOnGauge(radius, this.percentToAngle(this.phaseBoundaryPercentForGauge(gauge, phase)));
    return point.x;
  }

  phaseMarkerYForGauge(gauge: GaugeModel, phase: 'tol' | 'ale' | 'app', radius = this.gaugeRadius + 8): number {
    const point = this.pointOnGauge(radius, this.percentToAngle(this.phaseBoundaryPercentForGauge(gauge, phase)));
    return point.y;
  }

  private pointOnGauge(radius: number, angleDeg: number): { x: number; y: number } {
    const radians = (angleDeg * Math.PI) / 180;
    return {
      x: this.gaugeCenterX + radius * Math.cos(radians),
      y: this.gaugeCenterY - radius * Math.sin(radians),
    };
  }

  private valueToPercent(min: number, max: number, value: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      return 0.5;
    }

    const raw = (value - min) / (max - min);
    return Math.max(0, Math.min(1, raw));
  }

  private formatValue(value: number): string {
    if (!Number.isFinite(value)) {
      return '-';
    }

    const absolute = Math.abs(value);
    if ((absolute > 0 && absolute < 0.0001) || absolute >= 1000000) {
      return value.toExponential(2).replace('e', 'E');
    }

    return this.numberFormatter.format(value);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof DashboardApiHttpError) {
      return error.apiError.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Erreur inattendue lors du chargement du dashboard.';
  }
}
