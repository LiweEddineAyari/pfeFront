import {
  ChangeDetectionStrategy,
  Component,
  Input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RagSource, getRagStyle } from '../../models/chat.models';

@Component({
  selector: 'app-rag-sources-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      *ngIf="sources.length > 0"
      class="border-t border-[var(--color-border)]/60 pt-2 mt-2"
    >
      <button
        type="button"
        class="w-full flex items-center justify-between gap-2 px-1 py-1.5 rounded-[8px] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
        (click)="toggle()"
      >
        <span class="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-secondary)]">
          <lucide-icon name="book-open" [size]="13" [strokeWidth]="2.5"></lucide-icon>
          Sources utilisees
          <span
            class="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary"
          >
            {{ sources.length }}
          </span>
        </span>
        <lucide-icon
          name="chevron-down"
          [size]="13"
          [strokeWidth]="2.5"
          class="text-[var(--text-secondary)] transition-transform duration-200"
          [style.transform]="expanded() ? 'rotate(180deg)' : 'rotate(0deg)'"
        ></lucide-icon>
      </button>

      <div
        class="grid transition-all duration-250 ease-out"
        [style.gridTemplateRows]="expanded() ? '1fr' : '0fr'"
        [style.opacity]="expanded() ? '1' : '0'"
      >
        <div class="overflow-hidden">
          <div class="pt-2 pb-1 space-y-1.5">
            <div
              *ngFor="let src of sources; let i = index; trackBy: trackBy"
              class="rag-source flex items-start gap-2 p-2 rounded-[8px] bg-black/[0.02] dark:bg-white/[0.025] border border-[var(--color-border)]/50 hover:border-[var(--color-border)] transition-all"
              [style.animation]="'sourceIn 220ms ease-out both'"
              [style.animationDelay]="(i * 40) + 'ms'"
            >
              <!-- Document type badge -->
              <span
                class="shrink-0 text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded-[5px] uppercase border"
                [ngClass]="badgeClasses(src)"
              >
                {{ getStyle(src).label }}
                <span *ngIf="src.ratioCode" class="opacity-70">/{{ src.ratioCode }}</span>
              </span>

              <!-- Text -->
              <p class="text-[11.5px] leading-snug text-[var(--text-primary)]/85 line-clamp-3 flex-1 min-w-0">
                {{ src.title || src.text }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    @keyframes sourceIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `],
})
export class RagSourcesPanelComponent {
  @Input() sources: RagSource[] = [];

  expanded = signal(false);

  toggle(): void {
    this.expanded.update((v) => !v);
  }

  getStyle(src: RagSource) {
    return getRagStyle(src.documentType);
  }

  badgeClasses(src: RagSource): string {
    const s = this.getStyle(src);
    return `${s.bg} ${s.text} ${s.border}`;
  }

  trackBy = (i: number, src: RagSource) => `${src.documentType}-${i}`;
}
