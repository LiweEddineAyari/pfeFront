import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StressTestMethod } from '../../../core/models/stress-test.model';

interface MethodCard {
  id: StressTestMethod;
  icon: string;
  badge: string;
  title: string;
  description: string;
  hint: string;
}

const METHOD_CARDS: MethodCard[] = [
  {
    id: 'BALANCE',
    icon: 'scale',
    badge: 'Methode BALANCE',
    title: 'Ajustement de balance',
    description: 'Simule des modifications ligne par ligne sur les soldes (SET, ADD, SUBTRACT) avec contrainte d\'equilibre.',
    hint: 'Idéal pour les chocs de portefeuille',
  },
  {
    id: 'PARAMETER',
    icon: 'sliders-horizontal',
    badge: 'Methode PARAMETER',
    title: 'Override de parametre',
    description: 'Surcharge directement les parametres analytiques (MULTIPLY, ADD, REPLACE, MODIFY_FORMULA).',
    hint: 'Idéal pour les sensibilités macro',
  },
];

@Component({
  selector: 'app-stress-method-selector',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid">
      <button
        *ngFor="let card of cards; trackBy: trackById"
        type="button"
        class="method-card"
        [class.is-selected]="card.id === value"
        [attr.aria-pressed]="card.id === value"
        (click)="onSelect(card.id)"
      >
        <span class="card-icon" [class.is-selected]="card.id === value">
          <lucide-icon [name]="card.icon" [size]="22" [strokeWidth]="2.6"></lucide-icon>
        </span>

        <span class="card-body">
          <span class="card-badge">{{ card.badge }}</span>
          <span class="card-title">{{ card.title }}</span>
          <span class="card-desc">{{ card.description }}</span>
          <span class="card-hint">
            <lucide-icon name="sparkles" [size]="12" [strokeWidth]="2.8"></lucide-icon>
            {{ card.hint }}
          </span>
        </span>

        <span class="card-checkbox" [class.is-selected]="card.id === value" aria-hidden="true">
          <lucide-icon *ngIf="card.id === value" name="check" [size]="14" [strokeWidth]="3.2"></lucide-icon>
        </span>
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      @media (max-width: 760px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }

      .method-card {
        position: relative;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: flex-start;
        gap: 16px;
        padding: 18px 18px 18px 18px;
        border-radius: 18px;
        border: 1.5px solid var(--color-border);
        background: var(--bg-card);
        text-align: left;
        cursor: pointer;
        transition: 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
        overflow: hidden;
      }

      .method-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(
          120% 80% at 0% 0%,
          rgba(1, 181, 116, 0.0),
          transparent 60%
        );
        opacity: 0;
        transition: opacity 220ms ease;
        pointer-events: none;
      }

      .method-card:hover {
        border-color: rgba(1, 181, 116, 0.34);
        transform: translateY(-2px);
        box-shadow: 0 18px 36px rgba(1, 181, 116, 0.08);
      }

      .method-card.is-selected {
        border-color: rgba(1, 181, 116, 0.55);
        background: linear-gradient(
            135deg,
            rgba(1, 181, 116, 0.10),
            rgba(1, 181, 116, 0.02) 60%
          ),
          var(--bg-card);
        box-shadow: 0 18px 36px rgba(1, 181, 116, 0.18),
          inset 0 0 0 1px rgba(1, 181, 116, 0.2);
      }

      .method-card.is-selected::before {
        opacity: 1;
        background: radial-gradient(
          120% 80% at 0% 0%,
          rgba(1, 181, 116, 0.16),
          transparent 60%
        );
      }

      .card-icon {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(1, 181, 116, 0.10);
        color: #01b574;
        border: 1px solid rgba(1, 181, 116, 0.22);
        transition: 220ms ease;
      }

      .card-icon.is-selected {
        background: linear-gradient(135deg, #01b574, #009e65);
        color: #ffffff;
        border-color: rgba(1, 181, 116, 0.5);
        box-shadow: 0 10px 22px rgba(1, 181, 116, 0.32),
          inset 0 1px 0 rgba(255, 255, 255, 0.4);
      }

      :host-context(.dark) .card-icon:not(.is-selected) {
        background: rgba(1, 181, 116, 0.18);
        border-color: rgba(1, 181, 116, 0.32);
      }

      .card-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .card-badge {
        display: inline-flex;
        align-items: center;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }

      .method-card.is-selected .card-badge {
        color: #01b574;
      }

      .card-title {
        font-size: 18px;
        font-weight: 800;
        color: var(--text-primary);
        line-height: 1.15;
        letter-spacing: -0.005em;
      }

      .card-desc {
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.45;
        margin-top: 4px;
      }

      .card-hint {
        margin-top: 8px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        color: #01b574;
        background: rgba(1, 181, 116, 0.10);
        border: 1px solid rgba(1, 181, 116, 0.22);
        padding: 4px 8px;
        border-radius: 999px;
        align-self: flex-start;
      }

      .card-checkbox {
        width: 22px;
        height: 22px;
        border-radius: 8px;
        border: 1.5px solid var(--color-border);
        background: var(--bg-card);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        transition: 220ms ease;
        flex-shrink: 0;
      }

      .card-checkbox.is-selected {
        background: linear-gradient(135deg, #01b574, #009e65);
        border-color: rgba(1, 181, 116, 0.5);
        box-shadow: 0 4px 12px rgba(1, 181, 116, 0.4);
      }
    `,
  ],
})
export class StressMethodSelectorComponent {
  @Input() value: StressTestMethod = 'BALANCE';

  @Output() valueChange = new EventEmitter<StressTestMethod>();

  readonly cards = METHOD_CARDS;

  onSelect(id: StressTestMethod): void {
    if (id !== this.value) {
      this.valueChange.emit(id);
    }
  }

  trackById(_: number, card: MethodCard): string {
    return card.id;
  }
}
