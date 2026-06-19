import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService, LoginError } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-[fadeIn_0.4s_ease]">
      <h1 class="text-[32px] font-black tracking-tight">Connexion</h1>
      <p class="text-[15px] text-[#a3aed0] font-medium mt-2">
        Entrez votre e-mail et votre mot de passe pour accéder à votre espace.
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 flex flex-col gap-5">
        <!-- error banner -->
        <div *ngIf="error()" class="flex items-start gap-2.5 rounded-[14px] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400 font-medium">
          <lucide-icon name="alert-circle" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
          <span>{{ error() }}</span>
        </div>

        <!-- email -->
        <div>
          <label class="block text-[14px] font-bold mb-1.5">E-mail ou identifiant<span class="text-brand-primary">*</span></label>
          <div class="group flex items-center rounded-[16px] border border-[#e0e5f2] dark:border-white/10 bg-white dark:bg-white/[0.04] focus-within:border-brand-primary transition-colors">
            <span class="pl-4 text-[#a3aed0]"><lucide-icon name="mail" [size]="18" [strokeWidth]="2.2"></lucide-icon></span>
            <input formControlName="username" type="text" autocomplete="username" placeholder="mail@exemple.com"
              class="w-full bg-transparent px-3 py-3.5 text-[14px] font-medium outline-none placeholder:text-[#a3aed0]" />
          </div>
        </div>

        <!-- password -->
        <div>
          <label class="block text-[14px] font-bold mb-1.5">Mot de passe<span class="text-brand-primary">*</span></label>
          <div class="group flex items-center rounded-[16px] border border-[#e0e5f2] dark:border-white/10 bg-white dark:bg-white/[0.04] focus-within:border-brand-primary transition-colors">
            <span class="pl-4 text-[#a3aed0]"><lucide-icon name="lock" [size]="18" [strokeWidth]="2.2"></lucide-icon></span>
            <input formControlName="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password" placeholder="Min. 8 caractères"
              class="w-full bg-transparent px-3 py-3.5 text-[14px] font-medium outline-none placeholder:text-[#a3aed0]" />
            <button type="button" (click)="showPassword.set(!showPassword())" class="pr-4 text-[#a3aed0] hover:text-brand-primary transition-colors" tabindex="-1" aria-label="Afficher le mot de passe">
              <lucide-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" [strokeWidth]="2.2"></lucide-icon>
            </button>
          </div>
        </div>

        <!-- options -->
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" formControlName="remember" class="peer sr-only" />
            <span class="w-[18px] h-[18px] rounded-[6px] border-2 border-[#cbd5e1] dark:border-white/20 peer-checked:bg-brand-primary peer-checked:border-brand-primary flex items-center justify-center transition-all">
              <lucide-icon name="check" [size]="12" [strokeWidth]="3.5" class="text-white"></lucide-icon>
            </span>
            <span class="text-[13px] font-medium text-[#475569] dark:text-[#cbd5e1]">Rester connecté</span>
          </label>
          <a routerLink="/auth/forgot-password" class="text-[13px] font-bold text-brand-primary hover:underline">Mot de passe oublié ?</a>
        </div>

        <button type="submit" [disabled]="loading()"
          class="mt-1 w-full rounded-[16px] bg-brand-primary text-white font-bold text-[15px] py-3.5 shadow-[0_10px_30px_rgba(1,181,116,0.4)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <lucide-icon *ngIf="loading()" name="loader-2" [size]="18" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
          {{ loading() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <p class="mt-7 text-[14px] text-[#a3aed0] font-medium">
        Pas encore de compte ?
        <a routerLink="/auth/sign-up" class="font-bold text-brand-primary hover:underline ml-1">Créer un compte</a>
      </p>
    </div>
  `,
  styles: [`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`],
})
export class SignInComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  showPassword = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [true],
  });

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez renseigner votre e-mail et votre mot de passe.');
      return;
    }

    this.loading.set(true);
    const { username, password, remember } = this.form.getRawValue();

    try {
      await this.auth.login(username, password, remember);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl || this.auth.defaultLandingFor());
    } catch (err) {
      this.error.set(
        err instanceof LoginError
          ? err.message
          : 'Connexion impossible. Réessayez plus tard.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
