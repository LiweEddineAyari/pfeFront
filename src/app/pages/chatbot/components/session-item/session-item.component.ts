import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ChatSession } from '../../models/chat.models';

@Component({
  selector: 'app-session-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="group/sess relative pl-3 pr-2 py-2.5 rounded-[10px] cursor-pointer transition-all duration-150 ease-out border-l-[3px]"
      [ngClass]="{
        'bg-brand-primary/[0.08] dark:bg-brand-primary/[0.12] border-brand-primary': active,
        'border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.04]': !active
      }"
      (click)="select.emit(session.id)"
    >
      <div class="flex items-start gap-2">
        <!-- Title block -->
        <div class="flex-1 min-w-0">
          <!-- Title -->
          <ng-container *ngIf="session.title; else titleSkeleton">
            <p
              class="text-[13px] leading-snug truncate transition-colors"
              [ngClass]="active
                ? 'font-semibold text-[#0f172a] dark:text-white'
                : 'font-medium text-[#334155] dark:text-[#cbd5e1]'"
              [style.animation]="'titleReveal 380ms ease-out both'"
            >
              {{ session.title }}
            </p>
          </ng-container>

          <ng-template #titleSkeleton>
            <div class="space-y-1.5 py-0.5">
              <div class="skeleton-line h-[10px] w-3/4 rounded"></div>
              <div class="skeleton-line h-[8px] w-1/2 rounded"></div>
            </div>
          </ng-template>

          <!-- Timestamp -->
          <p
            class="text-[11px] mt-1 text-[#94a3b8] dark:text-[#64748b] font-medium"
            *ngIf="session.title"
          >
            {{ relativeTime }}
          </p>
        </div>

        <!-- 3-dot menu -->
        <button
          type="button"
          class="shrink-0 w-7 h-7 rounded-[8px] flex items-center justify-center text-[#94a3b8] dark:text-[#64748b] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#0f172a] dark:hover:text-white opacity-0 group-hover/sess:opacity-100 transition-all duration-150"
          [class.opacity-100]="menuOpen"
          (click)="toggleMenu($event)"
          aria-label="Options de la conversation"
        >
          <lucide-icon name="more-horizontal" [size]="14" [strokeWidth]="2.5"></lucide-icon>
        </button>
      </div>

      <!-- Mini dropdown -->
      <div
        *ngIf="menuOpen"
        class="absolute right-2 top-[36px] z-30 w-[140px] rounded-[10px] border border-black/5 dark:border-white/10 bg-white dark:bg-[#111c44] shadow-[0_10px_30px_rgba(0,0,0,0.12)] py-1 origin-top-right"
        [style.animation]="'fadeInScale 140ms ease-out both'"
        (click)="$event.stopPropagation()"
      >
        <button
          type="button"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[#334155] dark:text-[#cbd5e1] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          (click)="onRename()"
        >
          <lucide-icon name="pencil" [size]="12" [strokeWidth]="2.5"></lucide-icon>
          Renommer
        </button>
        <button
          type="button"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          (click)="onDelete()"
        >
          <lucide-icon name="trash-2" [size]="12" [strokeWidth]="2.5"></lucide-icon>
          Supprimer
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .skeleton-line {
      background: linear-gradient(
        90deg,
        var(--chat-skeleton-base, #e2e8f0) 25%,
        var(--chat-skeleton-shine, #f8fafc) 50%,
        var(--chat-skeleton-base, #e2e8f0) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
    }

    @keyframes shimmer {
      0%   { background-position: 200% center; }
      100% { background-position: -200% center; }
    }

    @keyframes titleReveal {
      from { opacity: 0; transform: translateX(-6px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    @keyframes fadeInScale {
      from { opacity: 0; transform: scale(0.94); }
      to   { opacity: 1; transform: scale(1); }
    }
  `],
})
export class SessionItemComponent {
  @Input({ required: true }) session!: ChatSession;
  @Input() active = false;

  @Output() select = new EventEmitter<string>();
  @Output() rename = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  menuOpen = false;

  get relativeTime(): string {
    if (!this.session.lastMessageAt) return '';
    return formatRelative(this.session.lastMessageAt);
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  onRename(): void {
    this.menuOpen = false;
    this.rename.emit(this.session.id);
  }

  onDelete(): void {
    this.menuOpen = false;
    this.delete.emit(this.session.id);
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick(): void {
    if (this.menuOpen) {
      this.menuOpen = false;
    }
  }
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
