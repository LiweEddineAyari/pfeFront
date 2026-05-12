import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ChatMessage } from '../../models/chat.models';
import { StreamingTextComponent } from '../streaming-text/streaming-text.component';
import { RagSourcesPanelComponent } from '../rag-sources-panel/rag-sources-panel.component';
import { ToolStatusComponent } from '../tool-status/tool-status.component';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    StreamingTextComponent,
    RagSourcesPanelComponent,
    ToolStatusComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="msg-row"
      [class.msg-user]="isUser"
      [class.msg-ai]="!isUser"
      [style.animation]="(isUser ? 'msgInRight' : 'msgInLeft') + ' 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both'"
    >
      <!-- Avatar (only AI gets a visible avatar; user is implicit) -->
      <div class="avatar" *ngIf="!isUser">
        <div class="avatar-ai">
          <div class="avatar-aura"></div>
          <lucide-icon name="sparkles" [size]="13" [strokeWidth]="2.5"></lucide-icon>
        </div>
      </div>

      <!-- Bubble -->
      <div class="bubble" [class.bubble-user]="isUser" [class.bubble-ai]="!isUser">

        <!-- USER -->
        <ng-container *ngIf="isUser">
          <p class="user-text">{{ message.content }}</p>
        </ng-container>

        <!-- AI -->
        <ng-container *ngIf="!isUser">

          <!-- Ephemeral tool status chips -->
          <app-tool-status
            *ngIf="message.toolCards.length > 0 || (message.isStreaming && aiText.length === 0)"
            [tools]="message.toolCards"
            [done]="aiText.length > 0 || !message.isStreaming"
          ></app-tool-status>

          <!-- Thinking dots (no text + no tools yet) -->
          <div
            *ngIf="message.isStreaming && aiText.length === 0 && message.toolCards.length === 0"
            class="thinking"
          >
            <span class="t-dot td1"></span>
            <span class="t-dot td2"></span>
            <span class="t-dot td3"></span>
            <span class="thinking-text">Réflexion en cours</span>
          </div>

          <!-- Streamed text -->
          <app-streaming-text
            *ngIf="aiText.length > 0"
            [text]="aiText"
            [streaming]="message.isStreaming"
          ></app-streaming-text>

          <!-- Error -->
          <div *ngIf="message.error" class="err">
            <lucide-icon name="alert-circle" [size]="13" [strokeWidth]="2.5"></lucide-icon>
            <span>{{ message.error }}</span>
          </div>

          <!-- RAG sources -->
          <app-rag-sources-panel
            *ngIf="!message.isStreaming && message.ragSources.length > 0"
            [sources]="message.ragSources"
          ></app-rag-sources-panel>

        </ng-container>
      </div>

      <!-- User badge (initials, subtle) -->
      <div class="avatar" *ngIf="isUser">
        <div class="avatar-user">{{ userInitials }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .msg-row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }
    .msg-user  { justify-content: flex-end; }
    .msg-ai    { justify-content: flex-start; }

    .avatar { flex-shrink: 0; }

    .avatar-ai {
      position: relative;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--color-primary) 0%, #0a8f63 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 4px 14px rgba(1, 181, 116, 0.36),
        inset 0 1px 0 rgba(255, 255, 255, 0.32);
    }

    .avatar-aura {
      position: absolute;
      inset: -3px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(1,181,116,0.35), transparent 70%);
      filter: blur(4px);
      animation: aura 3.2s ease-in-out infinite;
      z-index: -1;
    }
    @keyframes aura {
      0%, 100% { opacity: 0.55; transform: scale(1); }
      50%      { opacity: 0.85; transform: scale(1.15); }
    }

    .avatar-user {
      width: 26px;
      height: 26px;
      border-radius: 999px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.30);
    }

    .bubble {
      min-width: 0;
      padding: 11px 14px;
      transition: all 200ms ease-out;
      backdrop-filter: blur(8px);
    }

    .bubble-user {
      max-width: min(640px, 78%);
      width: fit-content;
      background: linear-gradient(135deg, var(--color-primary) 0%, #00a06a 100%);
      color: white;
      border-radius: 18px 18px 4px 18px;
      box-shadow:
        0 4px 14px rgba(1, 181, 116, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.18);
    }

    .user-text {
      font-size: 13.5px;
      line-height: 1.55;
      color: white;
      white-space: pre-wrap;
      letter-spacing: 0.005em;
      margin: 0;
    }

    .bubble-ai {
      max-width: min(760px, 92%);
      width: 100%;
      background: var(--bg-card);
      color: var(--text-primary);
      border-radius: 4px 18px 18px 18px;
      border: 1px solid var(--color-border);
      box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.04),
        0 8px 24px rgba(15, 23, 42, 0.04);
    }

    :host-context(html.dark) .bubble-ai {
      background: linear-gradient(180deg, var(--bg-card) 0%, rgba(17, 28, 68, 0.94) 100%);
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.04) inset,
        0 6px 24px rgba(0, 0, 0, 0.36);
    }

    @keyframes msgInRight {
      from { opacity: 0; transform: translateX(12px) translateY(2px); }
      to   { opacity: 1; transform: translateX(0) translateY(0); }
    }
    @keyframes msgInLeft {
      from { opacity: 0; transform: translateX(-6px) scale(0.985); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }

    /* Thinking pulse */
    .thinking {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 2px;
    }
    .thinking-text {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-left: 4px;
      letter-spacing: 0.01em;
    }
    .thinking-text::after {
      content: '...';
      display: inline-block;
      width: 16px;
      text-align: left;
      animation: ellipsis 1.4s steps(4, end) infinite;
    }
    @keyframes ellipsis {
      0%   { content: ''; }
      25%  { content: '.'; }
      50%  { content: '..'; }
      75%  { content: '...'; }
      100% { content: ''; }
    }

    .t-dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--color-primary);
      display: inline-block;
    }
    @keyframes tPulse {
      0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
      40%           { transform: scale(1);    opacity: 1; }
    }
    .td1 { animation: tPulse 1.05s ease-in-out infinite 0ms; }
    .td2 { animation: tPulse 1.05s ease-in-out infinite 160ms; }
    .td3 { animation: tPulse 1.05s ease-in-out infinite 320ms; }

    .err {
      margin-top: 8px;
      padding: 8px 10px;
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.28);
      border-radius: 10px;
      color: #dc2626;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    :host-context(html.dark) .err { color: #fca5a5; }
  `],
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: ChatMessage;
  @Input() userInitials = 'AP';

  get isUser(): boolean {
    return this.message.role === 'USER';
  }

  get aiText(): string {
    if (this.message.isStreaming) {
      return this.message.streamingContent ?? '';
    }
    return this.message.content;
  }
}
