import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_CONFIG, KC_ENDPOINTS } from './auth.config';
import { TokenStorageService } from './token-storage.service';
import { AuthUser, JwtClaims, Role, TokenResponse } from './models/auth.model';

export class LoginError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'LoginError';
  }
}

const ROLE_VALUES: Role[] = ['ROLE_ADMIN', 'ROLE_TECH', 'ROLE_FINANCE'];

/**
 * Owns the authenticated session: talks to Keycloak (direct-grant login,
 * refresh, logout), decodes the JWT into an `AuthUser`, and exposes reactive
 * signals consumed across the app (sidebar, guards, page-level gating).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private storage = inject(TokenStorageService);

  /** The active identity, or `null` when signed out. */
  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly roles = computed<Role[]>(() => this.currentUser()?.roles ?? []);
  readonly isAdmin = computed(() => this.hasRole('ROLE_ADMIN'));
  readonly isTech = computed(() => this.hasRole('ROLE_TECH'));
  readonly isFinance = computed(() => this.hasRole('ROLE_FINANCE'));

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  /** De-dupes concurrent refresh attempts (e.g. parallel 401s). */
  private inFlightRefresh: Promise<boolean> | null = null;

  // ── lifecycle ───────────────────────────────────────────────────────────────

  /** Called once at startup to restore a persisted session. */
  bootstrap(): void {
    const token = this.storage.accessToken;
    if (!token) return;

    const claims = this.decode(token);
    if (!claims) {
      this.clearSession();
      return;
    }

    // Restore the identity immediately so route guards pass on a hard reload.
    this.applyClaims(claims);

    if (this.isExpired(claims)) {
      // Access token is stale — refresh in the background; the fetch wrapper
      // also recovers any 401 in flight. Drop the session if refresh fails.
      void this.refresh().then((ok) => {
        if (!ok) this.clearSession();
      });
    } else {
      this.scheduleRefresh(claims);
    }
  }

  // ── login / logout ────────────────────────────────────────────────────────────

  async login(
    usernameOrEmail: string,
    password: string,
    remember: boolean
  ): Promise<AuthUser> {
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: AUTH_CONFIG.clientId,
      username: usernameOrEmail.trim(),
      password,
      scope: AUTH_CONFIG.scope,
    });

    const res = await fetch(KC_ENDPOINTS.token(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new LoginError(await this.describeKcError(res), res.status);
    }

    const tokens = (await res.json()) as TokenResponse;
    const user = this.acceptTokens(tokens, remember);
    if (!user) {
      throw new LoginError('Jeton invalide reçu de Keycloak.', 500);
    }
    return user;
  }

  /** Revoke the session in Keycloak (best-effort) and return to sign-in. */
  async logout(redirect = true): Promise<void> {
    const refreshToken = this.storage.refreshToken;
    this.clearSession();

    if (refreshToken) {
      try {
        await fetch(KC_ENDPOINTS.logout(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: AUTH_CONFIG.clientId,
            refresh_token: refreshToken,
          }).toString(),
        });
      } catch {
        // network error on logout is non-fatal — local session is already gone
      }
    }

    if (redirect) {
      void this.router.navigate(['/auth/sign-in']);
    }
  }

  // ── refresh ─────────────────────────────────────────────────────────────────

  /** Exchange the refresh token for a fresh access token. Returns success. */
  refresh(): Promise<boolean> {
    if (this.inFlightRefresh) return this.inFlightRefresh;

    this.inFlightRefresh = this.doRefresh().finally(() => {
      this.inFlightRefresh = null;
    });
    return this.inFlightRefresh;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.storage.refreshToken;
    if (!refreshToken) return false;

    try {
      const res = await fetch(KC_ENDPOINTS.token(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: AUTH_CONFIG.clientId,
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!res.ok) return false;

      const tokens = (await res.json()) as TokenResponse;
      // Preserve the original "remember me" choice across silent refreshes.
      return this.acceptTokens(tokens, this.storage.rememberMe) !== null;
    } catch {
      return false;
    }
  }

  // ── role helpers ──────────────────────────────────────────────────────────────

  hasRole(role: Role): boolean {
    return this.currentUser()?.roles.includes(role) ?? false;
  }

  hasAnyRole(roles: Role[]): boolean {
    if (!roles.length) return false;
    const mine = this.currentUser()?.roles ?? [];
    return roles.some((r) => mine.includes(r));
  }

  /** Where to send a user after login / from the app root. */
  defaultLandingFor(roles: Role[] = this.roles()): string {
    if (roles.includes('ROLE_ADMIN')) return '/admin/users';
    if (roles.includes('ROLE_FINANCE')) return '/dashboard';
    if (roles.includes('ROLE_TECH')) return '/parameters';
    return '/profile';
  }

  /** Read-only snapshot of the access token for ad-hoc needs. */
  get accessToken(): string | null {
    return this.storage.accessToken;
  }

  // ── internals ─────────────────────────────────────────────────────────────────

  private acceptTokens(tokens: TokenResponse, remember: boolean): AuthUser | null {
    const claims = this.decode(tokens.access_token);
    if (!claims) return null;

    // Keep the previous refresh token if Keycloak didn't return a new one.
    const refresh = tokens.refresh_token ?? this.storage.refreshToken;
    this.storage.save(tokens.access_token, refresh, remember);
    const user = this.applyClaims(claims);
    this.scheduleRefresh(claims);
    return user;
  }

  private applyClaims(claims: JwtClaims): AuthUser {
    const composedName = [claims.given_name, claims.family_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    const user: AuthUser = {
      sub: claims.sub,
      username: claims.preferred_username ?? claims.sub,
      email: claims.email ?? '',
      fullName: claims.name ?? (composedName || claims.preferred_username || ''),
      roles: this.extractRoles(claims),
    };
    this.currentUser.set(user);
    return user;
  }

  private clearSession(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.storage.clear();
    this.currentUser.set(null);
  }

  private extractRoles(claims: JwtClaims): Role[] {
    const raw = claims.realm_access?.roles ?? [];
    const normalized = raw.map((r) =>
      r.startsWith('ROLE_') ? r : `ROLE_${r.toUpperCase()}`
    );
    return ROLE_VALUES.filter((r) => normalized.includes(r));
  }

  private scheduleRefresh(claims: JwtClaims): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (!claims.exp) return;

    // Refresh ~30s before expiry (floor at 5s).
    const msUntil = claims.exp * 1000 - Date.now() - 30_000;
    const delay = Math.max(5_000, msUntil);
    this.refreshTimer = setTimeout(() => {
      void this.refresh().then((ok) => {
        if (!ok) void this.logout();
      });
    }, delay);
  }

  private isExpired(claims: JwtClaims): boolean {
    return !!claims.exp && claims.exp * 1000 <= Date.now();
  }

  private decode(token: string): JwtClaims | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const json = this.base64UrlDecode(payload);
      return JSON.parse(json) as JwtClaims;
    } catch {
      return null;
    }
  }

  private base64UrlDecode(input: string): string {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );
    const binary = atob(padded);
    // Decode as UTF-8 so accented names survive.
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }

  private async describeKcError(res: Response): Promise<string> {
    if (res.status === 401) {
      return 'Identifiants invalides. Vérifiez votre e-mail et votre mot de passe.';
    }
    try {
      const data = await res.json();
      const desc = data?.error_description ?? data?.error;
      if (data?.error === 'invalid_grant') {
        return 'Identifiants invalides ou compte non activé.';
      }
      if (typeof desc === 'string' && desc.trim()) return desc;
    } catch {
      // fall through
    }
    return `La connexion a échoué (HTTP ${res.status}).`;
  }
}
