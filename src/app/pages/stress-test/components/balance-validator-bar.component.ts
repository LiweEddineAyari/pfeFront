import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface BalanceValidatorState {
  positive: number;
  negative: number;
  difference: number;
  /** True when |positive - negative| < epsilon and at least one row has value. */
  balanced: boolean;
  /** True when at least one row uses SET (cannot be statically balance-checked). */
  hasSetOperation: boolean;
  /** Total adjustment rows currently configured. */
  rowCount: number;
}

@Component({
  selector: 'app-balance-validator-bar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar" [class.is-empty]="state.rowCount === 0">
      <div class="bar-left">
        <span class="bar-icon">
          <lucide-icon name="scale" [size]="18" [strokeWidth]="2.6"></lucide-icon>
        </span>
        <div class="bar-text">
          <p class="bar-title">
            <ng-container *ngIf="state.rowCount === 0">Aucun ajustement configure</ng-container>
            <ng-container *ngIf="state.rowCount > 0">
              Totaux en cours de saisie
              <span class="bar-hint">· verification effectuee par le serveur au lancement</span>
            </ng-container>
          </p>
          <p class="bar-sub">
            <ng-container *ngIf="state.rowCount === 0">
              Ajoutez des lignes ADD et SUBTRACT. Le moteur verifiera l'equilibre apres expansion des filtres.
            </ng-container>
            <ng-container *ngIf="state.rowCount > 0">
              {{ state.rowCount }} ajustement<ng-container *ngIf="state.rowCount > 1">s</ng-container>.
              <ng-container *ngIf="state.hasSetOperation"> SET present (ne participe pas au calcul d'equilibre).</ng-container>
            </ng-container>
          </p>
        </div>
      </div>

      <div class="bar-right">
        <div class="metric metric-positive">
          <span class="metric-label">Positifs</span>
          <span class="metric-value">+{{ state.positive | number: '1.2-6' }}</span>
        </div>
        <div class="metric metric-negative">
          <span class="metric-label">Negatifs</span>
          <span class="metric-value">-{{ state.negative | number: '1.2-6' }}</span>
        </div>
        <div class="metric metric-diff" [class.is-zero]="state.balanced">
          <span class="metric-label">Difference</span>
          <span class="metric-value">
            <ng-container *ngIf="state.difference === 0">0</ng-container>
            <ng-container *ngIf="state.difference !== 0">
              {{ state.difference > 0 ? '+' : '' }}{{ state.difference | number: '1.2-6' }}
            </ng-container>
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: sticky;
        top: 130px;
        z-index: 30;
      }

      .bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 16px;
        border-radius: 14px;
        border: 1.5px solid var(--color-border);
        background: var(--bg-card);
        box-shadow: 0 6px 24px rgba(17, 28, 68, 0.08);
        transition: 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
        backdrop-filter: blur(10px);
      }

      /* Neutral only — no red/green in the config zone; server validates on run */

      .bar-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .bar-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(1, 181, 116, 0.12);
        color: #01b574;
        flex-shrink: 0;
      }

      .bar.is-empty .bar-icon {
        background: rgba(163, 174, 208, 0.16);
        color: var(--text-secondary);
      }

      .bar-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .bar-title {
        margin: 0;
        font-size: 14px;
        font-weight: 800;
        color: var(--text-primary);
        line-height: 1.2;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .bar-hint {
        font-size: 11px;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .bar-sub {
        margin: 3px 0 0;
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.35;
      }

      .bar-right {
        display: flex;
        align-items: stretch;
        gap: 8px;
        flex-shrink: 0;
      }

      .metric {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        padding: 6px 10px;
        border-radius: 10px;
        border: 1px solid var(--color-border);
        background: rgba(255, 255, 255, 0.55);
        min-width: 92px;
      }

      :host-context(.dark) .metric {
        background: rgba(11, 20, 55, 0.55);
      }

      .metric-label {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.10em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }

      .metric-value {
        font-size: 14px;
        font-weight: 800;
        font-feature-settings: 'tnum' 1;
        margin-top: 2px;
        color: var(--text-primary);
      }

      .metric-positive .metric-value {
        color: #01b574;
      }

      .metric-negative .metric-value {
        color: #ef4444;
      }

      .metric-diff.is-zero .metric-value { color: var(--text-primary); }

      @media (max-width: 880px) {
        :host {
          position: static;
        }

        .bar {
          flex-direction: column;
          align-items: stretch;
        }

        .bar-right {
          width: 100%;
          justify-content: space-between;
        }

        .metric {
          flex: 1;
          align-items: center;
        }
      }
    `,
  ],
})
export class BalanceValidatorBarComponent {
  @Input() state: BalanceValidatorState = {
    positive: 0,
    negative: 0,
    difference: 0,
    balanced: false,
    hasSetOperation: false,
    rowCount: 0,
  };
}
