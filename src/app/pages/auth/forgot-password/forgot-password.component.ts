import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService, AuthApiError } from '../../../core/auth/auth-api.service';
import { PasswordResetStateService } from '../services/password-reset-state.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-[fadeIn_0.4s_ease]">
      <a routerLink="/auth/sign-in" class="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#a3aed0] hover:text-brand-primary transition-colors mb-6">
        <lucide-icon name="arrow-left" [size]="16" [strokeWidth]="2.5"></lucide-icon>
        Retour à la connexion
      </a>

      <h1 class="text-[32px] font-black tracking-tight">Mot de passe oublié&nbsp;?</h1>
      <p class="text-[15px] text-[#a3aed0] font-medium mt-2 leading-relaxed">
        Indiquez votre e-mail et nous vous enverrons un code de vérification à 4 chiffres
        pour réinitialiser votre mot de passe.
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 flex flex-col gap-5">
        <div *ngIf="error()" class="flex items-start gap-2.5 rounded-[14px] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400 font-medium">
          <lucide-icon name="alert-circle" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
          <span>{{ error() }}</span>
        </div>

        <div>
          <label class="block text-[14px] font-bold mb-1.5">E-mail<span class="text-brand-primary">*</span></label>
          <div class="group flex items-center rounded-[16px] border border-[#e0e5f2] dark:border-white/10 bg-white dark:bg-white/[0.04] focus-within:border-brand-primary transition-colors">
            <span class="pl-4 text-[#a3aed0]"><lucide-icon name="mail" [size]="18" [strokeWidth]="2.2"></lucide-icon></span>
            <input formControlName="email" type="email" autocomplete="email" placeholder="mail@exemple.com"
              class="w-full bg-transparent px-3 py-3.5 text-[14px] font-medium outline-none placeholder:text-[#a3aed0]" />
          </div>
        </div>

        <button type="submit" [disabled]="loading()"
          class="w-full rounded-[16px] bg-brand-primary text-white font-bold text-[15px] py-3.5 shadow-[0_10px_30px_rgba(1,181,116,0.4)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
          <lucide-icon *ngIf="loading()" name="loader-2" [size]="18" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
          {{ loading() ? 'Envoi…' : 'Envoyer le code' }}
        </button>
      </form>
    </div>
  `,
  styles: [`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`],
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);
  private router = inject(Router);
  private state = inject(PasswordResetStateService);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    this.loading.set(true);
    const email = this.form.getRawValue().email.trim();

    try {
      await this.api.forgotPassword(email);
      // Backend always returns 200 (no user enumeration) — proceed to OTP step.
      this.state.startFor(email);
      await this.router.navigate(['/auth/verify-otp']);
    } catch (err) {
      this.error.set(
        err instanceof AuthApiError ? err.message : "L'envoi du code a échoué."
      );
    } finally {
      this.loading.set(false);
    }
  }
}
