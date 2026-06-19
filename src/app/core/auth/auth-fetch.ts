import { AuthService } from './auth.service';

/**
 * Installs a global `window.fetch` wrapper that transparently attaches the
 * Keycloak access token to every same-origin `/api/**` request.
 *
 * The whole app talks to the backend through native `fetch` (including the SSE
 * chat stream), so patching `fetch` once is far less invasive than threading a
 * token through 15+ services. Requests to Keycloak (`/kc/**`) and any other
 * origin are passed straight through untouched.
 *
 * On a `401` for an authenticated user it performs a single, de-duplicated
 * token refresh and retries the request once; if the refresh fails the session
 * is torn down and the user is redirected to sign-in.
 */
export function installAuthFetch(auth: AuthService): void {
  if (typeof window === 'undefined' || (window as any).__authFetchInstalled) {
    return;
  }
  (window as any).__authFetchInstalled = true;

  const original = window.fetch.bind(window);

  const pathOf = (input: RequestInfo | URL): string => {
    try {
      const raw =
        typeof input === 'string'
          ? input
          : input instanceof Request
            ? input.url
            : input.toString();
      return new URL(raw, window.location.origin).pathname;
    } catch {
      return '';
    }
  };

  const run = async (
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    isRetry: boolean
  ): Promise<Response> => {
    const path = pathOf(input);
    const isApi = path === '/api' || path.startsWith('/api/');
    if (!isApi) {
      return original(input, init);
    }

    const token = auth.accessToken;
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await original(input, { ...init, headers });

    if (response.status === 401 && !isRetry && auth.isAuthenticated()) {
      const refreshed = await auth.refresh();
      if (refreshed) {
        return run(input, init, true);
      }
      void auth.logout();
    }

    return response;
  };

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    run(input, init, false)) as typeof window.fetch;
}
