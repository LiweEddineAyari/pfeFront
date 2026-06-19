import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService, AuthApiError } from '../../../core/auth/auth-api.service';
import { PasswordResetStateService } from '../services/password-reset-state.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-[fadeIn_0.4s_ease]">
      <!-- success -->
      <div *ngIf="done(); else formTpl" class="text-center">
        <div class="mx-auto w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
          <lucide-icon name="check-circle-2" [size]="34" [strokeWidth]="2.2"></lucide-icon>
        </div>
        <h1 class="text-[26px] font-black tracking-tight mt-6">Mot de passe mis à jour</h1>
        <p class="text-[14px] text-[#a3aed0] font-medium mt-3 leading-relaxed">
          Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter
          avec vos nouveaux identifiants.
        </p>
        <a routerLink="/auth/sign-in"
          class="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-brand-primary text-white font-bold text-[15px] py-3.5 shadow-[0_10px_30px_rgba(1,181,116,0.4)] hover:brightness-105 transition-all">
          Se connecter
        </a>
      </div>

      <ng-template #formTpl>
        <h1 class="text-[32px] font-black tracking-tight">Nouveau mot de passe</h1>
        <p class="text-[15px] text-[#a3aed0] font-medium mt-2 leading-relaxed">
          Choisissez un nouveau mot de passe sécurisé d'au moins 8 caractères.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 flex flex-col gap-5">
          <div *ngIf="error()" class="flex items-start gap-2.5 rounded-[14px] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400 font-medium">
            <lucide-icon name="alert-circle" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
            <span>{{ error() }}</span>
          </div>

          <div>
            <label class="block text-[14px] font-bold mb-1.5">Nouveau mot de passe<span class="text-brand-primary">*</span></label>
            <div class="group flex items-center rounded-[16px] border border-[#e0e5f2] dark:border-white/10 bg-white dark:bg-white/[0.04] focus-within:border-brand-primary transition-colors">
              <span class="pl-4 text-[#a3aed0]"><lucide-icon name="key-round" [size]="18" [strokeWidth]="2.2"></lucide-icon></span>
              <input formControlName="newPassword" [type]="show() ? 'text' : 'password'" autocomplete="new-password" placeholder="Min. 8 caractères"
                class="w-full bg-transparent px-3 py-3.5 text-[14px] font-medium outline-none placeholder:text-[#a3aed0]" />
              <button type="button" (click)="show.set(!show())" class="pr-4 text-[#a3aed0] hover:text-brand-primary transition-colors" tabindex="-1">
                <lucide-icon [name]="show() ? 'eye-off' : 'eye'" [size]="18" [strokeWidth]="2.2"></lucide-icon>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[14px] font-bold mb-1.5">Confirmer le mot de passe<span class="text-brand-primary">*</span></label>
            <div class="group flex items-center rounded-[16px] border border-[#e0e5f2] dark:border-white/10 bg-white dark:bg-white/[0.04] focus-within:border-brand-primary transition-colors">
              <span class="pl-4 text-[#a3aed0]"><lucide-icon name="key-round" [size]="18" [strokeWidth]="2.2"></lucide-icon></span>
              <input formControlName="confirm" [type]="show() ? 'text' : 'password'" autocomplete="new-password" placeholder="Répétez le mot de passe"
                class="w-full bg-transparent px-3 py-3.5 text-[14px] font-medium outline-none placeholder:text-[#a3aed0]" />
            </div>
          </div>

          <button type="submit" [disabled]="loading()"
            class="w-full rounded-[16px] bg-brand-primary text-white font-bold text-[15px] py-3.5 shadow-[0_10px_30px_rgba(1,181,116,0.4)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            <lucide-icon *ngIf="loading()" name="loader-2" [size]="18" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
            {{ loading() ? 'Mise à jour…' : 'Réinitialiser le mot de passe' }}
          </button>
        </form>
      </ng-template>
    </div>
  `,
  styles: [`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`],
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);
  private router = inject(Router);
  private state = inject(PasswordResetStateService);

  show = signal(false);
  loading = signal(false);
  done = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (!this.state.resetTicket()) {
      void this.router.navigate(['/auth/forgot-password']);
    }
  }

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.error.set(null);

    const { newPassword, confirm } = this.form.getRawValue();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirm) {
      this.error.set('Les deux mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);
    try {
      await this.api.resetPassword(this.state.resetTicket(), newPassword);
      this.state.reset();
      this.done.set(true);
    } catch (err) {
      this.error.set(
        err instanceof AuthApiError ? err.message : 'La réinitialisation a échoué.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
