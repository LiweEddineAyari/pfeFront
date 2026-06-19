import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';
import { LayoutService } from '../../core/services/layout.service';
import { AuthService } from '../../core/auth/auth.service';
import { roleLabel } from '../../core/auth/models/auth.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar w-full" role="banner">

      <!-- Left: Breadcrumb + Title -->
      <div class="topbar-left">
        <p class="topbar-breadcrumb">
          Pages / <span>{{ currentPageName }}</span>
        </p>
        <h1 class="topbar-title">{{ currentPageName }}</h1>
      </div>

      <!-- Right: Search + Icons + Theme Toggle + Avatar -->
      <div class="topbar-right">

        <div class="topbar-search hidden lg:flex">
          <lucide-icon name="search" [size]="16" [strokeWidth]="2.5"></lucide-icon>
          <input type="text" placeholder="Rechercher..." aria-label="Rechercher dans le tableau de bord" />
        </div>

        <button class="topbar-icon lg:hidden" aria-label="Rechercher">
          <lucide-icon name="search" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <button class="topbar-icon" aria-label="Notifications">
          <lucide-icon name="bell" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <button class="topbar-icon hidden sm:flex" aria-label="Informations">
          <lucide-icon name="info" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <button class="topbar-icon" (click)="toggleTheme()" aria-label="Changer le theme">
          <lucide-icon *ngIf="themeService.isDark$ | async" name="sun" [size]="18" [strokeWidth]="2.5"></lucide-icon>
          <lucide-icon *ngIf="!(themeService.isDark$ | async)" name="moon" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Avatar + dropdown -->
        <div class="relative">
          <button type="button" class="topbar-avatar" (click)="toggleMenu($event)" aria-label="Menu du compte">
            {{ initials() }}
          </button>

          <div *ngIf="menuOpen()"
               class="absolute right-0 mt-3 w-64 z-[400] rounded-[18px] border border-black/5 dark:border-white/10 bg-white dark:bg-[#111c44] shadow-[0_16px_48px_rgba(17,28,68,0.18)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden animate-[menuIn_0.15s_ease]">
            <div class="px-4 py-4 flex items-center gap-3 border-b border-black/5 dark:border-white/10">
              <div class="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-[14px] shrink-0">
                {{ initials() }}
              </div>
              <div class="min-w-0">
                <p class="text-[14px] font-bold text-[#1b2559] dark:text-white truncate">{{ displayName() }}</p>
                <p class="text-[12px] text-[#a3aed0] font-medium truncate">{{ email() || roleText() }}</p>
              </div>
            </div>

            <div class="p-2">
              <span class="block px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#a3aed0]">{{ roleText() }}</span>
              <a routerLink="/profile" (click)="closeMenu()"
                 class="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[14px] font-semibold text-[#475569] dark:text-[#cbd5e1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-[#1b2559] dark:hover:text-white transition-colors">
                <lucide-icon name="circle-user" [size]="18" [strokeWidth]="2.2"></lucide-icon>
                Mon profil
              </a>
              <button (click)="logout()"
                 class="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[14px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                <lucide-icon name="log-out" [size]="18" [strokeWidth]="2.2"></lucide-icon>
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Hamburger -->
        <button class="topbar-icon lg:hidden" (click)="layoutService.toggleMobileMenu()" aria-label="Ouvrir le menu">
          <lucide-icon name="menu" [size]="22" [strokeWidth]="2.5"></lucide-icon>
        </button>
      </div>

    </header>
  `,
  styles: [`@keyframes menuIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: none; } }`],
})
export class TopbarComponent {
  themeService = inject(ThemeService);
  layoutService = inject(LayoutService);
  auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private host = inject(ElementRef<HTMLElement>);

  currentPageName = 'Tableau de bord principal';
  menuOpen = signal(false);

  constructor() {
    this.currentPageName = this.getPageNameFromUrl(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentPageName = this.getPageNameFromUrl(event.urlAfterRedirects);
        this.menuOpen.set(false);
        this.cdr.markForCheck();
      });
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.set(!this.menuOpen());
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.menuOpen.set(false);
    void this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
      this.cdr.markForCheck();
    }
  }

  displayName(): string {
    const u = this.auth.currentUser();
    return u?.fullName?.trim() || u?.username || 'Utilisateur';
  }

  email(): string {
    return this.auth.currentUser()?.email ?? '';
  }

  roleText(): string {
    const roles = this.auth.roles();
    return roles.length ? roleLabel(roles[0]) : 'Membre';
  }

  initials(): string {
    const u = this.auth.currentUser();
    const source = (u?.fullName?.trim() || u?.username || '').trim();
    if (!source) return 'U';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }

  private getPageNameFromUrl(url: string): string {
    const [pathname] = url.split('?');
    const normalizedPath = pathname.replace(/\/+$/, '') || '/';

    const names: Record<string, string> = {
      '/': 'Tableau de bord principal',
      '/dashboard': 'Tableau de bord',
      '/etl-pipeline': 'Pipeline ETL',
      '/datamart': 'Datamart',
      '/datamart/client': 'Donnees clients',
      '/datamart/contrat': 'Donnees contrats',
      '/datamart/balance': 'Donnees balance',
      '/parameters': 'Parametres analytiques',
      '/parameters/nouveau': 'Nouveau parametre',
      '/ratios': 'Ratios dynamiques',
      '/ratios/nouveau': 'Nouveau ratio',
      '/stress-test': 'Simulation stress test',
      '/chatbot': 'Assistant IA',
      '/profile': 'Mon profil',
      '/admin/users': 'Gestion des utilisateurs',
      '/admin/roles': 'Rôles & permissions',
      '/admin/signup-requests': "Demandes d'inscription",
      '/mapping/configurations': 'Configurations de mapping',
      '/mapping/nouvelle-configuration': 'Nouvelle configuration',
    };
    if (names[normalizedPath]) return names[normalizedPath];

    return normalizedPath
      .split('/')
      .filter(Boolean)
      .map((segment) => segment.replace(/-/g, ' '))
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' / ');
  }
}
