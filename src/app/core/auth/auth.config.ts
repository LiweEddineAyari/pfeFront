/**
 * Keycloak / auth configuration for the SPA.
 *
 * The app authenticates with a PUBLIC Keycloak client using the Resource Owner
 * Password (direct access grant) flow so we can keep the custom Horizon-styled
 * login UI instead of redirecting to Keycloak's hosted page.
 *
 * Keycloak is reached through the dev-server proxy under `/kc` (see
 * `proxy.conf.json`) to avoid CORS. In production point `KC_BASE` at the real
 * gateway path that forwards to Keycloak.
 */
export const AUTH_CONFIG = {
  /** Proxy prefix that forwards to the Keycloak server (`:8080`). */
  kcBase: '/kc',
  realm: 'finance-realm',
  /** Public client with "Direct access grants" enabled. */
  clientId: 'finance-frontend',
  /** OIDC scopes requested at login. */
  scope: 'openid profile email',
} as const;

/** Realm-scoped OpenID-Connect endpoint builders. */
export const KC_ENDPOINTS = {
  token: () =>
    `${AUTH_CONFIG.kcBase}/realms/${AUTH_CONFIG.realm}/protocol/openid-connect/token`,
  logout: () =>
    `${AUTH_CONFIG.kcBase}/realms/${AUTH_CONFIG.realm}/protocol/openid-connect/logout`,
} as const;

/** Storage keys for persisted tokens. */
export const AUTH_STORAGE_KEYS = {
  accessToken: 'finance.auth.access_token',
  refreshToken: 'finance.auth.refresh_token',
  /** Remembers which storage (local vs session) holds the active session. */
  persistence: 'finance.auth.persistence',
} as const;
