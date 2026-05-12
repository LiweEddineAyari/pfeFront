import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ChatSession } from '../../models/chat.models';
import { SessionItemComponent } from '../session-item/session-item.component';

interface SessionGroup {
  label: string;
  sessions: ChatSession[];
}

@Component({
  selector: 'app-session-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    SessionItemComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sb-shell">

      <!-- ── Header ── -->
      <div class="sb-header">
        <div class="sb-header-row">
          <div class="sb-brand">
            <div class="sb-brand-icon">
              <div class="sb-brand-aura"></div>
              <lucide-icon name="MessageSquare" [size]="13" [strokeWidth]="2.5"></lucide-icon>
            </div>
            <h2 class="sb-brand-title">Conversations</h2>
          </div>

          <button
            type="button"
            class="sb-icon-btn"
            [class.is-active]="showSearch()"
            (click)="toggleSearch()"
            aria-label="Rechercher"
          >
            <lucide-icon name="search" [size]="13" [strokeWidth]="2.5"></lucide-icon>
          </button>
        </div>

        <!-- Search slot -->
        <div
          class="sb-search-slot"
          [style.maxHeight]="showSearch() ? '42px' : '0px'"
          [style.opacity]="showSearch() ? '1' : '0'"
          [style.marginBottom]="showSearch() ? '10px' : '0'"
        >
          <div class="sb-search">
            <lucide-icon name="search" [size]="12" [strokeWidth]="2.5" class="sb-search-icon"></lucide-icon>
            <input
              type="text"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              placeholder="Rechercher..."
              class="sb-search-input"
            />
          </div>
        </div>

        <!-- New chat -->
        <button
          type="button"
          class="sb-new-btn"
          (click)="newChat.emit()"
        >
          <span class="sb-new-glow"></span>
          <lucide-icon name="plus" [size]="13" [strokeWidth]="3"></lucide-icon>
          <span>Nouvelle conversation</span>
        </button>
      </div>

      <!-- ── Session list ── -->
      <div class="sb-list">
        <ng-container *ngIf="groups().length > 0; else emptyList">
          <div *ngFor="let group of groups(); trackBy: trackByGroup" class="sb-group">
            <p class="sb-group-label">{{ group.label }}</p>
            <div class="sb-group-items">
              <app-session-item
                *ngFor="let session of group.sessions; trackBy: trackById"
                [session]="session"
                [active]="session.id === activeSessionId"
                (select)="selectSession.emit($event)"
                (rename)="renameSession.emit($event)"
                (delete)="deleteSession.emit($event)"
              ></app-session-item>
            </div>
          </div>
        </ng-container>

        <ng-template #emptyList>
          <div class="sb-empty">
            <div class="sb-empty-icon">
              <lucide-icon name="MessageSquare" [size]="16" [strokeWidth]="2"></lucide-icon>
            </div>
            <p class="sb-empty-line1">Aucune conversation</p>
            <p class="sb-empty-line2">Démarrez-en une nouvelle pour commencer.</p>
          </div>
        </ng-template>
      </div>

      <!-- ── Footer ── -->
      <div class="sb-footer">
        <span class="sb-status-dot"></span>
        FinanceGPT connecté
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .sb-shell {
      height: 100%;
      display: flex;
      flex-direction: column;
      background:
        radial-gradient(800px 320px at 50% -50%, rgba(1, 181, 116, 0.045), transparent 70%),
        var(--bg-card);
      border-radius: 18px;
      border: 1px solid var(--color-border);
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    }
    :host-context(html.dark) .sb-shell {
      background:
        radial-gradient(800px 320px at 50% -50%, rgba(1, 181, 116, 0.08), transparent 70%),
        var(--bg-card);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.32);
    }

    /* ── Header ── */
    .sb-header {
      flex-shrink: 0;
      padding: 14px 12px 12px;
      border-bottom: 1px solid var(--color-border);
      position: relative;
    }
    .sb-header::after {
      content: '';
      position: absolute;
      left: 16%; right: 16%; bottom: -1px;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
      opacity: 0.28;
    }

    .sb-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }

    .sb-brand {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }

    .sb-brand-icon {
      position: relative;
      width: 26px; height: 26px;
      border-radius: 9px;
      background: linear-gradient(135deg, var(--color-primary), #0a8f63);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow:
        0 3px 10px rgba(1, 181, 116, 0.34),
        inset 0 1px 0 rgba(255, 255, 255, 0.28);
    }
    .sb-brand-aura {
      position: absolute;
      inset: -4px;
      border-radius: 14px;
      background: radial-gradient(circle, rgba(1, 181, 116, 0.4), transparent 70%);
      filter: blur(5px);
      z-index: -1;
      animation: aura 3s ease-in-out infinite;
    }
    @keyframes aura {
      0%, 100% { opacity: 0.45; transform: scale(1); }
      50%      { opacity: 0.8;  transform: scale(1.12); }
    }

    .sb-brand-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.005em;
      margin: 0;
    }

    .sb-icon-btn {
      width: 28px; height: 28px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: all 160ms ease;
    }
    .sb-icon-btn:hover {
      background: rgba(15, 23, 42, 0.04);
      color: var(--text-primary);
    }
    :host-context(html.dark) .sb-icon-btn:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .sb-icon-btn.is-active {
      color: var(--color-primary);
      background: rgba(1, 181, 116, 0.1);
    }

    /* ── Search ── */
    .sb-search-slot {
      overflow: hidden;
      transition: all 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .sb-search {
      position: relative;
      display: flex;
      align-items: center;
    }
    .sb-search-icon {
      position: absolute;
      left: 9px;
      color: var(--text-secondary);
      opacity: 0.7;
    }
    .sb-search-input {
      width: 100%;
      padding: 7px 10px 7px 26px;
      font-size: 12px;
      border-radius: 9px;
      border: 1px solid var(--color-border);
      background: var(--bg-page);
      color: var(--text-primary);
      outline: none;
      transition: all 160ms ease;
      font-family: inherit;
    }
    .sb-search-input::placeholder { color: var(--text-secondary); opacity: 0.7; }
    .sb-search-input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(1, 181, 116, 0.15);
    }

    /* ── New chat button ── */
    .sb-new-btn {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 14px;
      border-radius: 11px;
      border: 1px solid rgba(1, 181, 116, 0.30);
      background: linear-gradient(135deg, rgba(1, 181, 116, 0.08), rgba(1, 181, 116, 0.04));
      color: var(--color-primary);
      font-size: 12.5px;
      font-weight: 700;
      letter-spacing: 0.005em;
      transition: all 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
      overflow: hidden;
    }
    .sb-new-btn:hover {
      background: linear-gradient(135deg, var(--color-primary), #0a8f63);
      color: white;
      border-color: var(--color-primary);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(1, 181, 116, 0.36);
    }
    .sb-new-btn:active { transform: scale(0.97); }
    .sb-new-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(255, 255, 255, 0.18), transparent 60%);
      opacity: 0;
      transition: opacity 200ms ease;
      pointer-events: none;
    }
    .sb-new-btn:hover .sb-new-glow { opacity: 1; }

    /* ── List ── */
    .sb-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 10px 8px;
    }
    .sb-list::-webkit-scrollbar { width: 4px; display: block; }
    .sb-list::-webkit-scrollbar-track { background: transparent; }
    .sb-list::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.3);
      border-radius: 4px;
    }
    .sb-list:hover::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.5); }

    .sb-group { margin-bottom: 14px; }
    .sb-group-label {
      padding: 0 9px;
      margin: 0 0 6px 0;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text-secondary);
      opacity: 0.7;
    }
    .sb-group-items {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sb-empty {
      padding: 36px 16px;
      text-align: center;
    }
    .sb-empty-icon {
      width: 44px; height: 44px;
      margin: 0 auto 10px;
      border-radius: 14px;
      background: rgba(1, 181, 116, 0.08);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sb-empty-line1 {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 4px 0;
    }
    .sb-empty-line2 {
      font-size: 11px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.4;
    }

    /* ── Footer ── */
    .sb-footer {
      flex-shrink: 0;
      padding: 9px 14px;
      border-top: 1px solid var(--color-border);
      font-size: 10.5px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 500;
      letter-spacing: 0.01em;
    }
    .sb-status-dot {
      width: 6px; height: 6px;
      border-radius: 999px;
      background: var(--color-primary);
      box-shadow: 0 0 8px rgba(1, 181, 116, 0.65);
      animation: dotPulse 2s ease-in-out infinite;
    }
    @keyframes dotPulse {
      0%, 100% { opacity: 0.6; transform: scale(0.9); }
      50%      { opacity: 1;   transform: scale(1.1); }
    }
  `],
})
export class SessionSidebarComponent {
  @Input() set sessions(value: ChatSession[]) {
    this._sessions.set(value ?? []);
  }
  @Input() activeSessionId: string | null = null;

  @Output() selectSession = new EventEmitter<string>();
  @Output() newChat = new EventEmitter<void>();
  @Output() renameSession = new EventEmitter<string>();
  @Output() deleteSession = new EventEmitter<string>();

  private _sessions = signal<ChatSession[]>([]);
  showSearch = signal(false);
  searchTerm = signal('');

  groups = computed<SessionGroup[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filtered = term
      ? this._sessions().filter((s) =>
          (s.title ?? '').toLowerCase().includes(term)
        )
      : this._sessions();

    return groupSessions(filtered);
  });

  toggleSearch(): void {
    const next = !this.showSearch();
    this.showSearch.set(next);
    if (!next) this.searchTerm.set('');
  }

  trackById = (_: number, s: ChatSession) => s.id;
  trackByGroup = (_: number, g: SessionGroup) => g.label;
}

function groupSessions(sessions: ChatSession[]): SessionGroup[] {
  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const week: ChatSession[] = [];
  const month: ChatSession[] = [];
  const older: ChatSession[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 3600_000;
  const startOfWeek = startOfToday - 7 * 24 * 3600_000;
  const startOfMonth = startOfToday - 30 * 24 * 3600_000;

  const sorted = [...sessions].sort((a, b) => {
    const ta = a.lastMessageAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
    const tb = b.lastMessageAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
    return tb - ta;
  });

  for (const s of sorted) {
    const t = s.lastMessageAt?.getTime() ?? s.createdAt?.getTime() ?? 0;
    if (t >= startOfToday) today.push(s);
    else if (t >= startOfYesterday) yesterday.push(s);
    else if (t >= startOfWeek) week.push(s);
    else if (t >= startOfMonth) month.push(s);
    else older.push(s);
  }

  const groups: SessionGroup[] = [];
  if (today.length) groups.push({ label: "Aujourd'hui", sessions: today });
  if (yesterday.length) groups.push({ label: 'Hier', sessions: yesterday });
  if (week.length) groups.push({ label: 'Cette semaine', sessions: week });
  if (month.length) groups.push({ label: 'Ce mois', sessions: month });
  if (older.length) groups.push({ label: 'Plus ancien', sessions: older });
  return groups;
}
