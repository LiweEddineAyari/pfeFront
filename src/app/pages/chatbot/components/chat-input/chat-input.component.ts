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
  { icon: 'flask-conical', label: 'Stress', prompt: '/stress-test ' },
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
        (click)="focusTextarea()"
      >
        <!-- Stress-test prefix badge -->
        <span *ngIf="hasStressPrefix()" class="stress-badge">
          <lucide-icon name="flask-conical" [size]="11" [strokeWidth]="2.5"></lucide-icon>
          <span class="stress-badge-text">/stress-test</span>
          <button
            type="button"
            class="stress-badge-remove"
            (click)="removeStressPrefix($event)"
            tabindex="-1"
            aria-label="Retirer /stress-test"
          >
            <lucide-icon name="x" [size]="9" [strokeWidth]="3"></lucide-icon>
          </button>
        </span>

        <textarea
          #ta
          [ngModel]="displayValue()"
          (ngModelChange)="onDisplayChange($event)"
          (focus)="focused.set(true)"
          (blur)="focused.set(false)"
          (keydown)="onKeydown($event)"
          [disabled]="disabled || isStreaming"
          rows="1"
          [placeholder]="hasStressPrefix() ? 'Décrivez votre scénario de stress...' : 'Posez votre question sur les ratios, les seuils ou un stress test...'"
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
      <div *ngIf="showQuickChips" class="quick-chips mt-5">
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
      align-items: center;
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

    /* ── Stress badge (inside input) ── */
    .stress-badge {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 6px 4px 9px;
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(1, 181, 116, 0.15), rgba(1, 181, 116, 0.07));
      border: 1.5px solid rgba(1, 181, 116, 0.45);
      box-shadow:
        0 0 0 3px rgba(1, 181, 116, 0.07),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
      animation: badgePop 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    :host-context(html.dark) .stress-badge {
      background: linear-gradient(135deg, rgba(1, 181, 116, 0.22), rgba(1, 181, 116, 0.1));
      border-color: rgba(1, 181, 116, 0.55);
      box-shadow:
        0 0 0 3px rgba(1, 181, 116, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }
    @keyframes badgePop {
      from { opacity: 0; transform: scale(0.7); }
      to   { opacity: 1; transform: scale(1); }
    }

    .stress-badge lucide-icon {
      color: #01915d;
      flex-shrink: 0;
    }
    :host-context(html.dark) .stress-badge lucide-icon { color: #2edd9a; }

    .stress-badge-text {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      background: linear-gradient(135deg, #01b574 0%, #0a8f63 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: nowrap;
    }
    :host-context(html.dark) .stress-badge-text {
      background: linear-gradient(135deg, #2edd9a 0%, #01b574 100%);
      -webkit-background-clip: text;
      background-clip: text;
    }

    .stress-badge-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      color: #01915d;
      opacity: 0.6;
      transition: all 130ms ease;
    }
    :host-context(html.dark) .stress-badge-remove { color: #2edd9a; }
    .stress-badge-remove:hover { opacity: 1; background: rgba(1, 181, 116, 0.2); }

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
      gap: 6px;
      padding: 7px 14px;
      border-radius: 999px;
      border: 1.5px solid #01b574;
      background: linear-gradient(135deg, rgba(1, 181, 116, 0.12), rgba(1, 181, 116, 0.06));
      color: #01915d;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      transition: all 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
      box-shadow: 0 0 0 0 rgba(1, 181, 116, 0);
    }
    :host-context(html.dark) .quick-chip {
      border-color: #01b574;
      background: linear-gradient(135deg, rgba(1, 181, 116, 0.18), rgba(1, 181, 116, 0.08));
      color: #2edd9a;
    }
    .quick-chip:hover:not(:disabled) {
      background: linear-gradient(135deg, #01b574, #0a8f63);
      color: white;
      border-color: transparent;
      transform: translateY(-1px) scale(1.03);
      box-shadow:
        0 4px 14px rgba(1, 181, 116, 0.45),
        0 0 0 3px rgba(1, 181, 116, 0.18);
    }
    .quick-chip:active:not(:disabled) {
      transform: scale(0.96);
      box-shadow: 0 2px 8px rgba(1, 181, 116, 0.3);
    }
    .quick-chip:disabled { opacity: 0.45; cursor: not-allowed; }

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

  private static readonly STRESS_PREFIX = '/stress-test ';

  value = signal('');
  focused = signal(false);

  quickChips = QUICK_CHIPS;

  hasStressPrefix(): boolean {
    return this.value().startsWith(ChatInputComponent.STRESS_PREFIX);
  }

  displayValue(): string {
    if (this.hasStressPrefix()) {
      return this.value().slice(ChatInputComponent.STRESS_PREFIX.length);
    }
    return this.value();
  }

  onDisplayChange(v: string): void {
    const full = this.hasStressPrefix()
      ? ChatInputComponent.STRESS_PREFIX + v
      : v;
    this.value.set(full);
    this.resizeTextarea();
  }

  removeStressPrefix(event: Event): void {
    event.stopPropagation();
    const rest = this.value().slice(ChatInputComponent.STRESS_PREFIX.length);
    this.value.set(rest);
    this.resizeTextarea();
    queueMicrotask(() => {
      const el = this.textarea?.nativeElement;
      if (el) { el.focus(); el.setSelectionRange(rest.length, rest.length); }
    });
  }

  focusTextarea(): void {
    this.textarea?.nativeElement.focus();
  }

  get canSubmit(): boolean {
    return !this.disabled && this.value().trim().length > 0;
  }

  focus(): void {
    this.textarea?.nativeElement.focus();
  }

  prefill(text: string): void {
    this.value.set(text);
    this.resizeTextarea();
    queueMicrotask(() => {
      const el = this.textarea?.nativeElement;
      if (el) {
        const pos = this.displayValue().length;
        el.focus();
        el.setSelectionRange(pos, pos);
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
    const alreadyPrefixed = this.value().startsWith(chip.prompt.trim());
    if (!alreadyPrefixed) {
      const userText = this.value().trimStart();
      this.value.set(chip.prompt + userText);
      this.resizeTextarea();
    }
    queueMicrotask(() => {
      const el = this.textarea?.nativeElement;
      if (el) {
        const pos = this.displayValue().length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
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
