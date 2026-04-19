import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { LayoutService } from '../../core/services/layout.service';

interface NavItem {
  label: string;
  icon: string;
  active: boolean;
  path: string;
  expanded?: boolean;
  children?: NavSubItem[];
}

interface NavSubItem {
  label: string;
  icon: string;
  path: string;
  active: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside *ngIf="{ collapsed: layoutService.isSidebarCollapsed$ | async } as state"
      class="w-full h-full flex flex-col bg-card transition-all duration-250 ease-out relative"
    >
      <!-- Logo & Toggle -->
      <div class="h-[var(--topbar-h)] flex items-center shrink-0 px-5 mt-4 group relative transition-all duration-200"
           [ngClass]="state.collapsed ? 'justify-center' : 'justify-between'">
        <!-- Logo Text -->
        <h1 class="text-[26px] font-extrabold tracking-tight text-text-primary whitespace-nowrap flex items-center gap-1 transition-opacity duration-200"
            [class.opacity-0]="state.collapsed"
            [class.w-0]="state.collapsed"
            [class.overflow-hidden]="state.collapsed">
          DASHBOARD <span class="font-normal">PRO</span>
        </h1>
        
        <!-- Mobile Close Button -->
        <button
          class="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary transition-all shrink-0 lg:hidden"
          (click)="layoutService.closeMobileMenu()"
          aria-label="Fermer le menu"
        >
          <lucide-icon name="x" [size]="22" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Desktop Toggle Anchor -->
        <button 
          class="w-8 h-8 rounded-lg items-center justify-center text-brand-primary hover:opacity-80 transition-all shrink-0 absolute right-4 hidden lg:flex"
          [class.relative]="state.collapsed"
          [class.right-auto]="state.collapsed"
          (click)="layoutService.toggleSidebar()"
          aria-label="Basculer la barre laterale"
        >
          <lucide-icon name="menu" [size]="24" [strokeWidth]="2.5" *ngIf="state.collapsed"></lucide-icon>
<svg *ngIf="!state.collapsed"
     width="24"
     height="24"
     viewBox="0 0 16 16"
     xmlns="http://www.w3.org/2000/svg"
     fill="none"
     stroke="currentColor"
     stroke-width="1.5"
     stroke-linecap="round"
     stroke-linejoin="round">

  <!-- Arrow (rounded) -->
  <path d="M10.5 4.5L7.5 8L10.5 11.5" />

  <!-- Rounded container -->
  <rect x="1.5" y="1.5" width="13" height="13" rx="3" ry="3" />

  <!-- Left panel bar -->
  <rect x="2.5" y="2.5" width="2" height="11" rx="1" />

</svg>
        </button>
      </div>

      <!-- Nav Items -->
      <nav class="flex-1 mt-6 px-3" role="navigation">
        <ul class="flex flex-col gap-1">
            <li *ngFor="let item of navItems; trackBy: trackByLabel"
              class="relative">

