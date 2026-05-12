/**
 * Static user identity — no auth system yet.
 * MUST match the X-User-Id header sent to every /ai/* endpoint and the
 * userId column used by the backend to scope ai.chat_sessions.
 */
export const STATIC_USER_ID = 'qa-tester';
