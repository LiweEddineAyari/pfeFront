import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';

import { ChatMessage, ChatSession } from './models/chat.models';
import { SessionService } from './services/session.service';

import { SessionSidebarComponent } from './components/session-sidebar/session-sidebar.component';
import { ChatAreaComponent } from './components/chat-area/chat-area.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

interface DeleteDialogState {
  open: boolean;
  sessionId: string;
  sessionTitle: string;
}

interface RenameDialogState {
  open: boolean;
  sessionId: string;
  currentTitle: string;
}

@Component({
  selector: 'app-chatbot-page',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    SessionSidebarComponent,
    ChatAreaComponent,
    ConfirmDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="chatbot-shell flex gap-4 w-full"
      [class.mobile-sidebar-open]="mobileSidebarOpen()"
    >
      <!-- Sessions panel -->
      <aside
        class="session-panel shrink-0 transition-transform duration-300 ease-out"
        [class.is-mobile-hidden]="!mobileSidebarOpen()"
      >
        <app-session-sidebar
          [sessions]="sessions"
          [activeSessionId]="activeSessionId()"
          (selectSession)="onSelectSession($event)"
          (newChat)="onNewChat()"
          (renameSession)="onRenameSession($event)"
          (deleteSession)="onDeleteSession($event)"
        ></app-session-sidebar>
      </aside>

      <!-- Mobile drawer backdrop -->
      <div
        *ngIf="mobileSidebarOpen()"
        class="lg:hidden fixed inset-0 bg-black/40 z-30"
        (click)="mobileSidebarOpen.set(false)"
      ></div>

      <!-- Mobile open button -->
      <button
        type="button"
        class="lg:hidden fixed bottom-5 left-4 z-20 w-12 h-12 rounded-full bg-brand-primary text-white shadow-[0_10px_30px_rgba(1,181,116,0.4)] flex items-center justify-center"
        *ngIf="!mobileSidebarOpen()"
        (click)="mobileSidebarOpen.set(true)"
        aria-label="Ouvrir les conversations"
      >
        <lucide-icon name="MessageSquare" [size]="18" [strokeWidth]="2.5"></lucide-icon>
      </button>

      <!-- Chat area -->
      <div class="flex-1 min-w-0 chat-panel">
        <app-chat-area
          [session]="activeSession()"
          [initialMessages]="messages()"
          [showBackButton]="false"
          (back)="onNewChat()"
          (sessionCreated)="onSessionCreated($event)"
          (messageSent)="onMessageSent()"
          (messageCompleted)="onMessageCompleted()"
        ></app-chat-area>
      </div>

      <!-- ── Delete confirmation dialog ── -->
      <app-confirm-dialog
        [open]="deleteDialog().open"
        mode="confirm"
        variant="danger"
        iconName="alert-triangle"
        title="Confirmer la suppression"
        subtitle="Cette action est irréversible."
        question="Voulez-vous vraiment supprimer cette conversation ?"
        [value]="deleteDialog().sessionTitle"
        confirmLabel="Supprimer"
        confirmIcon="trash-2"
        cancelLabel="Annuler"
        (confirm)="confirmDelete()"
        (cancel)="closeDeleteDialog()"
      ></app-confirm-dialog>

      <!-- ── Rename dialog ── -->
      <app-confirm-dialog
        [open]="renameDialog().open"
        mode="prompt"
        variant="primary"
        iconName="pencil"
        title="Renommer la conversation"
        subtitle="Modifiez le titre de cette conversation."
        question="Nouveau titre :"
        [value]="renameDialog().currentTitle"
        placeholder="Titre de la conversation"
        confirmLabel="Enregistrer"
        confirmIcon="check"
        cancelLabel="Annuler"
        (confirm)="confirmRename($event)"
        (cancel)="closeRenameDialog()"
      ></app-confirm-dialog>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .chatbot-shell {
      height: calc(100vh - 180px);
      min-height: 540px;
    }

    .session-panel {
      width: 280px;
      height: 100%;
    }

    .chat-panel {
      height: 100%;
    }

    /* ── Tablet / mobile ── */
    @media (max-width: 1023px) {
      .session-panel {
        position: fixed;
        top: 16px;
        bottom: 16px;
        left: 16px;
        width: min(320px, 85vw);
        z-index: 40;
        transform: translateX(-110%);
      }
      .chatbot-shell.mobile-sidebar-open .session-panel {
        transform: translateX(0);
      }
      .session-panel.is-mobile-hidden {
        transform: translateX(-110%);
      }
    }

    @media (max-width: 767px) {
      .chatbot-shell {
        height: calc(100vh - 140px);
      }
    }
  `],
})
export class ChatbotPageComponent implements OnInit, OnDestroy {
  private sessionService = inject(SessionService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild(ChatAreaComponent) chatArea?: ChatAreaComponent;

  sessions: ChatSession[] = [];
  activeSessionId = signal<string | null>(null);
  activeSession = signal<ChatSession | null>(null);
  messages = signal<ChatMessage[]>([]);
  mobileSidebarOpen = signal(false);

  deleteDialog = signal<DeleteDialogState>({
    open: false,
    sessionId: '',
    sessionTitle: '',
  });
  renameDialog = signal<RenameDialogState>({
    open: false,
    sessionId: '',
    currentTitle: '',
  });

  private sub?: Subscription;
  private titlePollSub?: Subscription;

  async ngOnInit(): Promise<void> {
    this.sub = this.sessionService.sessions$.subscribe((list) => {
      this.sessions = list;
      // Refresh the active reference if it changed in the list (e.g. title arrived)
      const active = this.activeSessionId();
      if (active) {
        const fresh = list.find((s) => s.id === active);
        if (fresh) this.activeSession.set(fresh);
      }
      this.cdr.markForCheck();
    });

    await this.sessionService.listSessions();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.titlePollSub?.unsubscribe();
  }

  // ── handlers ───────────────────────────────────────────────────────────────

  async onSelectSession(id: string): Promise<void> {
    const session = this.sessions.find((s) => s.id === id) ?? null;
    this.activeSessionId.set(id);
    this.activeSession.set(session);
    this.messages.set([]);
    this.mobileSidebarOpen.set(false);

    if (session) {
      const messages = await this.sessionService.getMessages(id);
      this.messages.set(messages);
      this.cdr.markForCheck();
    }
  }

  onNewChat(): void {
    this.activeSessionId.set(null);
    this.activeSession.set(null);
    this.messages.set([]);
    this.mobileSidebarOpen.set(false);
  }

  // ── Rename dialog ──────────────────────────────────────────────────────────

  onRenameSession(id: string): void {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) return;
    this.renameDialog.set({
      open: true,
      sessionId: id,
      currentTitle: session.title ?? '',
    });
  }

  async confirmRename(newTitle: string): Promise<void> {
    const { sessionId } = this.renameDialog();
    const trimmed = newTitle.trim();
    this.closeRenameDialog();
    if (!sessionId || !trimmed) return;
    await this.sessionService.renameSession(sessionId, trimmed);
  }

  closeRenameDialog(): void {
    this.renameDialog.set({ open: false, sessionId: '', currentTitle: '' });
  }

  // ── Delete dialog ──────────────────────────────────────────────────────────

  onDeleteSession(id: string): void {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) return;
    this.deleteDialog.set({
      open: true,
      sessionId: id,
      sessionTitle: session.title ?? 'Conversation sans titre',
    });
  }

  async confirmDelete(): Promise<void> {
    const { sessionId } = this.deleteDialog();
    this.closeDeleteDialog();
    if (!sessionId) return;
    await this.sessionService.deleteSession(sessionId);
    if (this.activeSessionId() === sessionId) {
      this.onNewChat();
    }
  }

  closeDeleteDialog(): void {
    this.deleteDialog.set({ open: false, sessionId: '', sessionTitle: '' });
  }

  onSessionCreated(event: { id: string; isNew: boolean }): void {
    // SSE delivered a sessionId before any title is known
    this.activeSessionId.set(event.id);

    if (event.isNew) {
      const fresh: ChatSession = {
        id: event.id,
        title: null,
        lastMessageAt: new Date(),
        status: 'ACTIVE',
        isGeneratingTitle: true,
      };
      this.activeSession.set(fresh);
      this.sessionService.upsertLocal(fresh);

      // Start polling for the title
      this.titlePollSub?.unsubscribe();
      this.titlePollSub = this.sessionService.pollTitle(event.id).subscribe();
    } else {
      const existing = this.sessions.find((s) => s.id === event.id);
      if (existing) {
        this.activeSession.set(existing);
      }
    }
    this.cdr.markForCheck();
  }

  onMessageSent(): void {
    const active = this.activeSession();
    if (active) {
      const patch = { lastMessageAt: new Date() };
      this.activeSession.set({ ...active, ...patch });
      this.sessionService.patchLocal(active.id, patch);
    }
  }

  onMessageCompleted(): void {
    // Refresh sessions list to capture any title that arrived
    void this.sessionService.listSessions();
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.mobileSidebarOpen()) {
      this.mobileSidebarOpen.set(false);
    }
  }
}
