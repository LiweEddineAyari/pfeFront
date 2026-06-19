import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../auth.service';
import { Role } from '../models/auth.model';

/**
 * Guards the whole protected shell: an unauthenticated user is bounced to
 * sign-in, remembering where they were headed.
 */
export const authGuard: CanActivateChildFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/auth/sign-in'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Per-route role gate. Reads `data.roles: Role[]`. An empty/missing list means
 * "denied to everyone" (used for the reserved stress-test surface).
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/sign-in']);
  }

  const allowed = (route.data?.['roles'] as Role[] | undefined) ?? [];
  if (allowed.length > 0 && auth.hasAnyRole(allowed)) {
    return true;
  }

  // Not permitted — send the user to their own home rather than a dead end.
  return router.createUrlTree([auth.defaultLandingFor()]);
};

/** Keeps already-authenticated users out of the /auth/* screens. */
export const publicOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree([auth.defaultLandingFor()]);
};

/** App root: send each role to its natural landing page. */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return router.createUrlTree([auth.defaultLandingFor()]);
};
