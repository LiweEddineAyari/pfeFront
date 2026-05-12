import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';

import {
  ChatEvent,
  ChatMessage,
  ChatSession,
  DoneEventData,
  ErrorEventData,
  RagSource,
  RagSourcesEventData,
  SessionEventData,
  StreamingState,
  TokenEventData,
  ToolCardState,
  ToolExecutedEventData,
  getToolIcon,
  getToolLabel,
} from '../../models/chat.models';
import { ChatStreamService } from '../../services/chat-stream.service';
import { ThemeService } from '../../../../core/services/theme.service';

import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';
import { ChatInputComponent } from '../chat-input/chat-input.component';

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    EmptyStateComponent,
    MessageBubbleComponent,
    ChatInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-shell">

      <!-- ─── Header ─────────────────────────────────────── -->
      <header class="chat-header">
        <button
          *ngIf="showBackButton"
          type="button"
          class="lg:hidden header-icon-btn"
          (click)="back.emit()"
          aria-label="Retour"
        >
          <lucide-icon name="arrow-left" [size]="15" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <div class="header-id">
          <div class="header-brand">
            <div class="header-brand-aura"></div>
            <lucide-icon name="sparkles" [size]="14" [strokeWidth]="2.5"></lucide-icon>
          </div>
          <div class="header-title-wrap">
            <ng-container *ngIf="session?.title; else titlePending">
              <h1 class="header-title" [style.animation]="'titleReveal 420ms ease-out both'">
                {{ session?.title }}
              </h1>
            </ng-container>
            <ng-template #titlePending>
              <ng-container *ngIf="session?.isGeneratingTitle; else newConv">
                <div class="skeleton-line h-3 w-[180px] rounded"></div>
              </ng-container>
              <ng-template #newConv>
                <h1 class="header-title header-title-muted">FinanceGPT</h1>
              </ng-template>
            </ng-template>
            <p class="header-sub" *ngIf="messages.length > 0">
              {{ messages.length }} message{{ messages.length > 1 ? 's' : '' }}
              <ng-container *ngIf="streamingState !== 'idle' && streamingState !== 'done'">
                <span class="header-sub-dot">·</span>
                <span class="header-sub-status">{{ streamingLabel }}</span>
              </ng-container>
            </p>
            <p class="header-sub header-sub-muted" *ngIf="messages.length === 0">
              Assistant prudentiel · ratios · stress tests
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="header-icon-btn"
            (click)="toggleTheme()"
            [attr.aria-label]="isDark() ? 'Mode clair' : 'Mode sombre'"
          >
            <lucide-icon
              [name]="isDark() ? 'sun' : 'moon'"
              [size]="14"
              [strokeWidth]="2.5"
              class="theme-icon"
            ></lucide-icon>
          </button>
          <button
            *ngIf="session"
            type="button"
            class="header-icon-btn"
            aria-label="Plus d'options"
          >
            <lucide-icon name="more-horizontal" [size]="14" [strokeWidth]="2.5"></lucide-icon>
          </button>
        </div>
      </header>

      <!-- ─── Messages viewport ──────────────────────────── -->
      <div
        #viewport
        class="chat-viewport"
        (scroll)="onScroll()"
      >
        <!-- decorative ambient blobs -->
        <div class="ambient-bg" aria-hidden="true">
          <div class="ambient-blob ab-1"></div>
          <div class="ambient-blob ab-2"></div>
        </div>

        <!-- Empty state -->
        <ng-container *ngIf="messages.length === 0 && !inFlightAi">
          <div class="empty-wrap">
            <app-empty-state (select)="onSuggestion($event)"></app-empty-state>
          </div>
        </ng-container>

        <!-- Messages -->
        <div
          *ngIf="messages.length > 0 || inFlightAi"
          class="messages-rail"
        >
          <app-message-bubble
            *ngFor="let msg of messages; trackBy: trackByMessage"
            [message]="msg"
            [userInitials]="userInitials"
          ></app-message-bubble>
        </div>

        <!-- Scroll-to-bottom pill -->
        <button
          *ngIf="showScrollToBottom()"
          type="button"
          class="scroll-pill"
          [style.animation]="'pillFade 220ms ease-out'"
          (click)="scrollToBottom(true)"
        >
          <lucide-icon name="arrow-down" [size]="12" [strokeWidth]="2.75"></lucide-icon>
          Voir la suite
        </button>
      </div>

      <!-- ─── Input area ─────────────────────────────────── -->
      <div class="chat-input-wrap">
        <app-chat-input
          #input
          [isStreaming]="isStreaming"
          [disabled]="false"
          [showQuickChips]="messages.length === 0"
          (send)="onSend($event)"
          (cancel)="cancelStream()"
        ></app-chat-input>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .chat-shell {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
      background:
        radial-gradient(1200px 360px at 50% -20%, rgba(1, 181, 116, 0.045), transparent 70%),
        var(--bg-card);
      border-radius: 18px;
      border: 1px solid var(--color-border);
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    }
    :host-context(html.dark) .chat-shell {
      background:
        radial-gradient(1200px 360px at 50% -20%, rgba(1, 181, 116, 0.10), transparent 70%),
        var(--bg-card);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.32);
    }

    /* ── Header ── */
    .chat-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--color-border);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%);
      backdrop-filter: blur(10px);
      position: relative;
    }
    :host-context(html.dark) .chat-header {
      background:
        linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
    }
    .chat-header::after {
      content: '';
      position: absolute;
      left: 12%;
      right: 12%;
      bottom: -1px;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
      opacity: 0.32;
    }

    .header-id {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .header-brand {
      position: relative;
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: linear-gradient(135deg, var(--color-primary) 0%, #0a8f63 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 4px 14px rgba(1, 181, 116, 0.32),
        inset 0 1px 0 rgba(255, 255, 255, 0.28);
      flex-shrink: 0;
    }
    .header-brand-aura {
      position: absolute;
      inset: -4px;
      border-radius: 14px;
      background: radial-gradient(circle, rgba(1, 181, 116, 0.35), transparent 70%);
      filter: blur(6px);
      animation: aura 3s ease-in-out infinite;
      z-index: -1;
    }
    @keyframes aura {
      0%, 100% { opacity: 0.45; transform: scale(1); }
      50%      { opacity: 0.75; transform: scale(1.12); }
    }

    .header-title-wrap { min-width: 0; flex: 1; }
    .header-title {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
      line-height: 1.2;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-title-muted {
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: 0.02em;
    }
    .header-sub {
      font-size: 11px;
      color: var(--text-secondary);
      margin: 2px 0 0 0;
      line-height: 1.3;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .header-sub-muted { font-style: italic; opacity: 0.85; }
    .header-sub-dot { opacity: 0.6; }
    .header-sub-status {
      color: var(--color-primary);
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .header-actions { display: flex; gap: 4px; }

    .header-icon-btn {
      width: 32px; height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: all 160ms ease;
    }
    .header-icon-btn:hover {
      background: rgba(15, 23, 42, 0.045);
      color: var(--text-primary);
      transform: translateY(-1px);
    }
    :host-context(html.dark) .header-icon-btn:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .theme-icon { transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1); }
    .header-icon-btn:hover .theme-icon { transform: rotate(180deg) scale(1.06); }

    /* ── Viewport ── */
    .chat-viewport {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      position: relative;
      scroll-behavior: smooth;
    }
    .chat-viewport::-webkit-scrollbar { width: 6px; display: block; }
    .chat-viewport::-webkit-scrollbar-track { background: transparent; }
    .chat-viewport::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.28);
      border-radius: 6px;
    }
    .chat-viewport:hover::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.45);
    }

    /* Subtle ambient color washes */
    .ambient-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .ambient-blob {
      position: absolute;
      width: 420px;
      height: 420px;
      border-radius: 999px;
      filter: blur(60px);
      opacity: 0.12;
    }
    .ab-1 {
      top: -120px;
      left: -120px;
      background: radial-gradient(circle, var(--color-primary), transparent 70%);
    }
    .ab-2 {
      bottom: -160px;
      right: -160px;
      background: radial-gradient(circle, #6366f1, transparent 70%);
      opacity: 0.08;
    }

    .empty-wrap {
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      position: relative;
      z-index: 1;
    }

    .messages-rail {
      padding: 24px 22px 28px;
      max-width: 940px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: relative;
      z-index: 1;
    }

    .scroll-pill {
      position: absolute;
      bottom: 14px;
      right: 18px;
      z-index: 10;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 999px;
      background: var(--color-primary);
      color: white;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.01em;
      box-shadow:
        0 8px 24px rgba(1, 181, 116, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.22);
      transition: all 160ms ease;
    }
    .scroll-pill:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(1, 181, 116, 0.55);
    }

    /* ── Input ── */
    .chat-input-wrap {
      flex-shrink: 0;
      position: relative;
      padding: 12px 0 14px;
      border-top: 1px solid var(--color-border);
      background:
        linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.012) 100%);
      backdrop-filter: blur(6px);
    }
    :host-context(html.dark) .chat-input-wrap {
      background:
        linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.01) 100%);
    }
    .chat-input-wrap::before {
      content: '';
      position: absolute;
      top: -1px;
      left: 12%;
      right: 12%;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
      opacity: 0.28;
    }

    /* Skeleton */
    .skeleton-line {
      background: linear-gradient(90deg, var(--color-border) 25%, var(--bg-page) 50%, var(--color-border) 75%);
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
    @keyframes pillFade {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class ChatAreaComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() session: ChatSession | null = null;
  @Input() set initialMessages(value: ChatMessage[] | null) {
    this.messages = value ?? [];
  }
  @Input() showBackButton = false;
  @Input() userInitials = 'AP';

  @Output() back = new EventEmitter<void>();
  @Output() sessionCreated = new EventEmitter<{ id: string; isNew: boolean }>();
  @Output() messageSent = new EventEmitter<void>();
  @Output() messageCompleted = new EventEmitter<void>();

  @ViewChild('viewport') viewportEl?: ElementRef<HTMLDivElement>;
  @ViewChild('input') inputEl?: ChatInputComponent;

  private chatStream = inject(ChatStreamService);
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);

  messages: ChatMessage[] = [];
  streamingState: StreamingState = 'idle';
  private subscription?: Subscription;

  // Scroll behavior
  private shouldAutoScroll = true;
  private wasNearBottom = true;
  showScrollToBottom = signal(false);

  isDark = signal(this.themeService.isDark);

  constructor() {
    this.themeService.isDark$.subscribe((v) => {
      this.isDark.set(v);
      this.cdr.markForCheck();
    });
  }

  get isStreaming(): boolean {
    return (
      this.streamingState === 'thinking' ||
      this.streamingState === 'tool-running' ||
      this.streamingState === 'streaming'
    );
  }

  get inFlightAi(): boolean {
    return this.messages.length > 0 && this.messages[this.messages.length - 1].isStreaming;
  }

  get streamingLabel(): string {
    switch (this.streamingState) {
      case 'thinking':
        return 'Reflexion...';
      case 'tool-running':
        return 'Calcul en cours...';
      case 'streaming':
        return 'Redaction...';
      default:
        return '';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const sChange = changes['session'];
    if (!sChange) return;

    const prev = sChange.previousValue as ChatSession | null | undefined;
    const curr = sChange.currentValue as ChatSession | null | undefined;
    const prevId = prev?.id ?? null;
    const currId = curr?.id ?? null;

    // The parent re-emits the session reference when its title/lastMessageAt
    // updates — that is NOT a user-initiated switch. Same id = noop.
    if (prevId === currId) return;

    // A new session was just born from the SSE `session` event: prevId is null
    // and the AI bubble is mid-stream. Cancelling here would abort the live
    // SSE connection that ATTACHED that id in the first place. Don't.
    if (prevId === null && this.isStreaming) return;

    this.shouldAutoScroll = true;
    this.cancelStream();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll) {
      this.scrollToBottom(false);
    }
  }

  // ── public ─────────────────────────────────────────────────────────────────

  onSuggestion(prompt: string): void {
    this.inputEl?.prefill(prompt);
  }

  onSend(text: string): void {
    if (this.isStreaming) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'USER',
      content: text,
      toolCards: [],
      ragSources: [],
      isStreaming: false,
      createdAt: new Date(),
    };
    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'AI',
      content: '',
      streamingContent: '',
      toolCards: [],
      ragSources: [],
      isStreaming: true,
      createdAt: new Date(),
    };

    this.messages = [...this.messages, userMsg, aiMsg];
    this.streamingState = 'thinking';
    this.shouldAutoScroll = true;
    this.messageSent.emit();
    this.cdr.markForCheck();

    this.subscription?.unsubscribe();
    this.subscription = this.chatStream
      .streamChat(text, this.session?.id ?? null)
      .subscribe({
        next: (event: ChatEvent) => this.handleEvent(event, aiMsg),
        error: (err) => {
          aiMsg.isStreaming = false;
          aiMsg.error = err?.message ?? 'Erreur de streaming.';
          this.streamingState = 'idle';
          this.refreshAiMessage(aiMsg);
          this.messageCompleted.emit();
          this.cdr.markForCheck();
        },
        complete: () => {
          if (aiMsg.isStreaming) {
            aiMsg.isStreaming = false;
            aiMsg.content = aiMsg.streamingContent ?? '';
            this.streamingState = 'done';
            this.refreshAiMessage(aiMsg);
            this.messageCompleted.emit();
            this.cdr.markForCheck();
          }
        },
      });
  }

  /**
   * Replace the AI message slot in `this.messages` with a fresh shallow copy.
   * This is REQUIRED for OnPush children (MessageBubble, ToolExecutionCard,
   * StreamingText) to detect that their `@Input message` has changed during
   * streaming — otherwise we mutate the same object reference and they never
   * re-render.
   */
  private refreshAiMessage(aiMsg: ChatMessage): void {
    const idx = this.messages.findIndex((m) => m.id === aiMsg.id);
    if (idx < 0) return;
    const replacement: ChatMessage = { ...aiMsg };
    this.messages = [
      ...this.messages.slice(0, idx),
      replacement,
      ...this.messages.slice(idx + 1),
    ];
  }

  cancelStream(): void {
    if (!this.subscription) return;
    this.subscription.unsubscribe();
    this.subscription = undefined;

    const last = this.messages[this.messages.length - 1];
    if (last?.isStreaming) {
      last.isStreaming = false;
      last.cancelled = true;
      last.content =
        (last.streamingContent ?? '') +
        (last.streamingContent ? '\n\n*[reponse interrompue]*' : '*[reponse interrompue]*');
      this.refreshAiMessage(last);
    }
    this.streamingState = 'idle';
    this.messageCompleted.emit();
    this.cdr.markForCheck();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  // ── scroll handling ────────────────────────────────────────────────────────

  onScroll(): void {
    const el = this.viewportEl?.nativeElement;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    const nearBottom = distanceFromBottom < 80;

    if (nearBottom !== this.wasNearBottom) {
      this.wasNearBottom = nearBottom;
      this.shouldAutoScroll = nearBottom;
      this.showScrollToBottom.set(!nearBottom && this.messages.length > 0);
      this.cdr.markForCheck();
    }
  }

  scrollToBottom(smooth = false): void {
    const el = this.viewportEl?.nativeElement;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    this.shouldAutoScroll = true;
    this.wasNearBottom = true;
    if (this.showScrollToBottom()) {
      this.showScrollToBottom.set(false);
    }
  }

  // ── SSE event router ───────────────────────────────────────────────────────

  private handleEvent(event: ChatEvent, aiMsg: ChatMessage): void {
    switch (event.type) {
      case 'session': {
        const data = event.data as SessionEventData;
        if (data?.sessionId) {
          this.sessionCreated.emit({
            id: data.sessionId,
            isNew: !!data.isNew,
          });
        }
        break;
      }

      case 'tool_executed': {
        this.streamingState = 'tool-running';
        this.upsertToolCard(aiMsg, event.data as ToolExecutedEventData);
        break;
      }

      case 'token': {
        this.streamingState = 'streaming';
        const data = event.data as TokenEventData;
        aiMsg.streamingContent = (aiMsg.streamingContent ?? '') + (data.text ?? '');
        break;
      }

      case 'rag_sources': {
        const data = event.data as RagSourcesEventData;
        if (Array.isArray(data?.sources)) {
          aiMsg.ragSources = [...aiMsg.ragSources, ...this.dedupeSources(aiMsg.ragSources, data.sources)];
        }
        break;
      }

      case 'done': {
        aiMsg.isStreaming = false;
        aiMsg.content = aiMsg.streamingContent ?? '';
        this.streamingState = 'done';
        this.messageCompleted.emit();
        break;
      }

      case 'error': {
        const data = event.data as ErrorEventData;
        aiMsg.isStreaming = false;
        aiMsg.error = data?.message ?? 'Erreur inconnue.';
        this.streamingState = 'idle';
        this.messageCompleted.emit();
        break;
      }
    }

    // Critical for OnPush: produce a NEW message reference so the child
    // MessageBubble / ToolExecutionCard / StreamingText re-render. Skip for
    // the 'session' event since it doesn't touch the AI message.
    if (event.type !== 'session') {
      this.refreshAiMessage(aiMsg);
    }

    if (this.shouldAutoScroll) {
      // After applying state, schedule a scroll
      queueMicrotask(() => this.scrollToBottom(false));
    }
    this.cdr.markForCheck();
  }

  private upsertToolCard(aiMsg: ChatMessage, data: ToolExecutedEventData): void {
    const idx = aiMsg.toolCards.findIndex((c) => c.name === data.name && c.state !== 'done');
    const hasResult = data.result !== undefined && data.result !== null;

    if (idx === -1) {
      const card: ToolCardState = {
        name: data.name,
        label: getToolLabel(data.name),
        icon: getToolIcon(data.name),
        args: data.args ?? {},
        result: data.result,
        state: hasResult ? 'done' : 'running',
        startTime: Date.now(),
        duration: hasResult ? 0 : undefined,
      };
      aiMsg.toolCards = [...aiMsg.toolCards, card];
    } else {
      const existing = aiMsg.toolCards[idx];
      const updated: ToolCardState = {
        ...existing,
        args: data.args ?? existing.args,
        result: data.result,
        state: 'done',
        duration: Date.now() - existing.startTime,
      };
      const next = [...aiMsg.toolCards];
      next[idx] = updated;
      aiMsg.toolCards = next;
    }
  }

  private dedupeSources(existing: RagSource[], incoming: RagSource[]): RagSource[] {
    const seen = new Set(existing.map((s) => `${s.documentType}|${s.text}`));
    return incoming.filter((s) => {
      const key = `${s.documentType}|${s.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  trackByMessage = (_: number, m: ChatMessage) => m.id;
}
