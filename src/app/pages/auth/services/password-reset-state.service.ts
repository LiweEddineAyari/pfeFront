import { Injectable, signal } from '@angular/core';

/**
 * Carries the forgot-password state across the three-step flow
 * (forgot → verify OTP → reset) so the single-use reset ticket never has to
 * live in the URL.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetStateService {
  readonly email = signal<string>('');
  readonly resetTicket = signal<string>('');

  startFor(email: string): void {
    this.email.set(email.trim());
    this.resetTicket.set('');
  }

  setTicket(ticket: string): void {
    this.resetTicket.set(ticket);
  }

  reset(): void {
    this.email.set('');
    this.resetTicket.set('');
  }
}
