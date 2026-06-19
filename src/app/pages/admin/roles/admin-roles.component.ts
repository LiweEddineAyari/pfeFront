import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService, AuthApiError } from '../../../core/auth/auth-api.service';
import { PermissionResponse, RoleResponse, roleLabel } from '../../../core/auth/models/auth.model';

type Banner = { kind: 'success' | 'error'; text: string } | null;

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pb-10">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 class="text-[22px] font-extrabold text-text-primary">Roles &amp; permissions</h2>
          <p class="text-[13px] text-text-secondary mt-1">Definissez quels roles peuvent appeler quels endpoints. Les changements sont appliques sans redemarrage.</p>
        </div>
        <button (click)="openCreate()" [class]="primaryBtn">
          <lucide-icon name="plus" [size]="18" [strokeWidth]="2.4"></lucide-icon>
          Nouveau role
        </button>
      </div>

      <div *ngIf="banner()" [class]="bannerClass(banner()!.kind)">
        <lucide-icon [name]="banner()!.kind === 'success' ? 'check-circle' : 'alert-circle'" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
        <span>{{ banner()!.text }}</span>
      </div>

      <div *ngIf="loading()" class="py-16 text-center text-text-secondary">
        <lucide-icon name="loader-2" [size]="26" [strokeWidth]="2.4" class="animate-spin inline-block"></lucide-icon>
      </div>

      <div *ngIf="!loading()" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div *ngFor="let role of roles(); trackBy: trackById"
          class="rounded-3xl bg-card shadow-card-light dark:shadow-card-dark border border-black/[0.03] dark:border-white/[0.04] p-6">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-11 h-11 rounded-[13px] bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <lucide-icon name="shield-check" [size]="22" [strokeWidth]="2.2"></lucide-icon>
              </span>
              <div class="min-w-0">
                <p class="text-[16px] font-extrabold text-text-primary truncate flex items-center gap-2">
                  {{ label(role.name) }}
                  <span *ngIf="role.system" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#a3aed0]/15 text-text-secondary">Systeme</span>
                </p>
                <p class="text-[12.5px] text-text-secondary truncate">{{ role.description || role.name }}</p>
              </div>
            </div>
          </div>

          <div class="mt-4">
            <p class="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">
              Permissions ({{ role.permissions.length }})
            </p>
            <div class="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
              <span *ngFor="let p of role.permissions"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-light-bg dark:bg-white/[0.05] text-text-secondary border border-black/[0.04] dark:border-white/[0.04]">
                <span class="font-mono text-brand-primary">{{ p.httpMethod }}</span>
                {{ p.pathPattern }}
              </span>
              <span *ngIf="role.permissions.length === 0" class="text-[12px] text-text-secondary italic">Aucune permission accordee.</span>
            </div>
          </div>

          <div class="mt-5 flex items-center gap-2.5">
            <button (click)="openPerms(role)" class="flex-1 inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#e0e5f2] dark:border-white/10 bg-card text-[13px] font-bold text-text-primary py-2.5 hover:border-brand-primary hover:text-brand-primary transition-colors">
              <lucide-icon name="settings-2" [size]="16" [strokeWidth]="2.2"></lucide-icon>
              Gerer les permissions
            </button>
            <button *ngIf="!role.system" (click)="askDelete(role)" [disabled]="busyId() === role.id"
              class="w-11 h-[42px] rounded-[12px] border border-red-200 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center transition-colors disabled:opacity-50" title="Supprimer le role">
              <lucide-icon name="trash-2" [size]="16" [strokeWidth]="2.2"></lucide-icon>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create role modal -->
    <div *ngIf="createOpen()" class="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="createOpen.set(false)"></div>
      <div class="relative w-full max-w-md rounded-3xl bg-card shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-[menuIn_0.18s_ease]">
        <div class="px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-center gap-3">
          <span class="w-10 h-10 rounded-[12px] bg-brand-primary/10 text-brand-primary flex items-center justify-center"><lucide-icon name="shield-check" [size]="20" [strokeWidth]="2.2"></lucide-icon></span>
          <h3 class="text-[18px] font-extrabold text-text-primary">Nouveau role</h3>
        </div>
        <form [formGroup]="roleForm" (ngSubmit)="createRole()" class="p-6 flex flex-col gap-4">
          <div *ngIf="modalError()" [class]="bannerClass('error')">
            <lucide-icon name="alert-circle" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
            <span>{{ modalError() }}</span>
          </div>
          <div>
            <label class="block text-[13px] font-bold text-text-primary mb-1.5">Nom du role</label>
            <input formControlName="name" type="text" [class]="inputClass" placeholder="ROLE_AUDITEUR" />
            <p class="text-[11px] text-text-secondary mt-1">Prefixez par <code class="font-mono">ROLE_</code>.</p>
          </div>
          <div>
            <label class="block text-[13px] font-bold text-text-primary mb-1.5">Description</label>
            <input formControlName="description" type="text" [class]="inputClass" placeholder="Acces en lecture seule" />
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" (click)="createOpen.set(false)" class="px-5 py-2.5 rounded-[14px] text-[14px] font-bold text-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Annuler</button>
            <button type="submit" [disabled]="saving()" [class]="primaryBtn">
              <lucide-icon *ngIf="saving()" name="loader-2" [size]="17" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
              Creer
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Manage permissions modal -->
    <div *ngIf="permRole() as role" class="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="closePerms()"></div>
      <div class="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-card shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-[menuIn_0.18s_ease]">
        <div class="px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-center gap-3">
          <span class="w-10 h-10 rounded-[12px] bg-brand-primary/10 text-brand-primary flex items-center justify-center"><lucide-icon name="settings-2" [size]="20" [strokeWidth]="2.2"></lucide-icon></span>
          <div>
            <h3 class="text-[18px] font-extrabold text-text-primary">Permissions &mdash; {{ label(role.name) }}</h3>
            <p class="text-[12px] text-text-secondary">{{ selected().size }} selectionnee(s)</p>
          </div>
        </div>

        <div class="p-3 overflow-y-auto custom-scrollbar flex-1">
          <label *ngFor="let p of permissions(); trackBy: trackPermById"
            class="flex items-center gap-3 px-3 py-2.5 rounded-[12px] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors">
            <input type="checkbox" [checked]="selected().has(p.id)" (change)="togglePerm(p.id)" class="peer sr-only" />
            <span class="w-[20px] h-[20px] rounded-[6px] border-2 border-[#cbd5e1] dark:border-white/20 peer-checked:bg-brand-primary peer-checked:border-brand-primary flex items-center justify-center transition-all shrink-0">
              <lucide-icon name="check" [size]="13" [strokeWidth]="3.5" class="text-white"></lucide-icon>
            </span>
            <span class="font-mono text-[12px] font-bold text-brand-primary w-14 shrink-0">{{ p.httpMethod }}</span>
            <span class="font-mono text-[12.5px] text-text-primary truncate">{{ p.pathPattern }}</span>
            <span class="ml-auto text-[11px] text-text-secondary truncate hidden sm:block max-w-[40%]">{{ p.description }}</span>
          </label>
          <p *ngIf="permissions().length === 0" class="text-center text-text-secondary text-[13px] py-8">Aucune permission disponible.</p>
        </div>

        <div class="px-6 py-4 border-t border-black/5 dark:border-white/10 flex justify-end gap-3">
          <button type="button" (click)="closePerms()" class="px-5 py-2.5 rounded-[14px] text-[14px] font-bold text-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Annuler</button>
          <button (click)="savePerms()" [disabled]="saving()" [class]="primaryBtn">
            <lucide-icon *ngIf="saving()" name="loader-2" [size]="17" [strokeWidth]="2.5" class="animate-spin"></lucide-icon>
            Enregistrer
          </button>
        </div>
      </div>
    </div>

    <!-- Delete role confirmation modal -->
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
        <p class="text-[13.5px] text-text-secondary mb-3 leading-relaxed">Voulez-vous vraiment supprimer ce role ?</p>
        <div class="rounded-[14px] bg-light-bg dark:bg-white/[0.04] border border-[#e0e5f2] dark:border-white/[0.08] px-4 py-3 mb-5 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-[9px] bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <lucide-icon name="shield-check" [size]="16" [strokeWidth]="2.2"></lucide-icon>
          </span>
          <span class="text-[14px] font-bold text-text-primary truncate">{{ label(pendingDelete()!.name) }}</span>
        </div>
        <div class="flex gap-3 justify-end">
          <button (click)="pendingDelete.set(null)" class="px-5 py-2.5 rounded-[14px] text-[14px] font-bold text-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Annuler</button>
          <button (click)="confirmDeleteRole()" [disabled]="busyId() !== null"
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
  `],
})
export class AdminRolesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);

  readonly inputClass =
    'w-full rounded-[14px] border border-[#e0e5f2] dark:border-white/10 bg-light-bg dark:bg-white/[0.04] px-4 py-3 text-[14px] font-medium text-text-primary outline-none placeholder:text-[#a3aed0] focus:border-brand-primary transition-colors';
  readonly primaryBtn =
    'inline-flex items-center gap-2 rounded-[14px] bg-brand-primary text-white font-bold text-[14px] px-5 py-2.5 shadow-[0_8px_24px_rgba(1,181,116,0.35)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60';

  roles = signal<RoleResponse[]>([]);
  permissions = signal<PermissionResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  busyId = signal<number | null>(null);
  banner = signal<Banner>(null);
  modalError = signal<string | null>(null);

  createOpen = signal(false);
  permRole = signal<RoleResponse | null>(null);
  selected = signal<Set<number>>(new Set());
  pendingDelete = signal<RoleResponse | null>(null);

  roleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/^ROLE_[A-Z0-9_]+$/)]],
    description: [''],
  });

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.banner.set(null);
    try {
      const [roles, perms] = await Promise.all([this.api.listRoles(), this.api.listPermissions()]);
      this.roles.set(roles);
      this.permissions.set(perms);
    } catch (err) {
      this.banner.set({ kind: 'error', text: this.msg(err, 'Chargement impossible.') });
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.modalError.set(null);
    this.roleForm.reset({ name: 'ROLE_', description: '' });
    this.createOpen.set(true);
  }

  async createRole(): Promise<void> {
    if (this.saving()) return;
    this.modalError.set(null);
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      this.modalError.set('Nom invalide. Format attendu : ROLE_XXX (majuscules).');
      return;
    }
    this.saving.set(true);
    try {
      await this.api.createRole(this.roleForm.getRawValue());
      this.createOpen.set(false);
      this.banner.set({ kind: 'success', text: 'Role cree avec succes.' });
      await this.reload();
    } catch (err) {
      this.modalError.set(this.msg(err, 'La creation a echoue.'));
    } finally {
      this.saving.set(false);
    }
  }

  askDelete(role: RoleResponse): void {
    if (role.system) return;
    this.pendingDelete.set(role);
  }

  async confirmDeleteRole(): Promise<void> {
    const role = this.pendingDelete();
    if (!role) return;
    this.pendingDelete.set(null);
    this.busyId.set(role.id);
    this.banner.set(null);
    try {
      await this.api.deleteRole(role.id);
      this.banner.set({ kind: 'success', text: 'Role supprime.' });
      await this.reload();
    } catch (err) {
      this.banner.set({ kind: 'error', text: this.msg(err, 'Suppression impossible.') });
    } finally {
      this.busyId.set(null);
    }
  }

  openPerms(role: RoleResponse): void {
    this.modalError.set(null);
    this.selected.set(new Set(role.permissions.map((p) => p.id)));
    this.permRole.set(role);
  }

  closePerms(): void {
    this.permRole.set(null);
  }

  togglePerm(id: number): void {
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
  }

  async savePerms(): Promise<void> {
    const role = this.permRole();
    if (!role || this.saving()) return;
    this.saving.set(true);
    this.banner.set(null);
    try {
      await this.api.assignPermissions(role.id, [...this.selected()]);
      this.closePerms();
      this.banner.set({ kind: 'success', text: 'Permissions mises a jour (effet immediat).' });
      await this.reload();
    } catch (err) {
      this.banner.set({ kind: 'error', text: this.msg(err, 'Mise a jour impossible.') });
    } finally {
      this.saving.set(false);
    }
  }

  label(name: string): string { return roleLabel(name); }
  trackById(_: number, r: RoleResponse): number { return r.id; }
  trackPermById(_: number, p: PermissionResponse): number { return p.id; }

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
