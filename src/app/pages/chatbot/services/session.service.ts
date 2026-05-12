import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { ChatSession, ChatMessage, MessageRole, RagSource, ToolCardState, getToolIcon, getToolLabel } from '../models/chat.models';
import { STATIC_USER_ID } from '../constants/chat.constants';

interface RawSession {
  id: string;
  title?: string | null;
  lastMessageAt?: string | null;
  createdAt?: string | null;
  status?: string;
}

interface RawMessage {
  id: string;
  role: string;            // USER | AI | TOOL_EXECUTION | SYSTEM
  content: string;
  /** Original user prompt — present on USER messages, preferred over `content`. */
  promptText?: string | null;
  createdAt?: string;
  toolCalls?: Array<{
    name: string;
    args?: Record<string, unknown>;
    result?: unknown;
    durationMs?: number;
  }>;
  ragSources?: Array<{
    text: string;
    documentType: string;
    ratioCode?: string;
    title?: string;
  }>;
}

/**
 * Manages chat sessions list + messages CRUD + title generation polling.
 *
 * Backend endpoints (all proxied via /api/ai):
 *   GET    /ai/sessions               -> list user sessions
 *   GET    /ai/sessions/{id}          -> session detail (incl. title)
 *   GET    /ai/sessions/{id}/messages -> message history
 *   DELETE /ai/sessions/{id}          -> delete session
 *   PATCH  /ai/sessions/{id}          -> rename/archive
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly base = '/api/ai';
  private zone = inject(NgZone);

  private sessionsSubject = new BehaviorSubject<ChatSession[]>([]);
  sessions$ = this.sessionsSubject.asObservable();

  // ── reads ───────────────────────────────────────────────────────────────────

  async listSessions(): Promise<ChatSession[]> {
    try {
      const raw = await this.fetchJson<unknown>(
        `${this.base}/sessions/user/${encodeURIComponent(STATIC_USER_ID)}`,
        { method: 'GET' }
      );
      const items = this.extractListItems(raw);
      const normalized = items.map((r) => this.normalizeSession(r));
      this.sessionsSubject.next(normalized);
      return normalized;
    } catch {
      // graceful degrade so UI still renders empty state
      this.sessionsSubject.next([]);
      return [];
    }
  }

  /**
   * Accept multiple backend shapes:
   * - Spring Data Page<T>:  `{ content: [...], totalElements, ... }`
   * - Wrapped:              `{ items: [...] }` / `{ data: [...] }`
   * - Bare array:           `[...]`
   */
  private extractListItems(raw: unknown): RawSession[] {
    if (Array.isArray(raw)) return raw as RawSession[];
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      for (const key of ['content', 'items', 'data', 'results']) {
        const val = obj[key];
        if (Array.isArray(val)) return val as RawSession[];
      }
    }
    return [];
  }

  async getSession(id: string): Promise<ChatSession | null> {
    try {
      const raw = await this.fetchJson<RawSession>(`${this.base}/sessions/${encodeURIComponent(id)}`, {
        method: 'GET',
      });
      return this.normalizeSession(raw);
    } catch {
      return null;
    }
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const raw = await this.fetchJson<unknown>(
        `${this.base}/sessions/${encodeURIComponent(sessionId)}/messages`,
        { method: 'GET' }
      );
      const items = this.extractListItems(raw) as unknown as RawMessage[];
      return items
        // Drop TOOL_EXECUTION (audit-only) and SYSTEM rows — only show the
        // user/assistant turns. TOOL_EXECUTION is replayed live during
        // streaming via the ephemeral ToolStatus chips.
        .filter((m) => m.role === 'USER' || m.role === 'AI')
        .map((m) => this.normalizeMessage(m))
        // Skip AI messages with no rendered content (placeholder / interrupted)
        .filter((m) => m.role !== 'AI' || (m.content && m.content.trim().length > 0));
    } catch {
      return [];
    }
  }

  // ── mutations ───────────────────────────────────────────────────────────────

  async deleteSession(id: string): Promise<void> {
    try {
      await this.fetchJson<unknown>(
        `${this.base}/sessions/${encodeURIComponent(id)}/delete`,
        { method: 'DELETE' }
      );
    } finally {
      this.sessionsSubject.next(
        this.sessionsSubject.value.filter((s) => s.id !== id)
      );
    }
  }

  async renameSession(id: string, title: string): Promise<void> {
    try {
      await this.fetchJson<unknown>(
        `${this.base}/sessions/${encodeURIComponent(id)}/title`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        }
      );
    } catch {
      // ignore — caller updates local state optimistically
    }

    const updated = this.sessionsSubject.value.map((s) =>
      s.id === id ? { ...s, title, isGeneratingTitle: false } : s
    );
    this.sessionsSubject.next(updated);
  }

  /**
   * Local insert/update — used after a stream returns a fresh sessionId.
   */
  upsertLocal(session: ChatSession): void {
    const current = this.sessionsSubject.value;
    const existingIdx = current.findIndex((s) => s.id === session.id);
    if (existingIdx >= 0) {
      const next = [...current];
      next[existingIdx] = { ...next[existingIdx], ...session };
      this.sessionsSubject.next(next);
    } else {
      this.sessionsSubject.next([session, ...current]);
    }
  }

  patchLocal(id: string, patch: Partial<ChatSession>): void {
    const next = this.sessionsSubject.value.map((s) =>
      s.id === id ? { ...s, ...patch } : s
    );
    this.sessionsSubject.next(next);
  }

  /**
   * Polls /ai/sessions/{id} every `intervalMs` until a non-null title is
   * returned or `maxAttempts` is reached. Used right after the first message
   * is sent in a new session.
   */
  pollTitle(
    sessionId: string,
    intervalMs = 1500,
    maxAttempts = 8
  ): Observable<string | null> {
    return new Observable<string | null>((subscriber) => {
      let attempts = 0;
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const tick = async () => {
        if (cancelled) return;
        attempts++;
        try {
          const session = await this.getSession(sessionId);
          if (cancelled) return;
          if (session?.title) {
            this.patchLocal(sessionId, {
              title: session.title,
              isGeneratingTitle: false,
            });
            this.zone.run(() => {
              subscriber.next(session.title);
              subscriber.complete();
            });
            return;
          }
        } catch {
          // swallow — we'll retry
        }
        if (attempts >= maxAttempts) {
          this.patchLocal(sessionId, { isGeneratingTitle: false });
          this.zone.run(() => {
            subscriber.next(null);
            subscriber.complete();
          });
          return;
        }
        timer = setTimeout(tick, intervalMs);
      };

      timer = setTimeout(tick, intervalMs);

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    });
  }

  // ── normalization ───────────────────────────────────────────────────────────

  private normalizeSession(r: RawSession | null | undefined): ChatSession {
    return {
      id: String(r?.id ?? ''),
      title: r?.title?.toString().trim() || null,
      lastMessageAt: this.parseDate(r?.lastMessageAt),
      createdAt: this.parseDate(r?.createdAt) ?? undefined,
      status: (r?.status as ChatSession['status']) ?? 'ACTIVE',
      isGeneratingTitle: !r?.title,
    };
  }

  private normalizeMessage(m: RawMessage): ChatMessage {
    const role: MessageRole = m.role === 'USER' ? 'USER' : 'AI';
    // USER rows: backend stores the original user prompt under `promptText`;
    // `content` may hold normalized/canonical text. Always display `promptText`.
    // AI rows: show the assistant `content`.
    const displayContent =
      role === 'USER'
        ? (m.promptText ?? m.content ?? '')
        : (m.content ?? '');

    return {
      id: m.id,
      role,
      content: displayContent,
      toolCards: (m.toolCalls ?? []).map((t) => this.normalizeToolCard(t)),
      ragSources: (m.ragSources ?? []).map<RagSource>((s) => ({
        text: s.text,
        documentType: s.documentType,
        ratioCode: s.ratioCode,
        title: s.title,
      })),
      isStreaming: false,
      createdAt: this.parseDate(m.createdAt) ?? new Date(),
    };
  }

  private normalizeToolCard(t: {
    name: string;
    args?: Record<string, unknown>;
    result?: unknown;
    durationMs?: number;
  }): ToolCardState {
    return {
      name: t.name,
      label: getToolLabel(t.name),
      icon: getToolIcon(t.name),
      args: t.args ?? {},
      result: t.result,
      state: 'done',
      startTime: Date.now(),
      duration: t.durationMs,
    };
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ── http ────────────────────────────────────────────────────────────────────

  private async fetchJson<T>(url: string, options: RequestInit): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.zone.runOutsideAngular(async () => {
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              Accept: 'application/json',
              'X-User-Id': this.resolveUserId(),
              ...(options.headers ?? {}),
            },
          });

          const text = await response.text();
          const payload = text ? this.tryJson(text) : null;

          if (!response.ok) {
            this.zone.run(() => reject(new Error(`HTTP ${response.status}`)));
            return;
          }

          this.zone.run(() => resolve(payload as T));
        } catch (err) {
          this.zone.run(() => reject(err));
        }
      });
    });
  }

  private tryJson(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private resolveUserId(): string {
    return STATIC_USER_ID;
  }
}
