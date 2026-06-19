import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService, AuthApiError } from '../../../core/auth/auth-api.service';
import { Role, roleLabel } from '../../../core/auth/models/auth.model';

const ROLE_META: Record<string, { icon: string; desc: string }> = {
  ROLE_TECH:    { icon: 'wrench',       desc: 'Mapping, ETL, parametres &amp; ratios'  },
  ROLE_FINANCE: { icon: 'trending-up',  desc: 'Dashboard, chatbot &amp; analyses'       },
  ROLE_ADMIN:   { icon: 'shield-check', desc: 'Gestion des utilisateurs &amp; acces'    },
};

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-[fadeIn_0.4s_ease]">
      <!-- success state -->
      <div *ngIf="submitted(); else formTpl" class="text-center">
        <div class="mx-auto w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
          <lucide-icon name="mail-check" [size]="32" [strokeWidth]="2.2"></lucide-icon>
        </div>
        <h1 class="text-[26px] font-black tracking-tight mt-6">Demande envoyee</h1>
        <p class="text-[14px] text-[#a3aed0] font-medium mt-3 leading-relaxed">
          Votre demande de compte a bien ete recue. Un administrateur doit l'approuver
          avant que vous puissiez vous connecter.
        </p>
        <a routerLink="/auth/sign-in"
          class="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-brand-primary text-white font-bold text-[15px] py-3.5 shadow-[0_10px_30px_rgba(1,181,116,0.4)] hover:brightness-105 transition-all">
          <lucide-icon name="arrow-left" [size]="18" [strokeWidth]="2.5"></lucide-icon>
          Retour a la connexion
        </a>
      </div>

      <ng-template #formTpl>
        <h1 class="text-[32px] font-black tracking-tight">Creer un compte</h1>
        <p class="text-[15px] text-[#a3aed0] font-medium mt-2">
          Renseignez vos informations pour demander un acces.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-7 flex flex-col gap-4">
          <div *ngIf="error()" class="flex items-start gap-2.5 rounded-[14px] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400 font-medium">
            <lucide-icon name="alert-circle" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
            <span>{{ error() }}</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[13px] font-bold mb-1.5">Prenom<span class="text-brand-primary">*</span></label>
              <input formControlName="firstName" type="text" placeholder="Jean" [class]="inputClass" />
            </div>
            <div>
              <label class="block text-[13px] font-bold mb-1.5">Nom<span class="text-brand-primary">*</span></label>
              <input formControlName="lastName" type="text" placeholder="Dupont" [class]="inputClass" />
            </div>
          </div>

          <div>
            <label class="block text-[13px] font-bold mb-1.5">Identifiant<span class="text-brand-primary">*</span></label>
            <input formControlName="username" type="text" autocomplete="username" placeholder="jdupont" [class]="inputClass" />
          </div>

          <div>
            <label class="block text-[13px] font-bold mb-1.5">E-mail<span class="text-brand-primary">*</span></label>
            <input formControlName="email" type="email" autocomplete="email" placeholder="mail@exemple.com" [class]="inputClass" />
          </div>

          <!-- Role card picker -->
          <div>
            <label class="block text-[13px] font-bold mb-2">Role souhaite<span class="text-brand-primary">*</span></label>
            <div class="flex flex-col gap-2">
              <button *ngFor="let r of roles()" type="button"
                (click)="form.get('requestedRole')!.setValue(r)"
                class="group flex items-center gap-3.5 p-3.5 rounded-[16px] border-2 text-left transition-all duration-200 w-full focus:outline-none"
                [ngClass]="form.get('requestedRole')!.value === r
                  ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/[0.12] shadow-[0_0_0_4px_rgba(1,181,116,0.1)]'
                  : 'border-[#e0e5f2] dark:border-white/10 bg-white dark:bg-white/[0.04] hover:border-brand-primary/50 hover:bg-brand-primary/[0.02]'">
                <div class="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 transition-all"
                  [ngClass]="form.get('requestedRole')!.value === r
                    ? 'bg-brand-primary text-white shadow-[0_4px_14px_rgba(1,181,116,0.45)]'
                    : 'bg-[#f4f7fe] dark:bg-white/[0.07] text-[#a3aed0] group-hover:bg-brand-primary/10 group-hover:text-brand-primary'">
                  <lucide-icon [name]="roleMeta(r).icon" [size]="18" [strokeWidth]="2.2"></lucide-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[13.5px] font-bold transition-colors" [ngClass]="form.get('requestedRole')!.value === r ? 'text-brand-primary' : 'text-text-primary'">{{ label(r) }}</p>
                  <p class="text-[11.5px] text-[#a3aed0] leading-snug mt-0.5">{{ roleMeta(r).desc }}</p>
                </div>
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                  [ngClass]="form.get('requestedRole')!.value === r
                    ? 'border-brand-primary bg-brand-primary'
                    : 'border-[#cbd5e1] dark:border-white/20'">
                  <lucide-icon *ngIf="form.get('requestedRole')!.value === r" name="check" [size]="11" [strokeWidth]="3.5" class="text-white"></lucide-icon>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[13px] font-bold mb-1.5">Mot de passe<span class="text-brand-primary">*</span></label>
            <div class="group flex items-center rounded-[16px] border border-[#e0e5f2] dark:border-white/10 bg-white dark:bg-white/[0.04] focus-within:border-brand-primary transition-colors">
              <input formControlName="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" placeholder="Min. 8 caracteres"
                class="w-full bg-transparent px-4 py-3.5 text-[14px] font-medium outline-none placeholder:text-[#a3aed0]" />
              <button type="button" (click)="showPassword.set(!showPassword())" class="pr-4 text-[#a3aed0] hover:text-brand-primary transition-colors" tabindex="-1">
                <lucide-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" [strokeWidth]="2.2"></lucide-icon>
              </button>
            </div>
          </div>

          <label class="flex items-start gap-2.5 cursor-pointer select-none mt-1">
            <input type="checkbox" formControlName="terms" class="peer sr-only" />
            <span class="mt-0.5 w-[18px] h-[18px] shrink-0 rounded-[6px] border-2 border-[#cbd5e1] dark:border-white/20 peer-checked:bg-brand-primary peer-checked:border-brand-primary flex items-center justify-center transition-all">
              <lucide-icon name="check" [size]="12" [strokeWidth]="3.5" class="text-white"></lucide-icon>
            </span>
            <span class="text-[12.5px] font-medium text-[#475569] dark:text-[#cbd5e1] leading-snug">
              J'accepte les conditions generales d'utilisation et la politique de confidentialite.
            </span>
          </label>

          <button type="submit" [disabled]="loading()"
            class="mt-2 w-full rounded-[16px] bg-brand-primary text-white font-bold text-[15px] py-3.5 shadow-[0_10px_30px_rgba(1,181,116,0.4)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            <lucide-icon *ngIf="loading()" name="loader-2" [size]="18" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
            {{ loading() ? 'Envoi...' : 'Creer mon compte' }}
          </button>
        </form>

        <p class="mt-6 text-[14px] text-[#a3aed0] font-medium">
          Deja membre ?
          <a routerLink="/auth/sign-in" class="font-bold text-brand-primary hover:underline ml-1">Se connecter</a>
        </p>
      </ng-template>
    </div>
  `,
  styles: [`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`],
})
export class SignUpComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);

  readonly inputClass =
    'w-full rounded-[16px] border border-[#e0e5f2] dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 py-3.5 text-[14px] font-medium outline-none placeholder:text-[#a3aed0] focus:border-brand-primary transition-colors';

  showPassword = signal(false);
  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);
  roles = signal<Role[]>(['ROLE_TECH', 'ROLE_FINANCE']);

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    requestedRole: ['' as Role | '', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    terms: [false, [Validators.requiredTrue]],
  });

  ngOnInit(): void {
    this.api
      .selectableRoles()
      .then((roles) => {
        if (roles?.length) this.roles.set(roles);
      })
      .catch(() => { /* keep defaults */ });
  }

  label(role: string): string {
    return roleLabel(role);
  }

  roleMeta(role: string): { icon: string; desc: string } {
    return ROLE_META[role] ?? { icon: 'user', desc: '' };
  }

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez remplir tous les champs et accepter les conditions.');
      return;
    }

    this.loading.set(true);
    const v = this.form.getRawValue();

    try {
      await this.api.signup({
        username: v.username.trim(),
        email: v.email.trim(),
        fullName: `${v.firstName} ${v.lastName}`.trim(),
        password: v.password,
        requestedRole: v.requestedRole as Role,
      });
      this.submitted.set(true);
    } catch (err) {
      this.error.set(
        err instanceof AuthApiError
          ? err.message
          : "La demande d'inscription a echoue."
      );
    } finally {
      this.loading.set(false);
    }
  }
}