            <div class="relative">
              <a [routerLink]="item.path"
                 class="flex items-center rounded-xl transition-all duration-200 cursor-pointer overflow-hidden p-3 relative"
                 [ngClass]="{
                   'text-text-primary bg-page dark:bg-white/5 shadow-[inset_0_0_0_1px_rgba(163,174,208,0.18)]': item.active && !state.collapsed,
                   'text-text-secondary hover:bg-page/80 dark:hover:bg-white/5': !item.active || state.collapsed,
                   'justify-center': state.collapsed,
                   'pr-10': item.children?.length && !state.collapsed,
                   'bg-page/90 dark:bg-white/5': state.collapsed && isFloatingSubmenuOpen(item)
                 }"
                 [attr.aria-expanded]="item.children?.length && !state.collapsed ? item.expanded : null"
                 [attr.aria-haspopup]="item.children?.length ? 'menu' : null"
                 (click)="onNavItemClick(item, !!state.collapsed, $event)">

                 <!-- Active Indicator Pill for Collapsed State -->
                 <div *ngIf="item.active && state.collapsed"
                      class="absolute left-0 w-1 h-8 bg-[var(--color-primary)] rounded-r-lg"></div>

                 <lucide-icon [name]="item.icon" [size]="20" [strokeWidth]="item.active ? 2.5 : 2"
                              class="shrink-0 transition-colors"
                              [ngClass]="{
                                'text-brand-primary': item.active,
                                'text-text-primary': !item.active && !state.collapsed,
                                'text-text-secondary': !item.active && state.collapsed
                              }">
                 </lucide-icon>

                 <span class="text-[16px] font-bold whitespace-nowrap ml-4 transition-all duration-200"
                       [ngClass]="{
                         'text-text-primary': item.active,
                         'text-text-secondary': !item.active
                       }"
                       [class.opacity-0]="state.collapsed"
                       [class.w-0]="state.collapsed"
                       [class.hidden]="state.collapsed">
                   {{ item.label }}
                 </span>
              </a>

              <button
                *ngIf="item.children?.length && !state.collapsed"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-brand-primary hover:bg-brand-primary/10 transition-all"
                [attr.aria-label]="'Basculer le sous-menu ' + item.label"
                (click)="toggleInlineSubmenu(item, $event)">
                <lucide-icon [name]="item.expanded ? 'chevron-down' : 'chevron-right'" [size]="16" [strokeWidth]="2.5"></lucide-icon>
              </button>
            </div>

            <!-- Expanded Sidebar: Inline Submenu -->
            <div *ngIf="item.children?.length && !state.collapsed"
                 class="ml-6 pl-3 border-l border-gray-200 dark:border-white/10 overflow-hidden transition-all duration-250 ease-out"
                 [ngClass]="item.expanded ? 'max-h-72 opacity-100 mt-1 py-1' : 'max-h-0 opacity-0 mt-0 py-0 pointer-events-none'">
              <a *ngFor="let child of item.children; trackBy: trackByPath"
                 [routerLink]="child.path"
                 class="group flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-[14px] font-semibold transition-all duration-200"
                 [ngClass]="{
                   'bg-brand-primary/10 dark:bg-brand-primary/25 text-brand-primary shadow-[inset_0_0_0_1px_rgba(1,181,116,0.2)]': child.active,
                   'text-text-secondary dark:text-[#c9d3f8] hover:text-text-primary dark:hover:text-white hover:bg-page/80 dark:hover:bg-white/10': !child.active
                 }"
                 (click)="handleChildNavClick()">
                <span class="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      [ngClass]="child.active ? 'bg-brand-primary/15 text-brand-primary' : 'bg-page dark:bg-[#1b2a5b]/90 text-text-secondary dark:text-[#c9d3f8] group-hover:text-text-primary dark:group-hover:text-white group-hover:bg-brand-primary/10 dark:group-hover:bg-brand-primary/20'">
                  <lucide-icon [name]="child.icon" [size]="15" [strokeWidth]="2.4"></lucide-icon>
                </span>
                <span class="truncate">{{ child.label }}</span>
                <span class="ml-auto opacity-0 translate-x-[-2px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                      [ngClass]="child.active ? 'text-brand-primary opacity-100 translate-x-0' : 'text-text-secondary dark:text-[#9fb1eb]'">
                  <lucide-icon name="chevron-right" [size]="14" [strokeWidth]="2.5"></lucide-icon>
                </span>
              </a>
            </div>

            <!-- Collapsed Sidebar: Floating Dropdown -->
            <div *ngIf="item.children?.length && state.collapsed && isFloatingSubmenuOpen(item)"
                 role="menu"
                 class="absolute left-[calc(100%+14px)] top-0 w-[252px] rounded-2xl border border-gray-200/90 dark:border-[#2a3d7a] bg-white/97 dark:bg-[#0f1a42]/98 backdrop-blur-xl shadow-[0_20px_46px_rgba(17,28,68,0.24)] dark:shadow-[0_20px_46px_rgba(0,0,0,0.55)] p-2.5 z-[520]">
              <div class="px-2.5 pt-1.5 pb-2.5 flex items-center gap-2.5 border-b border-gray-200/80 dark:border-[#2a3d7a]">
                <span class="w-7 h-7 rounded-lg flex items-center justify-center bg-brand-primary/12 text-brand-primary">
                  <lucide-icon name="database" [size]="15" [strokeWidth]="2.5"></lucide-icon>
                </span>
                <div class="min-w-0">
                  <p class="text-[12px] font-extrabold tracking-[0.12em] uppercase text-text-secondary dark:text-[#b6c6f6] leading-none">
                    {{ item.label }}
                  </p>
                  <p class="text-[11px] text-text-secondary/80 dark:text-[#8fa3da] mt-1 leading-none">Navigation rapide</p>
                </div>
              </div>

              <a *ngFor="let child of item.children; trackBy: trackByPath"
                 [routerLink]="child.path"
                 class="group mt-1 first:mt-2 flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[14px] font-semibold transition-all duration-200"
                 [ngClass]="{
                   'bg-brand-primary/10 dark:bg-brand-primary/25 text-brand-primary shadow-[inset_0_0_0_1px_rgba(1,181,116,0.24)]': child.active,
                   'text-text-secondary dark:text-[#c9d3f8] hover:text-text-primary dark:hover:text-white hover:bg-page/80 dark:hover:bg-white/10': !child.active
                 }"
                 (click)="handleChildNavClick()">
                <span class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      [ngClass]="child.active ? 'bg-brand-primary/15 text-brand-primary' : 'bg-page dark:bg-[#1b2a5b]/90 text-text-secondary dark:text-[#c9d3f8] group-hover:text-text-primary dark:group-hover:text-white group-hover:bg-brand-primary/10 dark:group-hover:bg-brand-primary/20'">
                  <lucide-icon [name]="child.icon" [size]="15" [strokeWidth]="2.4"></lucide-icon>
                </span>
                <span class="truncate">{{ child.label }}</span>
                <span class="ml-auto opacity-0 translate-x-[-2px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                      [ngClass]="child.active ? 'text-brand-primary opacity-100 translate-x-0' : 'text-text-secondary dark:text-[#9fb1eb]'">
                  <lucide-icon name="chevron-right" [size]="14" [strokeWidth]="2.5"></lucide-icon>
                </span>
              </a>
            </div>
          </li>
        </ul>
      </nav>

      <!-- Footer User Card & Logout -->
      <div class="pb-6 mt-auto flex flex-col transition-all duration-250 w-full"
           [ngClass]="state.collapsed ? 'px-3 items-center gap-4' : 'px-4 gap-3'">
        
        <!-- Profile Banner / Icon -->
        <div class="flex items-center gap-3 rounded-2xl transition-all"
             [ngClass]="state.collapsed ? 'p-0 bg-transparent justify-center' : 'p-2 bg-page w-full'">
          <div class="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shrink-0 text-white font-bold tracking-wider text-sm shadow-sm transition-shadow">
            AP
          </div>
          <div class="flex-1 min-w-0 overflow-hidden" *ngIf="!state.collapsed">
            <p class="text-[14px] font-bold text-text-primary truncate leading-tight">Adela Parkson</p>
            <p class="text-[12px] text-text-secondary font-medium truncate mt-0.5">Designer produit</p>
          </div>
        </div>

        <!-- Logout Button -->
        <button class="flex items-center rounded-xl text-red-500 hover:opacity-80 transition-all cursor-pointer shrink-0"
                [ngClass]="state.collapsed ? 'w-10 h-10 justify-center' : 'w-full p-2.5 gap-3 justify-start px-4'">
          <lucide-icon name="log-out" [size]="20" [strokeWidth]="2.5" class="shrink-0"></lucide-icon>
          <span class="text-[15px] font-bold whitespace-nowrap transition-all duration-200" *ngIf="!state.collapsed">
            Deconnexion
          </span>
        </button>

      </div>
    </aside>
  `,
})
export class SidebarComponent {
  layoutService = inject(LayoutService);
  router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private host = inject(ElementRef<HTMLElement>);
  private floatingSubmenuLabel: string | null = null;

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'home', active: false, path: '/' },
    { label: 'ETL Pipeline', icon: 'server', active: false, path: '/etl-pipeline' },
    {
      label: 'Datamart',
      icon: 'database',
      active: false,
      path: '/datamart',
      expanded: false,
      children: [
        { label: 'Clients', icon: 'users', path: '/datamart/client', active: false },
        { label: 'Contrats', icon: 'file-text', path: '/datamart/contrat', active: false },
        { label: 'Balance', icon: 'dollar-sign', path: '/datamart/balance', active: false },
      ],
    },
    {
      label: 'Mapping',
      icon: 'settings',
      active: false,
      path: '/mapping',
      expanded: false,
      children: [
        { label: 'Configuration mapping', icon: 'database', path: '/mapping/configurations', active: false },
        { label: 'Ajouter configuration', icon: 'plus', path: '/mapping/nouvelle-configuration', active: false },
      ],
    },
    { label: 'Parametres', icon: 'calculator', active: false, path: '/parameters' },
  ];

  constructor() {
    this.updateActiveState(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateActiveState(event.urlAfterRedirects));
  }

  handleNavClick(): void {
    this.floatingSubmenuLabel = null;
    this.layoutService.closeMobileMenu();
  }

  handleChildNavClick(): void {
    this.floatingSubmenuLabel = null;
    this.layoutService.closeMobileMenu();
  }

  onNavItemClick(item: NavItem, isCollapsed: boolean, event: Event): void {
    if (item.children?.length) {
      if (isCollapsed) {
        event.preventDefault();
        this.floatingSubmenuLabel = this.floatingSubmenuLabel === item.label ? null : item.label;
        this.cdr.markForCheck();
        return;
      }

      item.expanded = true;
      this.cdr.markForCheck();
    }

    this.handleNavClick();
  }

  toggleInlineSubmenu(item: NavItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    item.expanded = !item.expanded;
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.floatingSubmenuLabel) {
      return;
    }

    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.floatingSubmenuLabel = null;
      this.cdr.markForCheck();
    }
  }

  isFloatingSubmenuOpen(item: NavItem): boolean {
    return this.floatingSubmenuLabel === item.label;
  }

  private updateActiveState(url: string): void {
    const normalizedUrl = this.normalizeUrl(url);

    this.navItems.forEach((item) => {
      const itemPath = this.normalizeUrl(item.path);
      item.active = normalizedUrl === itemPath || (itemPath !== '/' && normalizedUrl.startsWith(`${itemPath}/`));

      if (item.children?.length) {
        item.children.forEach((child) => {
          const childPath = this.normalizeUrl(child.path);
          child.active = normalizedUrl === childPath || normalizedUrl.startsWith(`${childPath}/`);
        });

        if (item.children.some((child) => child.active)) {
          item.expanded = true;
          item.active = true;
        }
      }
    });

    if (!this.navItems.some((item) => item.children?.some((child) => child.active))) {
      this.floatingSubmenuLabel = null;
    }

    this.cdr.markForCheck();
  }

  private normalizeUrl(url: string): string {
    const [pathname] = url.split('?');
    const normalizedPath = pathname.replace(/\/+$/, '');

    return normalizedPath === '' ? '/' : normalizedPath;
  }

  trackByLabel(_: number, item: NavItem): string {
    return item.label;
  }

  trackByPath(_: number, item: NavSubItem): string {
    return item.path;
  }
}