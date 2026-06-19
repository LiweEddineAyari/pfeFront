import { Injectable, NgZone, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ChatEvent,
  ChatEventType,
  ErrorEventData,
  SessionEventData,
  TokenEventData,
  ToolExecutedEventData,
  RagSourcesEventData,
  DoneEventData,
} from '../models/chat.models';
import { STATIC_USER_ID } from '../constants/chat.constants';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Streams a chat turn from the backend `/api/ai/chat` SSE endpoint.
 *
 * Uses `fetch()` + a manual ReadableStream reader (NOT EventSource) because the
 * backend requires a POST body and EventSource only supports GET.
 *
 * SSE wire format expected from the server:
 *   event: <type>
 *   data:  <json-payload>
 *   \n
 */
@Injectable({ providedIn: 'root' })
export class ChatStreamService {
  private readonly endpoint = '/api/ai/chat';
  private zone = inject(NgZone);
  private auth = inject(AuthService);

  streamChat(message: string, sessionId?: string | null): Observable<ChatEvent> {
    return new Observable<ChatEvent>((subscriber) => {
      const ctrl = new AbortController();
      const userId = this.resolveUserId();

      this.zone.runOutsideAngular(() => {
        fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            'X-User-Id': userId,
          },
          body: JSON.stringify({
            message,
            sessionId: sessionId ?? null,
            userLocale: 'fr',
          }),
          signal: ctrl.signal,
        })
          .then(async (response) => {
            if (!response.ok || !response.body) {
              const text = await response.text().catch(() => '');
              this.zone.run(() => {
                subscriber.next({
                  type: 'error',
                  data: {
                    message:
                      text ||
                      `Le serveur a repondu ${response.status} ${response.statusText}.`,
                  },
                });
                subscriber.complete();
              });
              return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let frameEnd: number;
                while ((frameEnd = this.findFrameEnd(buffer)) !== -1) {
                  const rawFrame = buffer.slice(0, frameEnd);
                  buffer = buffer.slice(frameEnd).replace(/^\r?\n\r?\n/, '');

                  const event = this.parseFrame(rawFrame);
                  if (event) {
                    this.zone.run(() => subscriber.next(event));
                  }
                }
              }

              // Drain any trailing frame without separator
              if (buffer.trim().length > 0) {
                const event = this.parseFrame(buffer);
                if (event) {
                  this.zone.run(() => subscriber.next(event));
                }
              }

              this.zone.run(() => subscriber.complete());
            } catch (err: unknown) {
              if (this.isAbortError(err)) {
                this.zone.run(() => subscriber.complete());
                return;
              }
              this.zone.run(() => {
                subscriber.next({
                  type: 'error',
                  data: {
                    message: this.errorMessage(err),
                  },
                });
                subscriber.complete();
              });
            }
          })
          .catch((err: unknown) => {
            if (this.isAbortError(err)) {
              this.zone.run(() => subscriber.complete());
              return;
            }
            this.zone.run(() => {
              subscriber.next({
                type: 'error',
                data: { message: this.errorMessage(err) },
              });
              subscriber.complete();
            });
          });
      });

      return () => ctrl.abort();
    });
  }

  // ── frame parsing ───────────────────────────────────────────────────────────

  private findFrameEnd(buffer: string): number {
    // SSE frames are separated by a blank line (\n\n or \r\n\r\n)
    const idxLf = buffer.indexOf('\n\n');
    const idxCrlf = buffer.indexOf('\r\n\r\n');
    if (idxLf === -1) return idxCrlf;
    if (idxCrlf === -1) return idxLf;
    return Math.min(idxLf, idxCrlf);
  }

  private parseFrame(frame: string): ChatEvent | null {
    let eventType: ChatEventType | '' = '';
    const dataLines: string[] = [];

    for (const line of frame.split(/\r?\n/)) {
      if (!line) continue;
      if (line.startsWith(':')) continue; // SSE comment
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim() as ChatEventType;
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^\s/, ''));
      }
    }

    if (!eventType || dataLines.length === 0) {
      return null;
    }

    const payload = dataLines.join('\n');
    const data = this.parseData(eventType, payload);
    if (!data) return null;

    return { type: eventType, data };
  }

  private parseData(
    type: ChatEventType,
    raw: string
  ):
    | SessionEventData
    | TokenEventData
    | ToolExecutedEventData
    | RagSourcesEventData
    | DoneEventData
    | ErrorEventData
    | null {
    // `token` events sometimes ship plain-text fragments (no JSON wrap).
    if (type === 'token') {
      const parsed = this.tryJson(raw);
      if (parsed && typeof parsed === 'object' && 'text' in (parsed as object)) {
        return { text: String((parsed as TokenEventData).text ?? '') };
      }
      return { text: raw };
    }

    const parsed = this.tryJson(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as
        | SessionEventData
        | ToolExecutedEventData
        | RagSourcesEventData
        | DoneEventData
        | ErrorEventData;
    }

    if (type === 'error') {
      return { message: raw };
    }

    return null;
  }

  private tryJson(raw: string): unknown {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private resolveUserId(): string {
    return this.auth.currentUser()?.sub ?? STATIC_USER_ID;
  }

  private isAbortError(err: unknown): boolean {
    return (
      !!err &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name: string }).name === 'AbortError'
    );
  }

  private errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Erreur reseau lors du streaming.';
  }
}
