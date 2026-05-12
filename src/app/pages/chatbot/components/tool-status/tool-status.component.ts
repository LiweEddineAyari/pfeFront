import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToolCardState } from '../../models/chat.models';

interface ToolHistoryItem {
  name: string;
  label: string;
  icon: string;
  state: 'visible' | 'leaving';
}

/**
 * Ephemeral tool-execution indicator.
 *
 * Replaces the bulky tool cards with a single elegant status chip that:
 *   • Crossfades when a new tool arrives.
 *   • Auto-collapses each completed tool after a short visible window.
 *   • Fades out entirely once the assistant has produced its first token,
 *     leaving the surface clean for the streaming response (ChatGPT / Claude
 *     style "Searching..." → "Analyzing..." → vanish).
 */
@Component({
  selector: 'app-tool-status',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tool-status-wrap" *ngIf="visibleItems.length > 0">
      <div
        *ngFor="let item of visibleItems; trackBy: trackByName"
        class="tool-chip"
        [class.tool-chip-leaving]="item.state === 'leaving'"
      >
        <span class="tool-chip-glow"></span>

        <span class="tool-chip-icon">
          <lucide-icon
            [name]="item.icon"
            [size]="11"
            [strokeWidth]="2.75"
          ></lucide-icon>
        </span>

        <span class="tool-chip-label">{{ item.label }}</span>

        <span class="tool-chip-dots" *ngIf="item.state === 'visible' && !done">
          <span class="d d1"></span>
          <span class="d d2"></span>
          <span class="d d3"></span>
        </span>

        <span class="tool-chip-check" *ngIf="item.state === 'leaving' || done">
          <lucide-icon name="check" [size]="9" [strokeWidth]="3.5"></lucide-icon>
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .tool-status-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 4px;
    }

    .tool-chip {
      position: relative;
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 11px 5px 9px;
      border-radius: 999px;
      background: linear-gradient(
        135deg,
        rgba(1, 181, 116, 0.10) 0%,
        rgba(59, 130, 246, 0.08) 100%
      );
      border: 1px solid rgba(1, 181, 116, 0.22);
      backdrop-filter: blur(8px);
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: 0.01em;
      overflow: hidden;
      transform-origin: left center;
      animation: chipIn 320ms cubic-bezier(0.34, 1.4, 0.5, 1) both;
      box-shadow:
        0 1px 4px rgba(1, 181, 116, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }

    :host-context(html.dark) .tool-chip {
      background: linear-gradient(
        135deg,
        rgba(1, 181, 116, 0.18) 0%,
        rgba(59, 130, 246, 0.12) 100%
      );
      border-color: rgba(1, 181, 116, 0.32);
      box-shadow:
        0 1px 4px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    .tool-chip-leaving {
      animation: chipOut 380ms ease-in forwards;
    }

    /* Subtle moving sheen */
    .tool-chip-glow {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.18),
        transparent
      );
      transform: translateX(-100%);
      animation: shimmerSweep 2.6s ease-in-out infinite;
      pointer-events: none;
    }

    :host-context(html.dark) .tool-chip-glow {
      background: linear-gradient(
        90deg,
        transparent,
        rgba(1, 181, 116, 0.15),
        transparent
      );
    }

    .tool-chip-icon {
      width: 17px;
      height: 17px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary);
      color: white;
      flex-shrink: 0;
      box-shadow: 0 0 10px rgba(1, 181, 116, 0.45);
      animation: iconBob 1.8s ease-in-out infinite;
    }

    .tool-chip-label {
      white-space: nowrap;
    }

    .tool-chip-dots {
      display: inline-flex;
      gap: 2.5px;
      margin-left: 2px;
    }
    .tool-chip-dots .d {
      width: 3px; height: 3px; border-radius: 999px;
      background: var(--color-primary);
      opacity: 0.5;
    }
    .d1 { animation: blink 1.2s ease-in-out infinite 0ms; }
    .d2 { animation: blink 1.2s ease-in-out infinite 160ms; }
    .d3 { animation: blink 1.2s ease-in-out infinite 320ms; }

    .tool-chip-check {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: var(--color-primary);
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      animation: pop 260ms cubic-bezier(0.34, 1.6, 0.5, 1) both;
    }

    @keyframes chipIn {
      from { opacity: 0; transform: translateY(-4px) scale(0.92); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes chipOut {
      from { opacity: 1; max-height: 32px; transform: translateY(0) scale(1); }
      to   { opacity: 0; max-height: 0; transform: translateY(-2px) scale(0.96); margin: 0; padding-top: 0; padding-bottom: 0; border-width: 0; }
    }
    @keyframes shimmerSweep {
      0%   { transform: translateX(-100%); }
      55%  { transform: translateX(200%); }
      100% { transform: translateX(200%); }
    }
    @keyframes iconBob {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-1px); }
    }
    @keyframes blink {
      0%, 100% { opacity: 0.3; }
      50%      { opacity: 1; }
    }
    @keyframes pop {
      from { transform: scale(0) rotate(-20deg); opacity: 0; }
      to   { transform: scale(1) rotate(0); opacity: 1; }
    }
  `],
})
export class ToolStatusComponent implements OnChanges, OnDestroy {
  @Input() tools: ToolCardState[] = [];
  /** True once the assistant has produced its first content token — fade everything out. */
  @Input() done = false;

  visibleItems: ToolHistoryItem[] = [];
  private cdr = inject(ChangeDetectorRef);
  private seenNames = new Set<string>();
  private leaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private clearAllTimer?: ReturnType<typeof setTimeout>;

  /** How long a completed tool stays prominently visible before fading out. */
  private readonly VISIBLE_MS = 1800;
  /** Final fade window after streaming begins. */
  private readonly FINAL_FADE_MS = 600;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tools']) {
      this.syncIncomingTools();
    }
    if (changes['done'] && this.done) {
      this.dissolveAll();
    }
  }

  ngOnDestroy(): void {
    this.leaveTimers.forEach((t) => clearTimeout(t));
    if (this.clearAllTimer) clearTimeout(this.clearAllTimer);
  }

  private syncIncomingTools(): void {
    // Identify newly-arrived tools
    for (const tool of this.tools) {
      if (this.seenNames.has(tool.name)) continue;
      this.seenNames.add(tool.name);
      this.visibleItems = [
        ...this.visibleItems,
        {
          name: tool.name,
          label: tool.label,
          icon: tool.icon,
          state: 'visible',
        },
      ];

      // Schedule its dissolve
      const timer = setTimeout(() => this.markLeaving(tool.name), this.VISIBLE_MS);
      this.leaveTimers.set(tool.name, timer);
    }
    this.cdr.markForCheck();
  }

  private markLeaving(name: string): void {
    const item = this.visibleItems.find((i) => i.name === name);
    if (!item) return;
    item.state = 'leaving';
    // New ref so OnPush kicks in
    this.visibleItems = [...this.visibleItems];
    this.cdr.markForCheck();

    // Remove from DOM after animation completes
    setTimeout(() => {
      this.visibleItems = this.visibleItems.filter((i) => i.name !== name);
      this.leaveTimers.delete(name);
      this.cdr.markForCheck();
    }, this.FINAL_FADE_MS);
  }

  private dissolveAll(): void {
    if (this.visibleItems.length === 0) return;
    // Cancel pending leave-timers; force all to leaving state
    this.leaveTimers.forEach((t) => clearTimeout(t));
    this.leaveTimers.clear();
    this.visibleItems = this.visibleItems.map((i) => ({ ...i, state: 'leaving' }));
    this.cdr.markForCheck();

    this.clearAllTimer = setTimeout(() => {
      this.visibleItems = [];
      this.cdr.markForCheck();
    }, this.FINAL_FADE_MS);
  }

  trackByName = (_: number, item: ToolHistoryItem) => item.name;
}
