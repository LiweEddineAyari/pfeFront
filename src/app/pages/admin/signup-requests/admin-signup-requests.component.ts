import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService, AuthApiError } from '../../../core/auth/auth-api.service';
import { SignupRequestResponse, roleLabel } from '../../../core/auth/models/auth.model';

type Banner = { kind: 'success' | 'error'; text: string } | null;

@Component({
  selector: 'app-admin-signup-requests',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pb-10">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 class="text-[22px] font-extrabold text-text-primary">Demandes d'inscription</h2>
          <p class="text-[13px] text-text-secondary mt-1">Approuvez ou rejetez les demandes de création de compte.</p>
        </div>
        <button (click)="reload()" class="inline-flex items-center gap-2 rounded-[14px] border border-[#e0e5f2] dark:border-white/10 bg-card text-[13px] font-bold text-text-primary px-4 py-2.5 hover:border-brand-primary hover:text-brand-primary transition-colors">
          <lucide-icon name="rotate-ccw" [size]="16" [strokeWidth]="2.2" [class.animate-spin]="loading()"></lucide-icon>
          Actualiser
        </button>
      </div>

      <div *ngIf="banner()" [class]="bannerClass(banner()!.kind)">
        <lucide-icon [name]="banner()!.kind === 'success' ? 'check-circle' : 'alert-circle'" [size]="18" [strokeWidth]="2.4" class="shrink-0 mt-px"></lucide-icon>
        <span>{{ banner()!.text }}</span>
      </div>

      <div *ngIf="loading()" class="py-16 text-center text-text-secondary">
        <lucide-icon name="loader-2" [size]="26" [strokeWidth]="2.4" class="animate-spin inline-block"></lucide-icon>
      </div>

      <!-- empty -->
      <div *ngIf="!loading() && pending().length === 0"
        class="rounded-3xl bg-card shadow-card-light dark:shadow-card-dark border border-black/[0.03] dark:border-white/[0.04] py-16 text-center">
        <span class="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-4">
          <lucide-icon name="check-circle" [size]="30" [strokeWidth]="2"></lucide-icon>
        </span>
        <p class="text-[15px] font-bold text-text-primary">Aucune demande en attente</p>
        <p class="text-[13px] text-text-secondary mt-1">Toutes les demandes d'inscription ont été traitées.</p>
      </div>

      <!-- list -->
      <div *ngIf="!loading() && pending().length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div *ngFor="let r of pending(); trackBy: trackById"
          class="rounded-3xl bg-card shadow-card-light dark:shadow-card-dark border border-black/[0.03] dark:border-white/[0.04] p-6">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[14px] font-bold shrink-0">{{ initials(r) }}</div>
            <div class="min-w-0 flex-1">
              <p class="text-[16px] font-extrabold text-text-primary truncate">{{ r.fullName || r.username }}</p>
              <p class="text-[12.5px] text-text-secondary truncate flex items-center gap-1.5">
                <lucide-icon name="at-sign" [size]="13" [strokeWidth]="2.2"></lucide-icon>{{ r.username }}
              </p>
            </div>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 shrink-0">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> En attente
            </span>
          </div>

          <div class="mt-4 space-y-2 text-[13px]">
            <p class="flex items-center gap-2 text-text-secondary"><lucide-icon name="mail" [size]="15" [strokeWidth]="2.2"></lucide-icon>{{ r.email }}</p>
            <p class="flex items-center gap-2 text-text-secondary">
              <lucide-icon name="shield-check" [size]="15" [strokeWidth]="2.2"></lucide-icon>
              Rôle demandé : <span class="font-bold text-brand-primary">{{ label(r.requestedRole) }}</span>
            </p>
            <p *ngIf="r.createdAt" class="flex items-center gap-2 text-text-secondary"><lucide-icon name="clock" [size]="15" [strokeWidth]="2.2"></lucide-icon>{{ formatDate(r.createdAt) }}</p>
          </div>

          <div class="mt-5 flex items-center gap-2.5">
            <button (click)="approve(r)" [disabled]="busyId() === r.id"
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-[12px] bg-brand-primary text-white text-[13px] font-bold py-2.5 shadow-[0_8px_20px_rgba(1,181,116,0.3)] hover:brightness-105 transition-all disabled:opacity-60">
              <lucide-icon [name]="busyId() === r.id ? 'loader-2' : 'user-check'" [size]="16" [strokeWidth]="2.4" [class.animate-spin]="busyId() === r.id"></lucide-icon>
              Approuver
            </button>
            <button (click)="reject(r)" [disabled]="busyId() === r.id"
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-[12px] border border-red-200 dark:border-red-500/20 text-red-500 text-[13px] font-bold py-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60">
              <lucide-icon name="user-x" [size]="16" [strokeWidth]="2.4"></lucide-icon>
              Rejeter
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminSignupRequestsComponent implements OnInit {
  private api = inject(AuthApiService);

  requests = signal<SignupRequestResponse[]>([]);
  loading = signal(false);
  busyId = signal<number | null>(null);
  banner = signal<Banner>(null);

  pending = computed(() => this.requests().filter((r) => r.status === 'PENDING'));

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.banner.set(null);
    try {
      this.requests.set(await this.api.listSignupRequests());
    } catch (err) {
      this.banner.set({ kind: 'error', text: this.msg(err, 'Chargement des demandes impossible.') });
    } finally {
      this.loading.set(false);
    }
  }

  async approve(r: SignupRequestResponse): Promise<void> {
    await this.act(r, () => this.api.approveSignup(r.id), `Compte de « ${r.username} » approuvé.`);
  }

  async reject(r: SignupRequestResponse): Promise<void> {
    if (!confirm(`Rejeter la demande de « ${r.username} » ? L'utilisateur sera supprimé.`)) return;
    await this.act(r, () => this.api.rejectSignup(r.id), `Demande de « ${r.username} » rejetée.`);
  }

  private async act(r: SignupRequestResponse, op: () => Promise<unknown>, success: string): Promise<void> {
    if (this.busyId()) return;
    this.busyId.set(r.id);
    this.banner.set(null);
    try {
      await op();
      this.banner.set({ kind: 'success', text: success });
      await this.reload();
    } catch (err) {
      this.banner.set({ kind: 'error', text: this.msg(err, "L'opération a échoué.") });
    } finally {
      this.busyId.set(null);
    }
  }

  label(role: string): string { return roleLabel(role); }
  trackById(_: number, r: SignupRequestResponse): number { return r.id; }

  initials(r: SignupRequestResponse): string {
    const s = (r.fullName || r.username || '').trim();
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase() || 'U';
  }

  formatDate(value: string): string {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
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
