import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Empty anchor route used purely so a `CanActivate` redirect (e.g.
 * `homeRedirectGuard`) has something to match against. It never actually
 * renders because the guard returns a `UrlTree`.
 */
@Component({
  selector: 'app-blank',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class BlankComponent {}
