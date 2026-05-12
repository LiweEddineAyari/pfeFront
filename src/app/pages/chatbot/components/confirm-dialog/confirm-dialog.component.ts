import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export type DialogVariant = 'danger' | 'primary';
export type DialogMode = 'confirm' | 'prompt';

/**
 * Premium confirmation / prompt dialog. Replaces window.confirm and
 * window.prompt with an in-app card matching the design system.
 *
 * Two modes:
 *   • mode="confirm" — read-only highlighted value chip + danger / primary CTA.
 *   • mode="prompt"  — editable input pre-filled with `value`; emits the
 *                       trimmed new string on confirm.
 *
 * Light & dark themes are driven entirely by `var(--*)` tokens.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      *ngIf="open"
      class="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="'dlg-title-' + dialogId"
      (click)="onBackdropClick($event)"
    >
      <div class="dialog-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="dialog-header">
          <div class="dialog-icon-wrap" [class.is-danger]="variant === 'danger'" [class.is-primary]="variant === 'primary'">
            <div class="dialog-icon-glow"></div>
            <lucide-icon
              [name]="displayIcon"
              [size]="17"
              [strokeWidth]="2.5"
            ></lucide-icon>
          </div>
          <div class="dialog-titles">
            <h2 [id]="'dlg-title-' + dialogId" class="dialog-title">{{ title }}</h2>
            <p class="dialog-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
          </div>
        </div>

        <!-- Body -->
        <p class="dialog-question" *ngIf="question">{{ question }}</p>

        <!-- Value display (confirm) or input (prompt) -->
        <div
          *ngIf="mode === 'confirm' && value"
          class="dialog-value"
          [class.is-danger]="variant === 'danger'"
        >
          {{ value }}
        </div>

        <input
          *ngIf="mode === 'prompt'"
          #promptInput
          type="text"
          class="dialog-input"
          [ngModel]="draft"
          (ngModelChange)="onDraftChange($event)"
          (keydown.enter)="onConfirm()"
          (keydown.escape)="onCancel()"
          [attr.maxlength]="maxLength"
          [attr.placeholder]="placeholder"
        />

        <!-- Actions -->
        <div class="dialog-actions">
          <button
            type="button"
            class="btn-cancel"
            (click)="onCancel()"
            #cancelBtn
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="btn-confirm"
            [class.is-danger]="variant === 'danger'"
            [class.is-primary]="variant === 'primary'"
            [disabled]="isConfirmDisabled"
            (click)="onConfirm()"
          >
            <lucide-icon
              *ngIf="confirmIcon"
              [name]="confirmIcon"
              [size]="13"
              [strokeWidth]="2.75"
            ></lucide-icon>
            <span>{{ confirmLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(6px);
      animation: backdropIn 200ms ease-out;
    }

    @keyframes backdropIn {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to   { opacity: 1; backdrop-filter: blur(6px); }
    }

    .dialog-card {
      position: relative;
      width: 100%;
      max-width: 480px;
      background:
        radial-gradient(800px 200px at 50% -30%, rgba(1, 181, 116, 0.08), transparent 60%),
        var(--bg-card);
      border-radius: 18px;
      border: 1px solid var(--color-border);
      padding: 22px 22px 18px;
      box-shadow:
        0 20px 60px rgba(15, 23, 42, 0.20),
        0 8px 20px rgba(15, 23, 42, 0.10),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
      animation: cardIn 280ms cubic-bezier(0.34, 1.4, 0.5, 1) both;
    }
    :host-context(html.dark) .dialog-card {
      background:
        radial-gradient(800px 220px at 50% -30%, rgba(1, 181, 116, 0.12), transparent 60%),
        linear-gradient(180deg, var(--bg-card) 0%, rgba(17, 28, 68, 0.96) 100%);
      box-shadow:
        0 24px 70px rgba(0, 0, 0, 0.6),
        0 8px 24px rgba(0, 0, 0, 0.40),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    @keyframes cardIn {
      from { opacity: 0; transform: translateY(12px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }

    /* ── Header ── */
    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 13px;
      margin-bottom: 14px;
    }

    .dialog-icon-wrap {
      position: relative;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
    .dialog-icon-wrap.is-danger {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(220, 38, 38, 0.10));
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #dc2626;
    }
    :host-context(html.dark) .dialog-icon-wrap.is-danger {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(220, 38, 38, 0.14));
      color: #fca5a5;
    }

    .dialog-icon-wrap.is-primary {
      background: linear-gradient(135deg, rgba(1, 181, 116, 0.16), rgba(1, 181, 116, 0.08));
      border: 1px solid rgba(1, 181, 116, 0.35);
      color: var(--color-primary);
    }

    .dialog-icon-glow {
      position: absolute;
      inset: -6px;
      border-radius: 16px;
      z-index: -1;
      filter: blur(10px);
    }
    .dialog-icon-wrap.is-danger .dialog-icon-glow {
      background: radial-gradient(circle, rgba(239, 68, 68, 0.32), transparent 70%);
    }
    .dialog-icon-wrap.is-primary .dialog-icon-glow {
      background: radial-gradient(circle, rgba(1, 181, 116, 0.32), transparent 70%);
    }

    .dialog-titles { min-width: 0; flex: 1; padding-top: 2px; }
    .dialog-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
      margin: 0 0 3px 0;
      line-height: 1.25;
    }
    .dialog-subtitle {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.4;
      margin: 0;
    }

    /* ── Body ── */
    .dialog-question {
      font-size: 13.5px;
      color: var(--text-primary);
      line-height: 1.55;
      margin: 0 0 12px 0;
      font-weight: 500;
    }

    .dialog-value {
      padding: 12px 14px;
      border-radius: 11px;
      border: 1px solid var(--color-border);
      background: var(--bg-page);
      color: var(--text-primary);
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: 0.005em;
      line-height: 1.4;
      word-break: break-word;
      margin-bottom: 16px;
    }
    .dialog-value.is-danger {
      background: rgba(239, 68, 68, 0.04);
      border-color: rgba(239, 68, 68, 0.18);
    }
    :host-context(html.dark) .dialog-value {
      background: rgba(255, 255, 255, 0.04);
    }
    :host-context(html.dark) .dialog-value.is-danger {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.22);
    }

    .dialog-input {
      width: 100%;
      padding: 11px 14px;
      border-radius: 11px;
      border: 1.5px solid var(--color-border);
      background: var(--bg-page);
      color: var(--text-primary);
      font-size: 13.5px;
      font-weight: 500;
      font-family: inherit;
      outline: none;
      margin-bottom: 16px;
      transition: all 160ms ease;
    }
    .dialog-input::placeholder { color: var(--text-secondary); opacity: 0.7; }
    .dialog-input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 4px rgba(1, 181, 116, 0.13);
    }
    :host-context(html.dark) .dialog-input {
      background: rgba(255, 255, 255, 0.04);
    }

    /* ── Actions ── */
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .btn-cancel,
    .btn-confirm {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border-radius: 11px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.005em;
      transition: all 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
      cursor: pointer;
    }
    .btn-cancel:active,
    .btn-confirm:active { transform: scale(0.96); }
    .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    .btn-cancel {
      background: var(--bg-card);
      border: 1px solid var(--color-border);
      color: var(--text-primary);
    }
    .btn-cancel:hover {
      background: var(--bg-page);
      border-color: var(--text-secondary);
    }
    :host-context(html.dark) .btn-cancel {
      background: rgba(255, 255, 255, 0.04);
    }
    :host-context(html.dark) .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .btn-confirm.is-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border: 1px solid #dc2626;
      box-shadow:
        0 4px 14px rgba(239, 68, 68, 0.36),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .btn-confirm.is-danger:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow:
        0 8px 22px rgba(239, 68, 68, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.32);
    }

    .btn-confirm.is-primary {
      background: linear-gradient(135deg, var(--color-primary) 0%, #0a8f63 100%);
      color: white;
      border: 1px solid var(--color-primary);
      box-shadow:
        0 4px 14px rgba(1, 181, 116, 0.36),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .btn-confirm.is-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow:
        0 8px 22px rgba(1, 181, 116, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.32);
    }
  `],
})
export class ConfirmDialogComponent implements AfterViewInit {
  @Input() open = false;
  @Input() mode: DialogMode = 'confirm';
  @Input() variant: DialogVariant = 'danger';

  @Input() title = 'Confirmer';
  @Input() subtitle = '';
  @Input() question = '';
  @Input() value = '';

  @Input() confirmLabel = 'Confirmer';
  @Input() cancelLabel = 'Annuler';
  @Input() confirmIcon: string | null = null;
  @Input() iconName: string | null = null;

  @Input() placeholder = '';
  @Input() maxLength = 120;
  @Input() closeOnBackdrop = true;

  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('promptInput') promptInput?: ElementRef<HTMLInputElement>;

  draft = '';
  readonly dialogId = Math.random().toString(36).slice(2, 8);

  ngOnChanges(): void {
    // Reset the draft any time `value` changes externally
    this.draft = this.value ?? '';
  }

  ngAfterViewInit(): void {
    if (this.mode === 'prompt' && this.open) {
      this.focusInput();
    }
  }

  get isConfirmDisabled(): boolean {
    return this.mode === 'prompt' && this.draft.trim().length === 0;
  }

  get displayIcon(): string {
    if (this.iconName) return this.iconName;
    return this.variant === 'danger' ? 'alert-triangle' : 'pencil';
  }

  onDraftChange(v: string): void {
    this.draft = v;
  }

  onConfirm(): void {
    if (this.isConfirmDisabled) return;
    const payload = this.mode === 'prompt' ? this.draft.trim() : this.value;
    this.confirm.emit(payload);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.closeOnBackdrop) return;
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKey(event: KeyboardEvent): void {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }

  private focusInput(): void {
    queueMicrotask(() => {
      const el = this.promptInput?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }
}
