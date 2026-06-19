import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService, AuthApiError } from '../../core/auth/auth-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileResponse, roleLabel } from '../../core/auth/models/auth.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[1100px] mx-auto pb-10">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Identity summary -->
        <div class="lg:col-span-1">
          <div class="rounded-3xl bg-card shadow-card-light dark:shadow-card-dark overflow-hidden border border-black/[0.03] dark:border-white/[0.04]">
            <div class="h-24 bg-gradient-to-br from-[#06d6a0] via-[#01b574] to-[#019267]"></div>
            <div class="px-6 pb-6 -mt-12">
              <div class="w-24 h-24 rounded-[26px] bg-gradient-to-br from-indigo-500 to-purple-600 ring-4 ring-card flex items-center justify-center text-white text-[28px] font-black shadow-lg">
                {{ initials() }}
              </div>
              <h2 class="mt-4 text-[20px] font-extrabold text-text-primary">{{ profile()?.fullName || '—' }}</h2>
              <p class="text-[13px] text-text-secondary font-medium flex items-center gap-1.5 mt-1">
                <lucide-icon name="at-sign" [size]="14" [strokeWidth]="2.2"></lucide-icon>
                {{ profile()?.username }}
              </p>
              <p class="text-[13px] text-text-secondary font-medium flex items-center gap-1.5 mt-1">
                <lucide-icon name="mail" [size]="14" [strokeWidth]="2.2"></lucide-icon>
                {{ profile()?.email || '—' }}
              </p>

              <div class="mt-5 flex flex-wrap gap-2">
                <span *ngFor="let r of profile()?.roles"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-brand-primary/10 text-brand-primary">
                  <lucide-icon name="shield-check" [size]="13" [strokeWidth]="2.5"></lucide-icon>
                  {{ label(r) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Forms -->
        <div class="lg:col-span-2 flex flex-col gap-6">

          <!-- Edit profile -->
          <div class="rounded-3xl bg-card shadow-card-light dark:shadow-card-dark p-6 sm:p-7 border border-black/[0.03] dark:border-white/[0.04]">
            <div class="flex items-center gap-3 mb-5">
              <span class="w-10 h-10 rounded-[12px] bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <lucide-icon name="user-cog" [size]="20" [strokeWidth]="2.2"></lucide-icon>
              </span>
              <div>
                <h3 class="text-[17px] font-extrabold text-text-primary">Informations personnelles</h3>
                <p class="text-[13px] text-text-secondary">Mettez à jour votre nom et votre adresse e-mail.</p>
              </div>
            </div>

            <div *ngIf="profileMsg()" [class]="msgClass(profileMsg()!.kind)">
              <lucide-icon [name]="profileMsg()!.kind === 'success' ? 'check-circle' : 'alert-circle'" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
              <span>{{ profileMsg()!.text }}</span>
            </div>

            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label class="block text-[13px] font-bold text-text-primary mb-1.5">Nom complet</label>
                <input formControlName="fullName" type="text" [class]="inputClass" placeholder="Votre nom" />
              </div>
              <div>
                <label class="block text-[13px] font-bold text-text-primary mb-1.5">E-mail</label>
                <input formControlName="email" type="email" [class]="inputClass" placeholder="mail@exemple.com" />
              </div>
              <div class="sm:col-span-2 flex justify-end">
                <button type="submit" [disabled]="savingProfile()" [class]="primaryBtn">
                  <lucide-icon *ngIf="savingProfile()" name="loader-2" [size]="17" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
                  {{ savingProfile() ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Change password -->
          <div class="rounded-3xl bg-card shadow-card-light dark:shadow-card-dark p-6 sm:p-7 border border-black/[0.03] dark:border-white/[0.04]">
            <div class="flex items-center gap-3 mb-5">
              <span class="w-10 h-10 rounded-[12px] bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <lucide-icon name="key-round" [size]="20" [strokeWidth]="2.2"></lucide-icon>
              </span>
              <div>
                <h3 class="text-[17px] font-extrabold text-text-primary">Mot de passe</h3>
                <p class="text-[13px] text-text-secondary">Changez votre mot de passe régulièrement pour plus de sécurité.</p>
              </div>
            </div>

            <div *ngIf="pwdMsg()" [class]="msgClass(pwdMsg()!.kind)">
              <lucide-icon [name]="pwdMsg()!.kind === 'success' ? 'check-circle' : 'alert-circle'" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
              <span>{{ pwdMsg()!.text }}</span>
            </div>

            <form [formGroup]="pwdForm" (ngSubmit)="changePassword()" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div class="sm:col-span-2">
                <label class="block text-[13px] font-bold text-text-primary mb-1.5">Mot de passe actuel</label>
                <input formControlName="currentPassword" type="password" autocomplete="current-password" [class]="inputClass" placeholder="••••••••" />
              </div>
              <div>
                <label class="block text-[13px] font-bold text-text-primary mb-1.5">Nouveau mot de passe</label>
                <input formControlName="newPassword" type="password" autocomplete="new-password" [class]="inputClass" placeholder="Min. 8 caractères" />
              </div>
              <div>
                <label class="block text-[13px] font-bold text-text-primary mb-1.5">Confirmer</label>
                <input formControlName="confirm" type="password" autocomplete="new-password" [class]="inputClass" placeholder="Répétez" />
              </div>
              <div class="sm:col-span-2 flex justify-end">
                <button type="submit" [disabled]="savingPwd()" [class]="primaryBtn">
                  <lucide-icon *ngIf="savingPwd()" name="loader-2" [size]="17" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
                  {{ savingPwd() ? 'Mise à jour…' : 'Changer le mot de passe' }}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);
  private auth = inject(AuthService);

  readonly inputClass =
    'w-full rounded-[14px] border border-[#e0e5f2] dark:border-white/10 bg-light-bg dark:bg-white/[0.04] px-4 py-3 text-[14px] font-medium text-text-primary outline-none placeholder:text-[#a3aed0] focus:border-brand-primary transition-colors';
  readonly primaryBtn =
    'inline-flex items-center gap-2 rounded-[14px] bg-brand-primary text-white font-bold text-[14px] px-6 py-3 shadow-[0_8px_24px_rgba(1,181,116,0.35)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60';

  profile = signal<ProfileResponse | null>(null);
  savingProfile = signal(false);
  savingPwd = signal(false);
  profileMsg = signal<{ kind: 'success' | 'error'; text: string } | null>(null);
  pwdMsg = signal<{ kind: 'success' | 'error'; text: string } | null>(null);

  initials = computed(() => {
    const source = (this.profile()?.fullName || this.profile()?.username || '').trim();
    if (!source) return 'U';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  });

  profileForm = this.fb.nonNullable.group({
    fullName: [''],
    email: ['', [Validators.email]],
  });

  pwdForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  ngOnInit(): void {
    void this.load();
  }

  label(role: string): string {
    return roleLabel(role);
  }

  msgClass(kind: 'success' | 'error'): string {
    const base = 'flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-[13px] font-medium mb-2';
    return kind === 'success'
      ? `${base} bg-brand-primary/10 text-brand-primary`
      : `${base} bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400`;
  }

  private async load(): Promise<void> {
    try {
      const p = await this.api.getProfile();
      this.profile.set(p);
      this.profileForm.patchValue({ fullName: p.fullName ?? '', email: p.email ?? '' });
    } catch (err) {
      // Fall back to the decoded token identity if /me is unavailable.
      const u = this.auth.currentUser();
      if (u) {
        const p: ProfileResponse = {
          userId: u.sub,
          username: u.username,
          email: u.email,
          fullName: u.fullName,
          roles: u.roles,
        };
        this.profile.set(p);
        this.profileForm.patchValue({ fullName: p.fullName, email: p.email });
      }
      this.profileMsg.set({
        kind: 'error',
        text: err instanceof AuthApiError ? err.message : 'Profil indisponible.',
      });
    }
  }

  async saveProfile(): Promise<void> {
    if (this.savingProfile()) return;
    this.profileMsg.set(null);
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.profileMsg.set({ kind: 'error', text: 'Adresse e-mail invalide.' });
      return;
    }

    this.savingProfile.set(true);
    try {
      const updated = await this.api.updateProfile(this.profileForm.getRawValue());
      this.profile.set(updated);
      this.profileMsg.set({ kind: 'success', text: 'Profil mis à jour avec succès.' });
    } catch (err) {
      this.profileMsg.set({
        kind: 'error',
        text: err instanceof AuthApiError ? err.message : 'La mise à jour a échoué.',
      });
    } finally {
      this.savingProfile.set(false);
    }
  }

  async changePassword(): Promise<void> {
    if (this.savingPwd()) return;
    this.pwdMsg.set(null);

    const { currentPassword, newPassword, confirm } = this.pwdForm.getRawValue();
    if (this.pwdForm.invalid) {
      this.pwdForm.markAllAsTouched();
      this.pwdMsg.set({ kind: 'error', text: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });
      return;
    }
    if (newPassword !== confirm) {
      this.pwdMsg.set({ kind: 'error', text: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    this.savingPwd.set(true);
    try {
      await this.api.changePassword({ currentPassword, newPassword });
      this.pwdForm.reset({ currentPassword: '', newPassword: '', confirm: '' });
      this.pwdMsg.set({ kind: 'success', text: 'Mot de passe changé avec succès.' });
    } catch (err) {
      this.pwdMsg.set({
        kind: 'error',
        text: err instanceof AuthApiError ? err.message : 'Le changement a échoué.',
      });
    } finally {
      this.savingPwd.set(false);
    }
  }
}
