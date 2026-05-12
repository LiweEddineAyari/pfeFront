import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DEFAULT_SUGGESTIONS, SuggestionPrompt } from '../../models/chat.models';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-root">

      <!-- Hero -->
      <div class="hero">
        <div class="hero-icon-wrap">
          <div class="hero-icon-glow"></div>
          <div class="hero-icon-ring"></div>
          <div class="hero-icon">
            <lucide-icon name="sparkles" [size]="30" [strokeWidth]="2"></lucide-icon>
          </div>
        </div>

        <h1 class="hero-title">
          FinanceGPT
          <span class="hero-beta">BETA</span>
        </h1>

        <p class="hero-sub">
          Votre assistant intelligent pour l'analyse des
          <span class="accent">ratios prudentiels</span>,
          des <span class="accent">seuils réglementaires</span> et
          des <span class="accent">stress tests</span>.
        </p>
      </div>

      <!-- Suggestion chips -->
      <div class="suggestions">
        <button
          *ngFor="let s of suggestions; let i = index; trackBy: trackBy"
          type="button"
          class="suggestion"
          [ngClass]="getAccentClasses(s)"
          [style.animationDelay]="(220 + i * 60) + 'ms'"
          (click)="select.emit(s.prompt)"
        >
          <span class="suggestion-icon" [ngClass]="getIconBg(s)">
            <lucide-icon [name]="s.icon" [size]="13" [strokeWidth]="2.5"></lucide-icon>
          </span>
          <div class="suggestion-text">
            <span class="suggestion-label">{{ s.label }}</span>
            <span class="suggestion-prompt">{{ s.prompt }}</span>
          </div>
          <span class="suggestion-arrow">
            <lucide-icon name="arrow-right" [size]="12" [strokeWidth]="2.75"></lucide-icon>
          </span>
        </button>
      </div>

      <!-- Footer hint -->
      <p class="hint">
        <kbd>↵</kbd> Envoyer ·
        <kbd>⇧ ↵</kbd> Nouvelle ligne ·
        <kbd>Esc</kbd> Annuler le streaming
      </p>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .empty-root {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      padding: 16px 22px;
      animation: rootIn 360ms ease-out both;
    }
    @keyframes rootIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Hero ── */
    .hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 26px;
    }

    .hero-icon-wrap {
      position: relative;
      margin-bottom: 16px;
      animation: heroIconIn 480ms cubic-bezier(0.34, 1.4, 0.5, 1) both;
    }
    @keyframes heroIconIn {
      from { opacity: 0; transform: scale(0.6); }
      to   { opacity: 1; transform: scale(1); }
    }

    .hero-icon {
      position: relative;
      width: 70px;
      height: 70px;
      border-radius: 22px;
      background: linear-gradient(135deg, var(--color-primary) 0%, #0a8f63 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 14px 40px rgba(1, 181, 116, 0.42),
        inset 0 1px 0 rgba(255, 255, 255, 0.36);
      z-index: 2;
    }

    .hero-icon-glow {
      position: absolute;
      inset: -12px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(1, 181, 116, 0.55), transparent 65%);
      filter: blur(14px);
      animation: glowPulse 3.4s ease-in-out infinite;
      z-index: 0;
    }
    @keyframes glowPulse {
      0%, 100% { opacity: 0.55; transform: scale(1); }
      50%      { opacity: 0.9;  transform: scale(1.15); }
    }

    .hero-icon-ring {
      position: absolute;
      inset: -6px;
      border-radius: 28px;
      border: 1px solid rgba(1, 181, 116, 0.25);
      animation: ringSpin 6s linear infinite;
      z-index: 1;
    }
    @keyframes ringSpin {
      from { transform: rotate(0); }
      to   { transform: rotate(360deg); }
    }

    .hero-title {
      font-size: 30px;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.025em;
      margin: 0 0 10px 0;
      line-height: 1.05;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      animation: itemIn 460ms ease-out 100ms both;
    }
    .hero-title::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 26px;
      border-radius: 4px;
      background: linear-gradient(180deg, var(--color-primary), transparent);
    }

    .hero-beta {
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.18em;
      background: linear-gradient(135deg, var(--color-primary), #0a8f63);
      color: white;
      padding: 3px 7px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(1, 181, 116, 0.32);
      align-self: center;
      transform: translateY(-2px);
    }

    .hero-sub {
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--text-secondary);
      max-width: 460px;
      margin: 0;
      animation: itemIn 460ms ease-out 170ms both;
    }

    .accent {
      color: var(--color-primary);
      font-weight: 600;
    }

    @keyframes itemIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Suggestions ── */
    .suggestions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 22px;
    }
    @media (max-width: 600px) {
      .suggestions { grid-template-columns: 1fr; }
    }

    .suggestion {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--color-border);
      background: var(--bg-card);
      text-align: left;
      cursor: pointer;
      transition:
        transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
        box-shadow 180ms,
        border-color 180ms;
      overflow: hidden;
      opacity: 0;
      animation: suggestionIn 380ms ease-out both;
    }
    @keyframes suggestionIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .suggestion::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, var(--color-primary), transparent 50%);
      opacity: 0;
      transition: opacity 200ms ease;
      pointer-events: none;
    }

    .suggestion:hover {
      transform: translateY(-3px);
      border-color: var(--color-primary);
      box-shadow:
        0 10px 26px rgba(1, 181, 116, 0.14),
        0 2px 6px rgba(15, 23, 42, 0.04);
    }
    .suggestion:hover::before { opacity: 0.04; }
    .suggestion:hover .suggestion-arrow {
      transform: translateX(2px);
      opacity: 1;
    }
    .suggestion:hover .suggestion-icon { transform: scale(1.1) rotate(-3deg); }

    .suggestion-icon {
      flex-shrink: 0;
      width: 30px; height: 30px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(1, 181, 116, 0.10);
      color: var(--color-primary);
      transition: transform 220ms cubic-bezier(0.34, 1.4, 0.5, 1);
    }

    .suggestion-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .suggestion-label {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: 0.005em;
      line-height: 1.3;
    }
    .suggestion-prompt {
      font-size: 11.5px;
      color: var(--text-secondary);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .suggestion-arrow {
      flex-shrink: 0;
      color: var(--color-primary);
      opacity: 0;
      transform: translateX(-2px);
      transition: all 180ms ease;
    }

    /* ── Footer hint ── */
    .hint {
      text-align: center;
      font-size: 11px;
      color: var(--text-secondary);
      margin: 0;
      animation: itemIn 460ms ease-out 700ms both;
    }
    .hint kbd {
      display: inline-block;
      padding: 2px 6px;
      margin: 0 2px;
      border-radius: 5px;
      background: var(--bg-page);
      border: 1px solid var(--color-border);
      font-size: 10px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      color: var(--text-primary);
      font-weight: 600;
      box-shadow: 0 1px 0 var(--color-border);
    }
  `],
})
export class EmptyStateComponent {
  @Output() select = new EventEmitter<string>();

  suggestions = DEFAULT_SUGGESTIONS;

  getAccentClasses(_s: SuggestionPrompt): string {
    return '';
  }

  getIconBg(s: SuggestionPrompt): string {
    switch (s.accent) {
      case 'blue':
        return 'icon-blue';
      case 'amber':
        return 'icon-amber';
      case 'purple':
        return 'icon-purple';
      default:
        return '';
    }
  }

  trackBy = (_: number, s: SuggestionPrompt) => s.label;
}
