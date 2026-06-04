import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

interface UnbalancedTotals {
  positif_total_serveur?: string | number;
  negatif_total_serveur?: string | number;
  difference?: string | number;
}

interface UnbalancedAction {
  type: 'ADD' | 'SUBTRACT' | string;
  label: string;
  field: string;
  filter: string;
  valeur_actuelle: string | number;
  valeur_suggeree: string | number;
  cta?: string;
}

export interface UnbalancedSimulationResult {
  title: string;
  code: string;
  message: string;
  totals: UnbalancedTotals;
  hint?: string;
  actions: UnbalancedAction[];
  formula?: string;
}

@Component({
  selector: 'app-stress-unbalanced-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="usc-root">
      <!-- ── Header ── -->
      <div class="usc-header">
        <div class="usc-warn-icon">
          <lucide-icon name="alert-triangle" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </div>
        <div class="usc-title-wrap">
          <div class="usc-title-row">
            <h3 class="usc-title">{{ data.title }}</h3>
            <span class="usc-code-badge">{{ data.code }}</span>
          </div>
          <p class="usc-subtitle">{{ data.message }}</p>
        </div>
      </div>

      <!-- ── Totals ── -->
      <div class="usc-totals">
        <div class="usc-total-cell">
          <span class="usc-total-label">Positif total (serveur)</span>
          <span class="usc-total-value usc-positive">{{ formatNumber(data.totals.positif_total_serveur) }}</span>
        </div>

        <span class="usc-operator">−</span>

        <div class="usc-total-cell">
          <span class="usc-total-label">Negatif total (serveur)</span>
          <span class="usc-total-value usc-negative">{{ formatNumber(data.totals.negatif_total_serveur) }}</span>
        </div>

        <div class="usc-total-cell usc-total-diff">
          <span class="usc-total-label">Difference</span>
          <span class="usc-total-value usc-negative">{{ formatNumber(data.totals.difference) }}</span>
        </div>
      </div>

      <!-- ── Hint ── -->
      <div *ngIf="data.hint" class="usc-hint">
        <lucide-icon name="lightbulb" [size]="13" [strokeWidth]="2.5"></lucide-icon>
        <span>{{ data.hint }}</span>
      </div>

      <!-- ── Actions ── -->
      <div class="usc-actions">
        <div
          *ngFor="let action of data.actions; let i = index; trackBy: trackByIdx"
          class="usc-action"
          [class.usc-action-add]="action.type === 'ADD'"
          [class.usc-action-sub]="action.type === 'SUBTRACT'"
        >
          <!-- Action header -->
          <div class="usc-action-head">
            <span
              class="usc-action-badge"
              [class.usc-badge-add]="action.type === 'ADD'"
              [class.usc-badge-sub]="action.type === 'SUBTRACT'"
            >
              {{ action.type }}
            </span>
            <span class="usc-action-label">{{ action.label }}</span>
          </div>

          <!-- Action body -->
          <div class="usc-action-body">
            <div class="usc-action-info">
              <div class="usc-meta-row">
                <span class="usc-field-pill">{{ action.field }}</span>
                <span class="usc-filter">{{ action.filter }}</span>
              </div>

              <div class="usc-values">
                <div class="usc-value-col">
                  <span class="usc-value-label">Valeur actuelle</span>
                  <span class="usc-value usc-value-current">{{ formatNumber(action.valeur_actuelle) }}</span>
                </div>

                <lucide-icon
                  name="arrow-right"
                  [size]="14"
                  [strokeWidth]="2.5"
                  class="usc-arrow"
                ></lucide-icon>

                <div class="usc-value-col">
                  <span class="usc-value-label">Valeur suggeree</span>
                  <span class="usc-value usc-value-suggested">{{ formatNumber(action.valeur_suggeree) }}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="usc-copy-btn"
              [class.usc-copied]="copiedIdx() === i"
              (click)="copyValue(action.valeur_suggeree, i)"
              [attr.aria-label]="'Copier ' + action.valeur_suggeree"
            >
              <lucide-icon
                [name]="copiedIdx() === i ? 'check' : 'copy'"
                [size]="12"
                [strokeWidth]="2.75"
              ></lucide-icon>
              <span>{{ copiedIdx() === i ? 'Copie' : (action.cta || 'Copier') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Formula footer ── -->
      <div *ngIf="data.formula" class="usc-formula">
        <lucide-icon name="info" [size]="11" [strokeWidth]="2.5"></lucide-icon>
        <span class="usc-formula-label">Formule :</span>
        <code class="usc-formula-code">{{ formulaCode }}</code>
        <span class="usc-formula-text">{{ formulaText }}</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .usc-root {
      position: relative;
      width: 100%;
      border-radius: 14px;
      padding: 14px 16px 14px 16px;
      background: linear-gradient(
        180deg,
        rgba(239, 68, 68, 0.04) 0%,
        rgba(239, 68, 68, 0.015) 100%
      );
      border: 1.5px solid rgba(239, 68, 68, 0.28);
      box-shadow:
        0 1px 2px rgba(239, 68, 68, 0.05),
        0 8px 24px rgba(239, 68, 68, 0.06);
      animation: uscIn 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    :host-context(html.dark) .usc-root {
      background: linear-gradient(
        180deg,
        rgba(239, 68, 68, 0.10) 0%,
        rgba(239, 68, 68, 0.04) 100%
      );
      border-color: rgba(239, 68, 68, 0.35);
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.04) inset,
        0 10px 32px rgba(0, 0, 0, 0.42);
    }

    @keyframes uscIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    .usc-header {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      margin-bottom: 12px;
    }
    .usc-warn-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.22);
    }
    :host-context(html.dark) .usc-warn-icon {
      background: rgba(239, 68, 68, 0.18);
      box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.4);
    }
    .usc-title-wrap { flex: 1; min-width: 0; }
    .usc-title-row {
      display: flex;
      align-items: center;
      gap: 9px;
      flex-wrap: wrap;
    }
    .usc-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.005em;
      color: var(--text-primary);
    }
    .usc-code-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      font-size: 10px;
      font-weight: 800;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      letter-spacing: 0.05em;
      border: 1px solid rgba(239, 68, 68, 0.28);
    }
    :host-context(html.dark) .usc-code-badge {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.42);
    }
    .usc-subtitle {
      margin: 3px 0 0;
      font-size: 11.5px;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    /* ── Totals ── */
    .usc-totals {
      display: flex;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 14px 22px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.025);
      border: 1px solid var(--color-border);
      margin-bottom: 12px;
    }
    :host-context(html.dark) .usc-totals {
      background: rgba(255, 255, 255, 0.025);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .usc-total-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 120px;
    }
    .usc-total-diff { margin-left: auto; }
    .usc-total-label {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
      opacity: 0.85;
    }
    .usc-total-value {
      font-size: 18px;
      font-weight: 700;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      letter-spacing: 0.01em;
      line-height: 1.1;
    }
    .usc-positive { color: #01b574; }
    .usc-negative { color: #ef4444; }
    :host-context(html.dark) .usc-positive { color: #2edd9a; }
    :host-context(html.dark) .usc-negative { color: #fca5a5; }
    .usc-operator {
      font-size: 22px;
      font-weight: 300;
      color: var(--text-secondary);
      opacity: 0.6;
      padding-bottom: 1px;
    }

    /* ── Hint ── */
    .usc-hint {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 9px;
      background: rgba(245, 158, 11, 0.07);
      border: 1px dashed rgba(245, 158, 11, 0.42);
      color: var(--text-primary);
      font-size: 11.5px;
      line-height: 1.45;
      margin-bottom: 12px;
    }
    :host-context(html.dark) .usc-hint {
      background: rgba(245, 158, 11, 0.10);
      border-color: rgba(245, 158, 11, 0.42);
    }
    .usc-hint lucide-icon {
      color: #f59e0b;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* ── Actions ── */
    .usc-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .usc-action {
      border-radius: 11px;
      background: var(--bg-card);
      border: 1px solid var(--color-border);
      overflow: hidden;
      transition: all 200ms ease;
    }
    :host-context(html.dark) .usc-action {
      background: rgba(255, 255, 255, 0.02);
    }
    .usc-action:hover {
      border-color: rgba(1, 181, 116, 0.4);
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
    }
    :host-context(html.dark) .usc-action:hover {
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
    }

    .usc-action-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      background: rgba(15, 23, 42, 0.02);
      border-bottom: 1px solid var(--color-border);
    }
    :host-context(html.dark) .usc-action-head {
      background: rgba(255, 255, 255, 0.02);
      border-bottom-color: rgba(255, 255, 255, 0.06);
    }

    .usc-action-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
    }
    .usc-badge-add {
      background: rgba(1, 181, 116, 0.12);
      color: #01915d;
      border: 1px solid rgba(1, 181, 116, 0.32);
    }
    :host-context(html.dark) .usc-badge-add {
      background: rgba(1, 181, 116, 0.18);
      color: #2edd9a;
      border-color: rgba(1, 181, 116, 0.45);
    }
    .usc-badge-sub {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
      border: 1px solid rgba(239, 68, 68, 0.32);
    }
    :host-context(html.dark) .usc-badge-sub {
      background: rgba(239, 68, 68, 0.18);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.45);
    }

    .usc-action-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: 0.005em;
    }

    .usc-action-body {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      flex-wrap: wrap;
    }
    .usc-action-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .usc-meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .usc-field-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 700;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      background: rgba(99, 102, 241, 0.10);
      color: #6366f1;
      border: 1px solid rgba(99, 102, 241, 0.25);
    }
    :host-context(html.dark) .usc-field-pill {
      background: rgba(99, 102, 241, 0.18);
      color: #a5b4fc;
      border-color: rgba(99, 102, 241, 0.4);
    }
    .usc-filter {
      font-size: 10.5px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      color: var(--text-secondary);
      letter-spacing: 0.01em;
    }

    .usc-values {
      display: flex;
      align-items: flex-end;
      gap: 10px;
    }
    .usc-value-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .usc-value-label {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
      opacity: 0.85;
    }
    .usc-value {
      font-size: 13.5px;
      font-weight: 700;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      letter-spacing: 0.01em;
      line-height: 1.15;
    }
    .usc-value-current { color: var(--text-primary); }
    .usc-value-suggested {
      color: #01b574;
      text-shadow: 0 0 8px rgba(1, 181, 116, 0.15);
    }
    :host-context(html.dark) .usc-value-suggested {
      color: #2edd9a;
      text-shadow: 0 0 10px rgba(46, 221, 154, 0.22);
    }
    .usc-arrow {
      color: #01b574;
      margin-bottom: 2px;
      opacity: 0.85;
    }
    :host-context(html.dark) .usc-arrow { color: #2edd9a; }

    /* ── Copy button ── */
    .usc-copy-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 13px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
      border: 1.5px solid rgba(1, 181, 116, 0.42);
      background: rgba(1, 181, 116, 0.08);
      color: #01915d;
      transition: all 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    :host-context(html.dark) .usc-copy-btn {
      background: rgba(1, 181, 116, 0.14);
      color: #2edd9a;
      border-color: rgba(1, 181, 116, 0.5);
    }
    .usc-copy-btn:hover {
      background: linear-gradient(135deg, #01b574, #0a8f63);
      color: white;
      border-color: transparent;
      transform: translateY(-1px);
      box-shadow:
        0 4px 14px rgba(1, 181, 116, 0.42),
        0 0 0 3px rgba(1, 181, 116, 0.14);
    }
    .usc-copy-btn:active { transform: scale(0.96); }

    .usc-copy-btn.usc-copied {
      background: linear-gradient(135deg, #01b574, #0a8f63);
      color: white;
      border-color: transparent;
      box-shadow: 0 4px 14px rgba(1, 181, 116, 0.42);
      animation: copiedPop 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes copiedPop {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.06); }
      100% { transform: scale(1); }
    }

    /* ── Formula footer ── */
    .usc-formula {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 12px;
      padding-top: 11px;
      border-top: 1px dashed var(--color-border);
      font-size: 10.5px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .usc-formula lucide-icon {
      color: var(--text-secondary);
      opacity: 0.7;
      flex-shrink: 0;
    }
    .usc-formula-label {
      font-weight: 700;
      opacity: 0.8;
    }
    .usc-formula-code {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 5px;
      background: rgba(15, 23, 42, 0.05);
      border: 1px solid var(--color-border);
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 10px;
      color: var(--text-primary);
      letter-spacing: 0.01em;
    }
    :host-context(html.dark) .usc-formula-code {
      background: rgba(255, 255, 255, 0.04);
    }
    .usc-formula-text { opacity: 0.85; }
  `],
})
export class StressUnbalancedCardComponent {
  @Input({ required: true }) data!: UnbalancedSimulationResult;

  copiedIdx = signal<number | null>(null);
  private cdr = inject(ChangeDetectorRef);
  private resetTimer?: ReturnType<typeof setTimeout>;

  get formulaCode(): string {
    const f = this.data.formula ?? '';
    const dot = f.indexOf('.');
    if (dot === -1) return f.trim();
    return f.slice(0, dot).trim();
  }

  get formulaText(): string {
    const f = this.data.formula ?? '';
    const dot = f.indexOf('.');
    if (dot === -1) return '';
    return f.slice(dot + 1).trim();
  }

  formatNumber(value: string | number | undefined): string {
    if (value === undefined || value === null || value === '') return '—';
    const num = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(num)) return String(value);
    const abs = Math.abs(num);
    if (abs !== 0 && abs < 0.01) return num.toString();
    return num.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async copyValue(value: string | number, idx: number): Promise<void> {
    const text = String(value);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
    this.copiedIdx.set(idx);
    this.cdr.markForCheck();
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => {
      this.copiedIdx.set(null);
      this.cdr.markForCheck();
    }, 1800);
  }

  trackByIdx = (i: number) => i;
}
