import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService, AuthApiError } from '../../../core/auth/auth-api.service';
import { PasswordResetStateService } from '../services/password-reset-state.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-[fadeIn_0.4s_ease]">
      <button type="button" (click)="back()" class="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#a3aed0] hover:text-brand-primary transition-colors mb-6">
        <lucide-icon name="arrow-left" [size]="16" [strokeWidth]="2.5"></lucide-icon>
        Modifier l'e-mail
      </button>

      <h1 class="text-[32px] font-black tracking-tight">Vérification en 2 étapes</h1>
      <p class="text-[15px] text-[#a3aed0] font-medium mt-2 leading-relaxed">
        Saisissez le code à 4 chiffres envoyé à
        <span class="font-bold text-[#1b2559] dark:text-white">{{ email() }}</span>.
      </p>

      <div *ngIf="error()" class="mt-6 flex items-start gap-2.5 rounded-[14px] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400 font-medium">
        <lucide-icon name="alert-circle" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
        <span>{{ error() }}</span>
      </div>

      <div class="mt-8 flex gap-3 sm:gap-4" (paste)="onPaste($event)">
        <input
          *ngFor="let d of digits; let i = index"
          #box
          type="text"
          inputmode="numeric"
          maxlength="1"
          [value]="d"
          (input)="onInput($event, i)"
          (keydown)="onKeydown($event, i)"
          class="w-full aspect-square max-w-[76px] text-center text-[28px] font-black rounded-[18px] border-2 bg-white dark:bg-white/[0.04] outline-none transition-all
                 border-[#e0e5f2] dark:border-white/10 focus:border-brand-primary focus:shadow-[0_0_0_4px_rgba(1,181,116,0.12)] text-[#1b2559] dark:text-white"
        />
      </div>

      <button type="button" (click)="verify()" [disabled]="loading() || !isComplete()"
        class="mt-8 w-full rounded-[16px] bg-brand-primary text-white font-bold text-[15px] py-3.5 shadow-[0_10px_30px_rgba(1,181,116,0.4)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        <lucide-icon *ngIf="loading()" name="loader-2" [size]="18" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
        {{ loading() ? 'Vérification…' : 'Vérifier le code' }}
      </button>

      <p class="mt-6 text-[14px] text-[#a3aed0] font-medium">
        Vous n'avez rien reçu ?
        <button type="button" (click)="resend()" [disabled]="resending()" class="font-bold text-brand-primary hover:underline ml-1 disabled:opacity-60">
          {{ resending() ? 'Envoi…' : 'Renvoyer un code' }}
        </button>
      </p>
    </div>
  `,
  styles: [`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`],
})
export class VerifyOtpComponent implements OnInit, AfterViewInit {
  private api = inject(AuthApiService);
  private router = inject(Router);
  private state = inject(PasswordResetStateService);

  @ViewChildren('box') boxes!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = ['', '', '', ''];
  email = signal('');
  loading = signal(false);
  resending = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const email = this.state.email();
    if (!email) {
      // Direct navigation without going through "forgot" — restart the flow.
      void this.router.navigate(['/auth/forgot-password']);
      return;
    }
    this.email.set(email);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.boxes?.first?.nativeElement.focus(), 0);
  }

  isComplete(): boolean {
    return this.digits.every((d) => d !== '');
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    this.digits[index] = value.slice(-1);
    input.value = this.digits[index];
    if (this.digits[index] && index < this.digits.length - 1) {
      this.focusBox(index + 1);
    }
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.focusBox(index - 1);
    }
    if (event.key === 'Enter' && this.isComplete()) {
      this.verify();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (!text) return;
    for (let i = 0; i < this.digits.length; i++) {
      this.digits[i] = text[i] ?? '';
    }
    this.boxes.forEach((b, i) => (b.nativeElement.value = this.digits[i]));
    this.focusBox(Math.min(text.length, this.digits.length - 1));
  }

  async verify(): Promise<void> {
    if (this.loading() || !this.isComplete()) return;
    this.error.set(null);
    this.loading.set(true);
    const otp = this.digits.join('');

    try {
      const res = await this.api.verifyOtp(this.email(), otp);
      if (res.verified && res.resetTicket) {
        this.state.setTicket(res.resetTicket);
        await this.router.navigate(['/auth/reset-password']);
      } else {
        this.error.set('Code invalide ou expiré. Réessayez.');
        this.clearDigits();
      }
    } catch (err) {
      this.error.set(
        err instanceof AuthApiError ? err.message : 'La vérification a échoué.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  async resend(): Promise<void> {
    if (this.resending()) return;
    this.error.set(null);
    this.resending.set(true);
    try {
      await this.api.forgotPassword(this.email());
      this.clearDigits();
    } catch {
      this.error.set("L'envoi du code a échoué.");
    } finally {
      this.resending.set(false);
    }
  }

  back(): void {
    void this.router.navigate(['/auth/forgot-password']);
  }

  private clearDigits(): void {
    this.digits = ['', '', '', ''];
    this.boxes?.forEach((b) => (b.nativeElement.value = ''));
    this.focusBox(0);
  }

  private focusBox(index: number): void {
    const box = this.boxes?.get(index);
    box?.nativeElement.focus();
    box?.nativeElement.select();
  }
}
