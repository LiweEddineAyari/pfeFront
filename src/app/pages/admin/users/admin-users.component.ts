import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService, AuthApiError } from '../../../core/auth/auth-api.service';
import { CreateUserRequest, UpdateUserRequest, UserResponse, roleLabel } from '../../../core/auth/models/auth.model';

type Banner = { kind: 'success' | 'error'; text: string } | null;

const ROLE_META: Record<string, { icon: string; desc: string }> = {
  ROLE_ADMIN:   { icon: 'shield-check',  desc: 'Gestion des utilisateurs & acces' },
  ROLE_TECH:    { icon: 'wrench',        desc: 'Mapping, ETL, parametres & ratios' },
  ROLE_FINANCE: { icon: 'trending-up',   desc: 'Dashboard, chatbot & analyses'     },
};

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pb-10">
      <!-- header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 class="text-[22px] font-extrabold text-text-primary">Utilisateurs</h2>
          <p class="text-[13px] text-text-secondary mt-1">Creez, modifiez, bloquez ou supprimez les comptes.</p>
        </div>
        <button (click)="openCreate()" [class]="primaryBtn">
          <lucide-icon name="user-plus" [size]="18" [strokeWidth]="2.4"></lucide-icon>
          Nouvel utilisateur
        </button>
      </div>

      <div *ngIf="banner()" [class]="bannerClass(banner()!.kind)">
        <lucide-icon [name]="banner()!.kind === 'success' ? 'check-circle' : 'alert-circle'" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
        <span>{{ banner()!.text }}</span>
      </div>

      <!-- toolbar -->
      <div class="flex items-center gap-3 mb-4">
        <div class="flex items-center gap-2 flex-1 max-w-md rounded-[14px] border border-[#e0e5f2] dark:border-white/10 bg-card px-4 py-2.5">
          <lucide-icon name="search" [size]="16" [strokeWidth]="2.4" class="text-[#a3aed0]"></lucide-icon>
          <input [value]="search()" (input)="search.set($any($event.target).value)" type="text" placeholder="Rechercher par nom, e-mail..."
            class="w-full bg-transparent outline-none text-[14px] font-medium text-text-primary placeholder:text-[#a3aed0]" />
        </div>
        <button (click)="reload()" class="w-11 h-11 rounded-[14px] border border-[#e0e5f2] dark:border-white/10 bg-card text-text-secondary hover:text-brand-primary flex items-center justify-center transition-colors" aria-label="Actualiser">
          <lucide-icon name="rotate-ccw" [size]="18" [strokeWidth]="2.2" [class.animate-spin]="loading()"></lucide-icon>
        </button>
      </div>

      <!-- table card -->
      <div class="rounded-3xl bg-card shadow-card-light dark:shadow-card-dark border border-black/[0.03] dark:border-white/[0.04] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-black/5 dark:border-white/5 text-[11px] uppercase tracking-wider text-text-secondary">
                <th class="px-5 py-4 font-bold">Utilisateur</th>
                <th class="px-5 py-4 font-bold hidden md:table-cell">E-mail</th>
                <th class="px-5 py-4 font-bold">Role</th>
                <th class="px-5 py-4 font-bold">Statut</th>
                <th class="px-5 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading()">
                <td colspan="5" class="px-5 py-10 text-center text-text-secondary text-[14px]">
                  <lucide-icon name="loader-2" [size]="22" [strokeWidth]="2.4" class="animate-spin inline-block"></lucide-icon>
                </td>
              </tr>

              <tr *ngFor="let u of filtered(); trackBy: trackById" class="border-b border-black/[0.03] dark:border-white/[0.04] hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-[11px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">{{ initials(u) }}</div>
                    <div class="min-w-0">
                      <p class="text-[14px] font-bold text-text-primary truncate">{{ u.fullName || u.username }}</p>
                      <p class="text-[12px] text-text-secondary truncate">&#64;{{ u.username }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 text-[13px] text-text-secondary hidden md:table-cell">{{ u.email || '&#8212;' }}</td>
                <td class="px-5 py-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold bg-brand-primary/10 text-brand-primary">
                    <lucide-icon [name]="roleMeta(u.role).icon" [size]="12" [strokeWidth]="2.5"></lucide-icon>
                    {{ label(u.role) }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold" [ngClass]="statusClass(u.status)">
                    <span class="w-1.5 h-1.5 rounded-full" [ngClass]="statusDot(u.status)"></span>
                    {{ statusLabel(u.status) }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <div class="flex items-center justify-end gap-1.5">
                    <button (click)="openEdit(u)" class="icon-btn" title="Modifier"><lucide-icon name="pencil" [size]="16" [strokeWidth]="2.2"></lucide-icon></button>
                    <button *ngIf="u.status !== 'BLOCKED'" (click)="block(u)" [disabled]="busyId() === u.keycloakUserId" class="icon-btn hover:!text-amber-500" title="Bloquer"><lucide-icon name="ban" [size]="16" [strokeWidth]="2.2"></lucide-icon></button>
                    <button *ngIf="u.status === 'BLOCKED'" (click)="unblock(u)" [disabled]="busyId() === u.keycloakUserId" class="icon-btn hover:!text-brand-primary" title="Debloquer"><lucide-icon name="user-check" [size]="16" [strokeWidth]="2.2"></lucide-icon></button>
                    <button (click)="askDelete(u)" [disabled]="busyId() === u.keycloakUserId" class="icon-btn hover:!text-red-500" title="Supprimer"><lucide-icon name="trash-2" [size]="16" [strokeWidth]="2.2"></lucide-icon></button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="!loading() && filtered().length === 0">
                <td colspan="5" class="px-5 py-12 text-center text-text-secondary">
                  <lucide-icon name="users" [size]="28" [strokeWidth]="1.8" class="inline-block mb-2 opacity-50"></lucide-icon>
                  <p class="text-[14px] font-medium">Aucun utilisateur trouve.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create / Edit modal -->
    <div *ngIf="modal()" class="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="closeModal()"></div>
      <div class="relative w-full max-w-md rounded-3xl bg-card shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-[menuIn_0.18s_ease]">
        <div class="px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-center gap-3">
          <span class="w-10 h-10 rounded-[12px] bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <lucide-icon [name]="modal() === 'create' ? 'user-plus' : 'user-cog'" [size]="20" [strokeWidth]="2.2"></lucide-icon>
          </span>
          <h3 class="text-[18px] font-extrabold text-text-primary">{{ modal() === 'create' ? 'Nouvel utilisateur' : 'Modifier utilisateur' }}</h3>
        </div>

        <form [formGroup]="userForm" (ngSubmit)="submit()" class="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div *ngIf="modalError()" [class]="bannerClass('error')">
            <lucide-icon name="alert-circle" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
            <span>{{ modalError() }}</span>
          </div>

          <div *ngIf="modal() === 'create'">
            <label class="block text-[13px] font-bold text-text-primary mb-1.5">Identifiant</label>
            <input formControlName="username" type="text" [class]="inputClass" placeholder="jdupont" />
          </div>
          <div>
            <label class="block text-[13px] font-bold text-text-primary mb-1.5">Nom complet</label>
            <input formControlName="fullName" type="text" [class]="inputClass" placeholder="Jean Dupont" />
          </div>
          <div>
            <label class="block text-[13px] font-bold text-text-primary mb-1.5">E-mail</label>
            <input formControlName="email" type="email" [class]="inputClass" placeholder="mail@exemple.com" />
          </div>

          <!-- Role card picker -->
          <div>
            <label class="block text-[13px] font-bold text-text-primary mb-2">Role</label>
            <div class="flex flex-col gap-2">
              <button *ngFor="let r of allRoles" type="button" (click)="userForm.get('role')!.setValue(r)"
                class="group relative flex items-center gap-3.5 p-3.5 rounded-[16px] border-2 text-left transition-all duration-200 w-full focus:outline-none"
                [ngClass]="userForm.get('role')!.value === r
                  ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 shadow-[0_0_0_4px_rgba(1,181,116,0.08)]'
                  : 'border-[#e0e5f2] dark:border-white/10 bg-light-bg dark:bg-white/[0.03] hover:border-brand-primary/50 hover:bg-brand-primary/[0.02]'">
                <div class="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 transition-all"
                  [ngClass]="userForm.get('role')!.value === r
                    ? 'bg-brand-primary text-white shadow-[0_4px_12px_rgba(1,181,116,0.4)]'
                    : 'bg-[#a3aed0]/10 dark:bg-white/[0.06] text-[#a3aed0] group-hover:bg-brand-primary/10 group-hover:text-brand-primary'">
                  <lucide-icon [name]="roleMeta(r).icon" [size]="18" [strokeWidth]="2.2"></lucide-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[13.5px] font-bold transition-colors" [ngClass]="userForm.get('role')!.value === r ? 'text-brand-primary' : 'text-text-primary group-hover:text-brand-primary'">{{ label(r) }}</p>
                  <p class="text-[11.5px] text-text-secondary leading-snug mt-0.5">{{ roleMeta(r).desc }}</p>
                </div>
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                  [ngClass]="userForm.get('role')!.value === r
                    ? 'border-brand-primary bg-brand-primary'
                    : 'border-[#cbd5e1] dark:border-white/20'">
                  <lucide-icon *ngIf="userForm.get('role')!.value === r" name="check" [size]="11" [strokeWidth]="3.5" class="text-white"></lucide-icon>
                </div>
              </button>
            </div>
          </div>

          <div *ngIf="modal() === 'create'">
            <label class="block text-[13px] font-bold text-text-primary mb-1.5">Mot de passe temporaire</label>
            <input formControlName="temporaryPassword" type="text" [class]="inputClass" placeholder="Min. 8 caracteres" />
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" (click)="closeModal()" class="px-5 py-2.5 rounded-[14px] text-[14px] font-bold text-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Annuler</button>
            <button type="submit" [disabled]="saving()" [class]="primaryBtn">
              <lucide-icon *ngIf="saving()" name="loader-2" [size]="17" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
              {{ modal() === 'create' ? 'Creer' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div *ngIf="pendingDelete()" class="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="pendingDelete.set(null)"></div>
      <div class="relative w-full max-w-sm rounded-3xl bg-card shadow-2xl border border-black/5 dark:border-white/10 p-6 animate-[popIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)]">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
            <lucide-icon name="alert-triangle" [size]="24" [strokeWidth]="2.2" class="text-red-500"></lucide-icon>
          </div>
          <div>
            <h3 class="text-[17px] font-extrabold text-text-primary">Confirmer la suppression</h3>
            <p class="text-[12.5px] text-red-500 font-semibold mt-0.5">Cette action est irreversible.</p>
          </div>
        </div>
        <p class="text-[13.5px] text-text-secondary mb-3 leading-relaxed">Voulez-vous vraiment supprimer definitivement cet utilisateur ?</p>
        <div class="rounded-[14px] bg-light-bg dark:bg-white/[0.04] border border-[#e0e5f2] dark:border-white/[0.08] px-4 py-3 mb-5 flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-[9px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">{{ initials(pendingDelete()!) }}</div>
          <div class="min-w-0">
            <p class="text-[14px] font-bold text-text-primary truncate">{{ pendingDelete()!.fullName || pendingDelete()!.username }}</p>
            <p class="text-[11.5px] text-text-secondary truncate">&#64;{{ pendingDelete()!.username }}</p>
          </div>
        </div>
        <div class="flex gap-3 justify-end">
          <button (click)="pendingDelete.set(null)" class="px-5 py-2.5 rounded-[14px] text-[14px] font-bold text-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Annuler</button>
          <button (click)="confirmDelete()" [disabled]="busyId() !== null"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-[14px] font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_6px_20px_rgba(239,68,68,0.35)] disabled:opacity-60">
            <lucide-icon *ngIf="busyId() !== null" name="loader-2" [size]="15" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
            <lucide-icon *ngIf="busyId() === null" name="trash-2" [size]="15" [strokeWidth]="2.4"></lucide-icon>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes menuIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: none; } }
    @keyframes popIn  { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: none; } }
    .icon-btn { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; color: var(--color-muted); transition: all .2s; }
    .icon-btn:hover { background: rgba(0,0,0,0.05); color: var(--text-primary); }
    :host-context(html.dark) .icon-btn:hover { background: rgba(255,255,255,0.07); }
    .icon-btn:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class AdminUsersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);

  readonly allRoles = ['ROLE_ADMIN', 'ROLE_TECH', 'ROLE_FINANCE'];
  readonly inputClass =
    'w-full rounded-[14px] border border-[#e0e5f2] dark:border-white/10 bg-light-bg dark:bg-white/[0.04] px-4 py-3 text-[14px] font-medium text-text-primary outline-none placeholder:text-[#a3aed0] focus:border-brand-primary transition-colors';
  readonly primaryBtn =
    'inline-flex items-center gap-2 rounded-[14px] bg-brand-primary text-white font-bold text-[14px] px-5 py-2.5 shadow-[0_8px_24px_rgba(1,181,116,0.35)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60';

  users = signal<UserResponse[]>([]);
  search = signal('');
  loading = signal(false);
  saving = signal(false);
  busyId = signal<string | null>(null);
  banner = signal<Banner>(null);
  modal = signal<'create' | 'edit' | null>(null);
  modalError = signal<string | null>(null);
  pendingDelete = signal<UserResponse | null>(null);
  private editingId: string | null = null;

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.users();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.fullName ?? '').toLowerCase().includes(q)
    );
  });

  userForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    fullName: [''],
    email: ['', [Validators.required, Validators.email]],
    role: ['ROLE_FINANCE', [Validators.required]],
    temporaryPassword: ['', [Validators.minLength(8)]],
  });

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.banner.set(null);
    try {
      this.users.set(await this.api.listUsers(0, 200));
    } catch (err) {
      this.banner.set({ kind: 'error', text: this.msg(err, 'Chargement des utilisateurs impossible.') });
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.editingId = null;
    this.modalError.set(null);
    this.userForm.reset({ username: '', fullName: '', email: '', role: 'ROLE_FINANCE', temporaryPassword: '' });
    this.userForm.get('username')!.enable();
    this.userForm.get('temporaryPassword')!.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('temporaryPassword')!.updateValueAndValidity();
    this.modal.set('create');
  }

  openEdit(u: UserResponse): void {
    this.editingId = u.keycloakUserId;
    this.modalError.set(null);
    this.userForm.reset({
      username: u.username,
      fullName: u.fullName ?? '',
      email: u.email ?? '',
      role: this.allRoles.includes(u.role) ? u.role : 'ROLE_FINANCE',
      temporaryPassword: '',
    });
    this.userForm.get('username')!.disable();
    this.userForm.get('temporaryPassword')!.clearValidators();
    this.userForm.get('temporaryPassword')!.updateValueAndValidity();
    this.modal.set('edit');
  }

  closeModal(): void {
    this.modal.set(null);
  }

  async submit(): Promise<void> {
    if (this.saving()) return;
    this.modalError.set(null);
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.modalError.set('Veuillez remplir correctement tous les champs requis.');
      return;
    }

    this.saving.set(true);
    const v = this.userForm.getRawValue();
    try {
      if (this.modal() === 'create') {
        const payload: CreateUserRequest = {
          username: v.username.trim(),
          email: v.email.trim(),
          fullName: v.fullName.trim(),
          role: v.role,
          temporaryPassword: v.temporaryPassword,
        };
        await this.api.createUser(payload);
        this.banner.set({ kind: 'success', text: 'Utilisateur cree avec succes.' });
      } else if (this.editingId) {
        const payload: UpdateUserRequest = {
          email: v.email.trim(),
          fullName: v.fullName.trim(),
          role: v.role,
        };
        await this.api.updateUser(this.editingId, payload);
        this.banner.set({ kind: 'success', text: 'Utilisateur mis a jour.' });
      }
      this.closeModal();
      await this.reload();
    } catch (err) {
      this.modalError.set(this.msg(err, "L'operation a echoue."));
    } finally {
      this.saving.set(false);
    }
  }

  async block(u: UserResponse): Promise<void> {
    await this.act(u, () => this.api.blockUser(u.keycloakUserId), 'Utilisateur bloque.');
  }

  async unblock(u: UserResponse): Promise<void> {
    await this.act(u, () => this.api.unblockUser(u.keycloakUserId), 'Utilisateur debloque.');
  }

  askDelete(u: UserResponse): void {
    this.pendingDelete.set(u);
  }

  async confirmDelete(): Promise<void> {
    const u = this.pendingDelete();
    if (!u) return;
    this.pendingDelete.set(null);
    await this.act(u, () => this.api.deleteUser(u.keycloakUserId), 'Utilisateur supprime.');
  }

  private async act(u: UserResponse, op: () => Promise<unknown>, success: string): Promise<void> {
    if (this.busyId()) return;
    this.busyId.set(u.keycloakUserId);
    this.banner.set(null);
    try {
      await op();
      this.banner.set({ kind: 'success', text: success });
      await this.reload();
    } catch (err) {
      this.banner.set({ kind: 'error', text: this.msg(err, "L'operation a echoue.") });
    } finally {
      this.busyId.set(null);
    }
  }

  label(role: string): string { return roleLabel(role); }
  roleMeta(role: string): { icon: string; desc: string } {
    return ROLE_META[role] ?? { icon: 'user', desc: '' };
  }
  trackById(_: number, u: UserResponse): string { return u.keycloakUserId; }

  initials(u: UserResponse): string {
    const s = (u.fullName || u.username || '').trim();
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase() || 'U';
  }

  statusLabel(s: string): string {
    return s === 'ACTIVE' ? 'Actif' : s === 'BLOCKED' ? 'Bloque' : 'En attente';
  }
  statusClass(s: string): string {
    return s === 'ACTIVE'
      ? 'bg-brand-primary/10 text-brand-primary'
      : s === 'BLOCKED'
        ? 'bg-red-500/10 text-red-500'
        : 'bg-amber-500/10 text-amber-500';
  }
  statusDot(s: string): string {
    return s === 'ACTIVE' ? 'bg-brand-primary' : s === 'BLOCKED' ? 'bg-red-500' : 'bg-amber-500';
  }

  bannerClass(kind: 'success' | 'error'): string {
    const base = 'flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-[13px] font-medium mb-4';
    return kind === 'success'
      ? `${base} bg-brand-primary/10 text-brand-primary`
      : `${base} bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400`;
  }

  private msg(err: unknown, fallback: string): string {
    return err instanceof AuthApiError ? err.message : fallback;
  }
}
