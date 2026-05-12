import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { StreamingState } from '../../models/chat.models';

interface QuickChip {
  icon: string;
  label: string;
  prompt: string;
}

const QUICK_CHIPS: QuickChip[] = [
  { icon: 'bar-chart-3', label: 'RS', prompt: 'Quel est le RS au 31/12/2024 ?' },
  { icon: 'shield', label: 'RCET1', prompt: 'Quel est le RCET1 au 31/12/2024 ?' },
  { icon: 'alert-triangle', label: 'Seuils', prompt: 'Quels ratios sont en breach actuellement ?' },
  { icon: 'trending-up', label: 'Tendance', prompt: 'Montre la tendance du RS sur 2024.' },
  { icon: 'flask-conical', label: 'Stress', prompt: 'Simule un stress test -10% FPE en 2024.' },
];

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="input-root">
      <!-- Streaming progress line -->
      <div *ngIf="isStreaming" class="stream-progress" aria-hidden="true">
        <div class="stream-progress-fill"></div>
      </div>

      <!-- Input shell -->
      <div
        class="input-shell"
        [class.is-focused]="focused() && !isStreaming"
        [class.is-streaming]="isStreaming"
      >
        <textarea
          #ta
          [ngModel]="value()"
          (ngModelChange)="onModelChange($event)"
          (focus)="focused.set(true)"
          (blur)="focused.set(false)"
          (keydown)="onKeydown($event)"
          [disabled]="disabled || isStreaming"
          rows="1"
          placeholder="Posez votre question sur les ratios, les seuils ou un stress test..."
          class="input-textarea"
        ></textarea>

        <!-- Char counter -->
        <div
          *ngIf="value().length >= 200"
          class="char-counter"
          [class.over]="value().length > 1800"
        >
          {{ value().length }} / 2000
        </div>

        <!-- Send / Stop button -->
        <button
          type="button"
          class="send-btn"
          [class.can-submit]="canSubmit && !isStreaming"
          [class.is-streaming]="isStreaming"
          [class.is-disabled]="!canSubmit && !isStreaming"
          [disabled]="!canSubmit && !isStreaming"
          (click)="onClickSend()"
          [attr.aria-label]="isStreaming ? 'Arreter le streaming' : 'Envoyer'"
        >
          <span class="send-btn-glow" *ngIf="canSubmit && !isStreaming"></span>
          <lucide-icon
            *ngIf="!isStreaming"
            name="send"
            [size]="15"
            [strokeWidth]="2.5"
          ></lucide-icon>
          <lucide-icon
            *ngIf="isStreaming"
            name="square"
            [size]="12"
            [strokeWidth]="3.25"
          ></lucide-icon>
        </button>
      </div>

      <!-- Quick chips row -->
      <div *ngIf="showQuickChips" class="quick-chips">
        <button
          *ngFor="let chip of quickChips; trackBy: trackByChip"
          type="button"
          class="quick-chip"
          [disabled]="isStreaming"
          (click)="applyChip(chip)"
        >
          <lucide-icon [name]="chip.icon" [size]="11" [strokeWidth]="2.75"></lucide-icon>
          <span>{{ chip.label }}</span>
        </button>

        <span class="disclaimer">
          FinanceGPT peut faire des erreurs.
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .input-root {
      position: relative;
      width: 100%;
      max-width: 860px;
      margin: 0 auto;
      padding: 0 18px;
    }

    /* ── Streaming progress line ── */
    .stream-progress {
      position: absolute;
      top: -1px;
      left: 22px;
      right: 22px;
      height: 2px;
      border-radius: 999px;
      overflow: hidden;
      pointer-events: none;
      z-index: 10;
    }
    .stream-progress-fill {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent,
        var(--color-primary),
        #3b82f6,
        var(--color-primary),
        transparent
      );
      background-size: 250% 100%;
      animation: progressFlow 1.6s linear infinite;
    }
    @keyframes progressFlow {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Input shell ── */
    .input-shell {
      position: relative;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 8px 8px 8px 16px;
      border-radius: 18px;
      background: var(--bg-card);
      border: 1.5px solid var(--color-border);
      box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.04),
        0 8px 24px rgba(15, 23, 42, 0.04);
      transition:
        border-color 180ms ease,
        box-shadow 220ms ease,
        background 200ms ease;
    }
    :host-context(html.dark) .input-shell {
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.04) inset,
        0 8px 28px rgba(0, 0, 0, 0.32);
    }

    .input-shell.is-focused {
      border-color: var(--color-primary);
      box-shadow:
        0 0 0 4px rgba(1, 181, 116, 0.12),
        0 8px 28px rgba(1, 181, 116, 0.08);
    }
    .input-shell.is-streaming {
      opacity: 0.94;
      border-color: var(--color-border);
    }

    .input-textarea {
      flex: 1;
      min-height: 28px;
      max-height: 180px;
      padding: 6px 0 4px 0;
      background: transparent;
      border: none;
      outline: none;
      resize: none;
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--text-primary);
      letter-spacing: 0.005em;
      font-family: inherit;
    }
    .input-textarea::placeholder {
      color: var(--text-secondary);
      opacity: 0.7;
    }
    .input-textarea:disabled { cursor: not-allowed; }

    /* ── Char counter ── */
    .char-counter {
      position: absolute;
      bottom: 14px;
      right: 72px;
      font-size: 10px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      color: var(--text-secondary);
      opacity: 0.7;
      animation: fadeIn 220ms ease-out;
    }
    .char-counter.over { color: #ef4444; opacity: 1; font-weight: 700; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(2px); }
      to   { opacity: 0.7; transform: translateY(0); }
    }

    /* ── Send button ── */
    .send-btn {
      position: relative;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: all 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
      overflow: hidden;
    }
    .send-btn:active { transform: scale(0.94); }

    .send-btn.can-submit {
      background: linear-gradient(135deg, var(--color-primary), #0a8f63);
      box-shadow:
        0 4px 14px rgba(1, 181, 116, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.28);
    }
    .send-btn.can-submit:hover {
      transform: translateY(-1px);
      box-shadow:
        0 8px 22px rgba(1, 181, 116, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.32);
    }

    .send-btn-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(255, 255, 255, 0.32), transparent 60%);
      opacity: 0;
      transition: opacity 200ms ease;
    }
    .send-btn:hover .send-btn-glow { opacity: 1; }

    .send-btn.is-streaming {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      box-shadow:
        0 4px 14px rgba(239, 68, 68, 0.42),
        inset 0 1px 0 rgba(255, 255, 255, 0.22);
      animation: streamPulse 1.4s ease-in-out infinite;
    }
    @keyframes streamPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.42); }
      50%      { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
    }

    .send-btn.is-disabled {
      background: rgba(148, 163, 184, 0.22);
      cursor: not-allowed;
      color: rgba(148, 163, 184, 0.8);
    }
    :host-context(html.dark) .send-btn.is-disabled {
      background: rgba(255, 255, 255, 0.06);
      color: rgba(148, 163, 184, 0.6);
    }

    /* ── Quick chips ── */
    .quick-chips {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 9px;
      overflow-x: auto;
      padding: 0 2px 4px;
      scrollbar-width: thin;
    }
    .quick-chips::-webkit-scrollbar { height: 3px; display: block; }
    .quick-chips::-webkit-scrollbar-thumb {
      background: var(--color-border);
      border-radius: 3px;
    }

    .quick-chip {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 11px;
      border-radius: 10px;
      border: 1px solid rgba(1, 181, 116, 0.22);
      background: rgba(1, 181, 116, 0.06);
      color: var(--color-primary);
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.005em;
      transition: all 160ms ease;
    }
    .quick-chip:hover:not(:disabled) {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(1, 181, 116, 0.3);
    }
    .quick-chip:active:not(:disabled) { transform: scale(0.96); }
    .quick-chip:disabled { opacity: 0.5; cursor: not-allowed; }

    .disclaimer {
      margin-left: auto;
      flex-shrink: 0;
      padding: 0 8px;
      font-size: 10px;
      color: var(--text-secondary);
      opacity: 0.55;
      letter-spacing: 0.01em;
    }
  `],
})
export class ChatInputComponent {
  @Input() isStreaming = false;
  @Input() disabled = false;
  @Input() showQuickChips = true;

  @Output() send = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('ta') textarea?: ElementRef<HTMLTextAreaElement>;

  value = signal('');
  focused = signal(false);

  quickChips = QUICK_CHIPS;

  get canSubmit(): boolean {
    return !this.disabled && this.value().trim().length > 0;
  }

  focus(): void {
    this.textarea?.nativeElement.focus();
  }

  prefill(text: string): void {
    this.value.set(text);
    this.resizeTextarea();
    // Move caret to end on next tick
    queueMicrotask(() => {
      const el = this.textarea?.nativeElement;
      if (el) {
        el.focus();
        el.setSelectionRange(text.length, text.length);
      }
    });
  }

  onModelChange(v: string): void {
    this.value.set(v);
    this.resizeTextarea();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    } else if (event.key === 'Escape' && this.isStreaming) {
      event.preventDefault();
      this.cancel.emit();
    }
  }

  onClickSend(): void {
    if (this.isStreaming) {
      this.cancel.emit();
      return;
    }
    this.submit();
  }

  applyChip(chip: QuickChip): void {
    this.value.set(chip.prompt);
    this.resizeTextarea();
    // Submit immediately for snappy UX
    queueMicrotask(() => this.submit());
  }

  submit(): void {
    const text = this.value().trim();
    if (!text || this.disabled || this.isStreaming) return;
    this.send.emit(text);
    this.value.set('');
    this.resizeTextarea();
  }

  trackByChip = (_: number, c: QuickChip) => c.label;

  private resizeTextarea(): void {
    const el = this.textarea?.nativeElement;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    });
  }
}
