import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Filler,
  Tooltip,
  ChartConfiguration,
  ChartDataset,
  ScriptableContext,
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Filler,
  Tooltip
);

@Component({
  selector: 'app-ratio-line-chart-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <article
      class="line-card"
      [style.--card-index]="index"
      [style.--accent]="accent"
      [style.--accent-soft]="accentSoft"
    >
      <div class="accent-bar"></div>

      <header class="line-card-header">
        <div class="meta-row">
          <span class="code-pill">
            <span class="code-dot"></span>
            {{ code }}
          </span>
          <span class="category-pill">{{ category }}</span>
        </div>
        <h3 class="card-title">{{ label }}</h3>
      </header>

      <div class="chart-wrap" #chartWrap>
        <canvas #canvas></canvas>
        <div class="chart-empty" *ngIf="!hasData">
          <span>Pas de donnees disponibles</span>
        </div>
      </div>

      <footer class="line-card-footer">
        <div class="footer-left">
          <span class="last-value">{{ lastValueLabel }}</span>
          <span class="last-label">Derniere valeur</span>
        </div>
        <div
          class="footer-right"
          *ngIf="hasDelta"
          [class.delta-up]="delta > 0"
          [class.delta-down]="delta < 0"
        >
          <span class="delta-arrow" aria-hidden="true">{{
            delta >= 0 ? '\u25B2' : '\u25BC'
          }}</span>
          <span class="delta-value">{{ deltaLabel }}</span>
          <span class="delta-suffix">vs ref.</span>
        </div>
      </footer>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .line-card {
        position: relative;
        border-radius: 1rem;
        border: 1px solid var(--dash-border, rgba(0, 0, 0, 0.12));
        background: linear-gradient(
          180deg,
          var(--dash-surface, #ffffff) 0%,
          color-mix(in srgb, var(--dash-surface-soft, #f8fbff) 92%, #ffffff 8%) 100%
        );
        box-shadow: var(--dash-shadow-soft, 0 12px 30px rgba(23, 35, 77, 0.06));
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        padding: 0.86rem;
        padding-top: calc(0.86rem + 3px);
        transition: transform 180ms ease, box-shadow 180ms ease,
          border-color 180ms ease;
        animation: lineCardEnter 360ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        animation-delay: calc(var(--card-index, 0) * 60ms);
      }

      .line-card:hover {
        transform: translateY(-2px);
        border-color: color-mix(in srgb, var(--accent, #10b981) 40%, var(--dash-border, rgba(0, 0, 0, 0.12)));
        box-shadow: 0 24px 34px rgba(15, 23, 42, 0.13);
      }

      .accent-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--accent, #10b981);
      }

      .line-card-header {
        display: flex;
        flex-direction: column;
        gap: 0.42rem;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }

      .code-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.36rem;
        border-radius: 999px;
        line-height: 1;
        font-size: 0.7rem;
        font-weight: 800;
        padding: 0.34rem 0.56rem 0.34rem 0.42rem;
        color: var(--accent, #0b7e5a);
        background: color-mix(in srgb, var(--accent, #10b981) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent, #10b981) 36%, var(--dash-border, rgba(0, 0, 0, 0.1)));
        letter-spacing: 0.02em;
      }

      .code-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: var(--accent, #10b981);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent, #10b981) 22%, transparent);
      }

      .category-pill {
        border-radius: 999px;
        line-height: 1;
        font-size: 0.7rem;
        font-weight: 800;
        padding: 0.34rem 0.56rem;
        color: var(--dash-text-muted, #5f6d92);
        background: color-mix(in srgb, var(--dash-surface, #ffffff) 82%, #f5f8ff 18%);
        border: 1px solid var(--dash-border, rgba(0, 0, 0, 0.1));
      }

      :host-context(html.dark) .category-pill {
        color: #f7fbff;
        background: color-mix(in srgb, #223570 78%, #101d4d 22%);
        border-color: color-mix(in srgb, #7f9bff 36%, var(--dash-border, rgba(255, 255, 255, 0.1)));
      }

      :host-context(html.dark) .code-pill {
        color: #ffffff;
      }

      .card-title {
        color: var(--dash-text, #17234d);
        font-size: 0.93rem;
        line-height: 1.3;
        font-weight: 800;
        letter-spacing: -0.01em;
        margin: 0;
        min-height: 1.2rem;
      }

      .chart-wrap {
        position: relative;
        height: 180px;
        min-height: 180px;
      }

      .chart-wrap canvas {
        display: block;
      }

      .chart-empty {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--dash-text-muted, #5f6d92);
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--dash-surface-soft, #f8fbff) 60%, transparent) 0%,
          transparent 100%
        );
      }

      .line-card-footer {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 0.6rem;
        padding-top: 0.18rem;
        border-top: 1px solid color-mix(in srgb, var(--dash-border, rgba(0, 0, 0, 0.1)) 70%, transparent);
        padding-block: 0.42rem 0;
      }

      .footer-left {
        display: flex;
        flex-direction: column;
        gap: 0.05rem;
      }

      .last-value {
        font-size: 1.14rem;
        line-height: 1.1;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--dash-text, #17234d);
      }

      .last-label {
        font-size: 0.7rem;
        color: var(--dash-text-muted, #5f6d92);
        font-weight: 700;
      }

      .footer-right {
        display: inline-flex;
        align-items: center;
        gap: 0.32rem;
        font-size: 0.78rem;
        font-weight: 800;
        line-height: 1;
        padding: 0.36rem 0.56rem;
        border-radius: 999px;
        background: color-mix(in srgb, var(--dash-surface, #ffffff) 86%, transparent);
        border: 1px solid var(--dash-border, rgba(0, 0, 0, 0.1));
        color: var(--dash-text-muted, #5f6d92);
      }

      .footer-right.delta-up {
        color: #15a06a;
        background: color-mix(in srgb, #15a06a 12%, transparent);
        border-color: color-mix(in srgb, #15a06a 30%, var(--dash-border, rgba(0, 0, 0, 0.1)));
      }

      .footer-right.delta-down {
        color: #d83a4a;
        background: color-mix(in srgb, #d83a4a 12%, transparent);
        border-color: color-mix(in srgb, #d83a4a 30%, var(--dash-border, rgba(0, 0, 0, 0.1)));
      }

      .delta-arrow {
        font-size: 0.66rem;
      }

      .delta-suffix {
        font-weight: 600;
        opacity: 0.7;
      }

      @keyframes lineCardEnter {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 640px) {
        .line-card {
          border-radius: 0.88rem;
          padding: 0.78rem;
          padding-top: calc(0.78rem + 3px);
        }
      }
    `,
  ],
})
export class RatioLineChartCardComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input({ required: true }) code = '';
  @Input({ required: true }) label = '';
  @Input({ required: true }) category = '';
  @Input({ required: true }) data: Record<string, number> = {};
  @Input() index = 0;

  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartWrap') chartWrapRef?: ElementRef<HTMLDivElement>;

  private chart: Chart | null = null;
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private host = inject(ElementRef<HTMLElement>);
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private viewReady = false;

  points: { date: string; value: number }[] = [];

  accent = '#10b981';
  accentSoft = 'rgba(16, 185, 129, 0.20)';

  get hasData(): boolean {
    return this.points.length > 0;
  }

  get hasDelta(): boolean {
    return this.points.length >= 2 && Number.isFinite(this.delta);
  }

  get lastValueLabel(): string {
    if (!this.hasData) return '\u2014';
    return this.formatValue(this.points[this.points.length - 1].value);
  }

  get delta(): number {
    if (this.points.length < 2) return 0;
    const first = this.points[0].value;
    const last = this.points[this.points.length - 1].value;
    if (!Number.isFinite(first) || first === 0) return 0;
    return ((last - first) / Math.abs(first)) * 100;
  }

  get deltaLabel(): string {
    const sign = this.delta >= 0 ? '+' : '';
    return `${sign}${this.delta.toFixed(2)}%`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['code'] || changes['data'] || changes['category']) {
      this.points = this.derivePoints(this.data);
      this.applyAccent(this.code, this.category);
    }

    if (this.viewReady) {
      this.scheduleChartRebuild();
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.points = this.derivePoints(this.data);
    this.applyAccent(this.code, this.category);
    this.scheduleChartRebuild();
  }

  ngOnDestroy(): void {
    this.cancelPending();
    this.destroyChart();
  }

  /**
   * Double-RAF + setTimeout fallback to guarantee the browser has completed
   * at least one full layout pass before we read container dimensions.
   *
   * Sequence: rAF → rAF → rebuildChart()
   * If rAF reads zero dimensions, a 80ms setTimeout retries once more.
   */
  private scheduleChartRebuild(): void {
    this.cancelPending();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.viewReady) return;
        const ok = this.rebuildChart();
        if (!ok) {
          this.pendingTimer = setTimeout(() => {
            this.pendingTimer = null;
            this.rebuildChart();
          }, 80);
        }
      });
    });
  }

  private cancelPending(): void {
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }

  /* ============================== Internals ============================== */

  private derivePoints(
    data: Record<string, number> | null | undefined
  ): { date: string; value: number }[] {
    if (!data) return [];
    return Object.entries(data)
      .filter(([, v]) => Number.isFinite(v))
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Creates the Chart.js instance.
   * Returns true if the chart was successfully created, false if the container
   * had zero dimensions (meaning we need to retry).
   */
  private rebuildChart(): boolean {
    this.destroyChart();
    const canvas = this.canvasRef?.nativeElement;
    const wrap = this.chartWrapRef?.nativeElement;
    if (!canvas || !wrap || !this.hasData) return false;

    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w < 10 || h < 10) return false;

    // Set the canvas HTML attributes to the container's resolved pixel size.
    // This gives Chart.js a non-zero initial size before it attaches its
    // own ResizeObserver.
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const accent = this.accent;
    const muted = this.cssVar('--dash-text-muted', '#5f6d92');
    const text = this.cssVar('--dash-text', '#17234d');
    const surface = this.cssVar('--dash-surface', '#ffffff');
    const border = this.cssVar('--dash-border', 'rgba(0,0,0,0.12)');
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(15,23,42,0.06)';

    const labels = this.points.map((p) => this.formatDateLabel(p.date));
    const values = this.points.map((p) => p.value);

    // Compute explicit y-axis bounds so Chart.js never collapses the scale
    // to zero range (which kills both the fill gradient and visual clarity).
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const dataRange = dataMax - dataMin;
    const isFlat =
      dataRange < Math.max(Math.abs(dataMax) * 0.05, 0.0001);
    const yPadding = isFlat
      ? Math.max(Math.abs(dataMax || dataMin) * 0.15, 0.001)
      : dataRange * 0.1;
    const scaleMin = dataMin - yPadding;
    const scaleMax = dataMax + yPadding;

    const dataset: ChartDataset<'line'> = {
      data: [...values],
      borderColor: accent,
      borderWidth: 2.5,
      tension: 0.4,
      fill: { target: { value: scaleMin } },
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: accent,
      pointBorderColor: surface,
      pointBorderWidth: 1.5,
      pointHoverBackgroundColor: accent,
      pointHoverBorderColor: surface,
      pointHoverBorderWidth: 2,
      backgroundColor: (ctx: ScriptableContext<'line'>) => {
        const area = ctx.chart.chartArea;
        if (!area) return this.accentSoft;
        const { top, bottom } = area;
        const gradientHeight = Math.max(bottom - top, 40);
        const grad = ctx.chart.ctx.createLinearGradient(0, top, 0, top + gradientHeight);
        grad.addColorStop(0, this.hexToRgba(accent, 0.22));
        grad.addColorStop(1, this.hexToRgba(accent, 0));
        return grad;
      },
    };

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: { labels: [...labels], datasets: [dataset] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutCubic' },
        layout: { padding: { top: 6, right: 4, bottom: 0, left: 0 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#0f1830' : '#ffffff',
            titleColor: text,
            bodyColor: text,
            borderColor: border,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            titleFont: { weight: 700, size: 12 },
            bodyFont: { weight: 600, size: 12 },
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const idx = items[0].dataIndex;
                return this.formatDateLabelFull(this.points[idx].date);
              },
              label: (item) => this.formatValue(Number(item.parsed.y)),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: muted,
              font: { size: 10, weight: 600 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7,
              padding: 4,
            },
          },
          y: {
            min: scaleMin,
            max: scaleMax,
            grid: {
              color: gridColor,
              lineWidth: 0.5,
            },
            border: { display: false },
            ticks: {
              color: muted,
              font: { size: 10, weight: 600 },
              maxTicksLimit: 4,
              padding: 6,
              callback: (val) => this.formatValue(Number(val)),
            },
          },
        },
      },
    };

    this.zone.runOutsideAngular(() => {
      this.chart = new Chart(canvas, config);
    });

    // Force full re-evaluation of all scriptables (including backgroundColor
    // gradient) now that chartArea is valid after the first render pass.
    requestAnimationFrame(() => {
      if (this.chart) {
        this.chart.update();
      }
    });

    return true;
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private cssVar(name: string, fallback: string): string {
    const value = getComputedStyle(this.host.nativeElement)
      .getPropertyValue(name)
      .trim();
    return value || fallback;
  }

  /* ============================== Color resolution ============================== */

  private static readonly PALETTE = {
    capital: '#01b574',
    credit: '#e24b4a',
    coverage: '#f59e0b',
    concentration: '#6366f1',
  };

  private static readonly FALLBACK_CYCLE = [
    '#01b574',
    '#6366f1',
    '#f59e0b',
    '#e24b4a',
    '#0ea5e9',
    '#a855f7',
    '#14b8a6',
    '#ec4899',
  ];

  private applyAccent(code: string, category: string): void {
    this.accent = this.resolveAccent(code, category);
    this.accentSoft = this.hexToRgba(this.accent, 0.2);
  }

  private resolveAccent(code: string, category: string): string {
    const c = (code ?? '').toUpperCase();
    const cat = (category ?? '').toLowerCase();

    if (/^(RCET|RS|RCT|RTC|CET)/.test(c) || /\b(capital|solvabil|fonds propres)\b/.test(cat)) {
      return RatioLineChartCardComponent.PALETTE.capital;
    }
    if (/^(RNPL|NPL|TCD|RCD)/.test(c) || /(credit|creanc|impay|defaut|douteu)/.test(cat)) {
      return RatioLineChartCardComponent.PALETTE.credit;
    }
    if (/^(TPCS|RC\b|COUV|CV)/.test(c) || /(couvert|expos|provision)/.test(cat)) {
      return RatioLineChartCardComponent.PALETTE.coverage;
    }
    if (/(CONC|LIMIT)/.test(c) || /(concentr|limit)/.test(cat)) {
      return RatioLineChartCardComponent.PALETTE.concentration;
    }

    const hash = this.hashString(code || category || 'default');
    const palette = RatioLineChartCardComponent.FALLBACK_CYCLE;
    return palette[hash % palette.length];
  }

  private hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
    const value =
      normalized.length === 3
        ? normalized
            .split('')
            .map((ch) => ch + ch)
            .join('')
        : normalized;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /* ============================== Formatters ============================== */

  private static readonly MONTH_FR_SHORT = [
    'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec',
  ];

  private static readonly MONTH_FR_LONG = [
    'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
  ];

  private formatDateLabel(iso: string): string {
    const parts = iso.split('-');
    if (parts.length < 2) return iso;
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[0], 10);
    if (!Number.isFinite(month) || !Number.isFinite(year)) return iso;
    const m = RatioLineChartCardComponent.MONTH_FR_SHORT[month - 1] ?? parts[1];
    const yy = String(year).slice(-2);
    return `${m} ${yy}`;
  }

  private formatDateLabelFull(iso: string): string {
    const parts = iso.split('-');
    if (parts.length < 3) return iso;
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[0], 10);
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return iso;
    const m = RatioLineChartCardComponent.MONTH_FR_LONG[month - 1] ?? parts[1];
    return `${day} ${m} ${year}`;
  }

  private formatValue(value: number): string {
    if (!Number.isFinite(value)) return '\u2014';
    const abs = Math.abs(value);
    const fractionDigits = abs > 0 && abs < 1 ? 4 : 2;
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  }
}
