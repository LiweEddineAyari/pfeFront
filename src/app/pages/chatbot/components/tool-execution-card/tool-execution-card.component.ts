import {
  ChangeDetectionStrategy,
  Component,
  Input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToolCardState } from '../../models/chat.models';

@Component({
  selector: 'app-tool-execution-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="tool-card relative rounded-[12px] border bg-[var(--bg-page)] dark:bg-[#0d1633] overflow-hidden"
      [ngClass]="borderClass"
      [style.animation]="'slideInDown 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both'"
    >
      <!-- Header -->
      <div class="flex items-center gap-2.5 px-3 py-2">
        <!-- Tool icon -->
        <div
          class="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-colors"
          [ngClass]="iconWrapClass"
        >
          <lucide-icon [name]="card.icon" [size]="13" [strokeWidth]="2.5"></lucide-icon>
        </div>

        <!-- Label -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">
              {{ card.label }}
            </p>
            <span
              class="text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded-[4px] uppercase"
              [ngClass]="badgeClass"
            >
              {{ stateLabel }}
            </span>
          </div>

          <!-- Args row -->
          <div
            *ngIf="argEntries.length > 0"
            class="flex flex-wrap items-center gap-1 mt-1"
          >
            <span
              *ngFor="let arg of argEntries.slice(0, 4)"
              class="text-[10px] font-medium text-[var(--text-secondary)] bg-black/[0.03] dark:bg-white/[0.05] px-1.5 py-0.5 rounded-[5px] font-mono"
            >
              <span class="text-[var(--text-secondary)]/70">{{ arg.key }}:</span>
              <span class="text-[var(--text-primary)] ml-1">{{ arg.value }}</span>
            </span>
            <span
              *ngIf="argEntries.length > 4"
              class="text-[10px] text-[var(--text-secondary)]/70"
            >
              +{{ argEntries.length - 4 }}
            </span>
          </div>
        </div>

        <!-- Duration / status icon -->
        <div class="flex items-center gap-1.5 shrink-0">
          <span
            *ngIf="card.state === 'done' && card.duration !== undefined"
            class="text-[10px] font-mono text-[var(--text-secondary)]"
          >
            {{ formatDuration(card.duration) }}
          </span>
          <span
            *ngIf="card.state === 'done'"
            class="w-5 h-5 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center"
            [style.animation]="'checkIn 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both'"
          >
            <lucide-icon name="check" [size]="11" [strokeWidth]="3"></lucide-icon>
          </span>
          <span
            *ngIf="card.state === 'error'"
            class="w-5 h-5 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center"
          >
            <lucide-icon name="x" [size]="11" [strokeWidth]="3"></lucide-icon>
          </span>
          <span
            *ngIf="card.state === 'running'"
            class="flex items-center gap-0.5"
          >
            <span class="dot w-1 h-1 rounded-full bg-amber-500 dot-1"></span>
            <span class="dot w-1 h-1 rounded-full bg-amber-500 dot-2"></span>
            <span class="dot w-1 h-1 rounded-full bg-amber-500 dot-3"></span>
          </span>
          <span
            *ngIf="card.state === 'queued'"
            class="flex items-center gap-0.5"
          >
            <span class="dot w-1 h-1 rounded-full bg-slate-400 dot-1"></span>
            <span class="dot w-1 h-1 rounded-full bg-slate-400 dot-2"></span>
            <span class="dot w-1 h-1 rounded-full bg-slate-400 dot-3"></span>
          </span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="h-[2px] w-full bg-[var(--color-border)]/40 relative overflow-hidden">
        <div
          *ngIf="card.state === 'running' || card.state === 'queued'"
          class="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
          [style.animation]="'indeterminate 1.25s cubic-bezier(0.65, 0, 0.35, 1) infinite'"
        ></div>
        <div
          *ngIf="card.state === 'done'"
          class="absolute inset-y-0 left-0 w-full bg-brand-primary"
          [style.animation]="'fillBar 260ms ease-out both'"
        ></div>
        <div
          *ngIf="card.state === 'error'"
          class="absolute inset-y-0 left-0 w-full bg-red-500"
        ></div>
      </div>

      <!-- Result preview -->
      <div
        *ngIf="card.state === 'done' && resultPreview"
        class="px-3 py-2 border-t border-[var(--color-border)]/40 bg-black/[0.015] dark:bg-white/[0.015]"
      >
        <div class="flex items-start gap-2">
          <lucide-icon
            name="arrow-right"
            [size]="11"
            [strokeWidth]="2.5"
            class="text-brand-primary mt-0.5 shrink-0"
          ></lucide-icon>
          <pre
            class="text-[11px] font-mono text-[var(--text-primary)]/80 leading-snug break-all whitespace-pre-wrap flex-1 min-w-0"
            [class.line-clamp-2]="!card.expanded"
          >{{ resultPreview }}</pre>
          <button
            *ngIf="resultPreview.length > 80"
            type="button"
            class="shrink-0 text-[10px] font-bold text-brand-primary hover:underline"
            (click)="card.expanded = !card.expanded"
          >
            {{ card.expanded ? 'Reduire' : 'Details' }}
          </button>
        </div>
      </div>

      <!-- Error -->
      <div
        *ngIf="card.state === 'error' && card.error"
        class="px-3 py-2 border-t border-red-500/20 bg-red-500/[0.04]"
      >
        <p class="text-[11px] text-red-600 dark:text-red-400 font-medium">
          {{ card.error }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    @keyframes slideInDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes indeterminate {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }

    @keyframes fillBar {
      from { transform: scaleX(0); transform-origin: left center; }
      to   { transform: scaleX(1); transform-origin: left center; }
    }

    @keyframes checkIn {
      from { transform: scale(0) rotate(-30deg); opacity: 0; }
      to   { transform: scale(1) rotate(0deg);   opacity: 1; }
    }

    @keyframes dotPulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.45; }
      40%           { transform: scale(1);   opacity: 1; }
    }

    .dot { display: inline-block; }
    .dot-1 { animation: dotPulse 1.1s ease-in-out infinite 0ms; }
    .dot-2 { animation: dotPulse 1.1s ease-in-out infinite 160ms; }
    .dot-3 { animation: dotPulse 1.1s ease-in-out infinite 320ms; }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .tool-card {
      border-left-width: 3px;
    }
  `],
})
export class ToolExecutionCardComponent {
  @Input({ required: true }) card!: ToolCardState;

  get argEntries(): { key: string; value: string }[] {
    return Object.entries(this.card.args ?? {})
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([key, value]) => ({
        key,
        value: this.formatArg(value),
      }));
  }

  get resultPreview(): string {
    if (this.card.result === undefined || this.card.result === null) return '';
    if (typeof this.card.result === 'string') return this.card.result;
    try {
      return JSON.stringify(this.card.result, null, 0);
    } catch {
      return String(this.card.result);
    }
  }

  get borderClass(): string {
    switch (this.card.state) {
      case 'done':
        return 'border-[var(--color-border)] !border-l-brand-primary';
      case 'error':
        return 'border-red-500/30 !border-l-red-500';
      case 'running':
        return 'border-[var(--color-border)] !border-l-amber-500';
      default:
        return 'border-[var(--color-border)] !border-l-slate-400';
    }
  }

  get iconWrapClass(): string {
    switch (this.card.state) {
      case 'done':
        return 'bg-brand-primary/15 text-brand-primary';
      case 'error':
        return 'bg-red-500/15 text-red-500';
      case 'running':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-slate-400/15 text-slate-500';
    }
  }

  get badgeClass(): string {
    switch (this.card.state) {
      case 'done':
        return 'bg-brand-primary/15 text-brand-primary';
      case 'error':
        return 'bg-red-500/15 text-red-500';
      case 'running':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-slate-400/15 text-slate-500';
    }
  }

  get stateLabel(): string {
    switch (this.card.state) {
      case 'done':
        return 'OK';
      case 'error':
        return 'Echec';
      case 'running':
        return 'En cours';
      default:
        return 'En attente';
    }
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private formatArg(value: unknown): string {
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
