import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AUTH_STORAGE_KEYS } from './auth.config';

/**
 * Persists the Keycloak access / refresh tokens.
 *
 * When the user ticks "keep me logged in" the tokens go to `localStorage`
 * (survive a browser restart); otherwise they live in `sessionStorage` and are
 * dropped when the tab closes. A small marker records which backend is active so
 * reads always hit the right store.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly browser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.browser = isPlatformBrowser(platformId);
  }

  /** Synchronous access token getter — used by the global fetch wrapper. */
  get accessToken(): string | null {
    return this.read(AUTH_STORAGE_KEYS.accessToken);
  }

  get refreshToken(): string | null {
    return this.read(AUTH_STORAGE_KEYS.refreshToken);
  }

  /** Whether the active session is persisted across browser restarts. */
  get rememberMe(): boolean {
    return this.persistence() === 'local';
  }

  /** Persist a fresh token pair into the chosen storage. */
  save(accessToken: string, refreshToken: string | null, remember: boolean): void {
    if (!this.browser) return;

    // Drop any previous session in either store before writing the new one.
    this.clear();

    const store = remember ? window.localStorage : window.sessionStorage;
    store.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
    if (refreshToken) {
      store.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
    }
    store.setItem(AUTH_STORAGE_KEYS.persistence, remember ? 'local' : 'session');
  }

  /**
   * Update only the tokens, preserving the persistence choice. Used after a
   * silent refresh so a "remembered" session does not get demoted to session
   * storage.
   */
  update(accessToken: string, refreshToken: string | null): void {
    if (!this.browser) return;
    const remember = this.persistence() === 'local';
    this.save(accessToken, refreshToken ?? this.refreshToken, remember);
  }

  clear(): void {
    if (!this.browser) return;
    for (const store of [window.localStorage, window.sessionStorage]) {
      store.removeItem(AUTH_STORAGE_KEYS.accessToken);
      store.removeItem(AUTH_STORAGE_KEYS.refreshToken);
      store.removeItem(AUTH_STORAGE_KEYS.persistence);
    }
  }

  private persistence(): 'local' | 'session' {
    if (!this.browser) return 'session';
    if (window.localStorage.getItem(AUTH_STORAGE_KEYS.persistence) === 'local') {
      return 'local';
    }
    return 'session';
  }

  private read(key: string): string | null {
    if (!this.browser) return null;
    return (
      window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
    );
  }
}
