import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, inject, OnDestroy } from '@angular/core';
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
      class="w-full h-full flex flex-col bg-[#fcfcfd] dark:bg-[#0B1120] border-r border-black/5 dark:border-white/5 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] relative z-40 rounded-tr-[24px] rounded-br-[24px] shadow-[4px_0_24px_rgba(226,232,240,0.8)] dark:shadow-[4px_0_24px_rgba(2,6,23,0.9)]"
    >
      <!-- Logo & Toggle (Header Panel) -->
      <div class="h-[var(--topbar-h)] flex items-center shrink-0 px-6 group relative transition-all duration-300 border-b border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] rounded-tr-[24px]"
           [ngClass]="state.collapsed ? 'justify-center px-0' : 'justify-between'">
        
        <!-- Logo Text -->
        <div class="flex items-center gap-2.5 transition-all duration-300"
             [class.opacity-0]="state.collapsed"
             [class.w-0]="state.collapsed"
             [class.overflow-hidden]="state.collapsed">
          <div class="w-7 h-7 rounded-[8px] bg-brand-primary shadow-[0_2px_10px_rgba(1,181,116,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[0_2px_10px_rgba(1,181,116,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center text-white shrink-0">
            <lucide-icon name="layout-dashboard" [size]="16" [strokeWidth]="3"></lucide-icon>
          </div>
          <h1 class="text-[16px] font-black tracking-[0.02em] text-[#0f172a] dark:text-white whitespace-nowrap leading-none flex items-center gap-2">
            DASHBOARD
            <span class="text-[9px] font-bold text-brand-primary bg-brand-primary/10 dark:bg-brand-primary/20 px-1.5 py-0.5 rounded-[4px] uppercase tracking-widest leading-none">PRO</span>
          </h1>
        </div>
        
        <!-- Mobile Close Button -->
        <button
          class="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all shrink-0 lg:hidden"
          (click)="layoutService.closeMobileMenu()"
          aria-label="Fermer le menu"
        >
          <lucide-icon name="x" [size]="20" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Desktop Toggle Anchor -->
        <button 
          class="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300 shrink-0 absolute hidden lg:flex"
          [class.right-4]="!state.collapsed"
          [class.relative]="state.collapsed"
          (click)="layoutService.toggleSidebar()"
          aria-label="Basculer la barre laterale"
        >
          <lucide-icon [name]="state.collapsed ? 'menu' : 'chevron-left'" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>
      </div>

      <!-- Nav Items -->
      <!-- overflow-y-auto is applied only when expanded: floating cards appear only when
           collapsed and collapsed icons are few enough to never need scrolling. -->
      <nav class="flex-1 min-h-0 py-5 px-3
                  [&::-webkit-scrollbar]:w-[3px]
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-brand-primary/20
                  [&::-webkit-scrollbar-thumb]:rounded-full"
           [class.overflow-y-auto]="!state.collapsed"
           role="navigation">
        <ul class="flex flex-col gap-[2px]">
            <li *ngFor="let item of navItems; trackBy: trackByLabel"
                class="relative group/navitem"
                (mouseenter)="onNavItemHover(item, !!state.collapsed)"
                (mouseleave)="onNavItemLeave()">

              <!-- Gap bridge: covers the 14px between sidebar edge and floating card -->
              <div *ngIf="state.collapsed && isFloatingSubmenuOpen(item)"
                   class="absolute top-0 bottom-0 w-[14px] z-[519]"
                   [style.left]="'100%'"></div>

            <div class="relative">
              <a [routerLink]="item.path"
                 class="flex items-center rounded-[12px] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden p-2.5 relative group/link"
                 [ngClass]="{
                   'bg-white dark:bg-[#1e293b]/40 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.04),inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]': item.active && !state.collapsed,
                   'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]': !item.active || state.collapsed,
                   'justify-center p-3': state.collapsed,
                   'pr-10': item.children?.length && !state.collapsed,
                   'bg-black/[0.04] dark:bg-white/[0.06]': state.collapsed && isFloatingSubmenuOpen(item)
                 }"
                 [attr.aria-expanded]="item.children?.length && !state.collapsed ? item.expanded : null"
                 [attr.aria-haspopup]="item.children?.length ? 'menu' : null"
                 (click)="onNavItemClick(item, !!state.collapsed, $event)">

                 <!-- Active Indicator Pill for Expanded State -->
                 <div *ngIf="item.active && !state.collapsed"
                      class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(1,181,116,0.6)]"></div>

                 <!-- Active Indicator Pill for Collapsed State -->
                 <div *ngIf="item.active && state.collapsed"
                      class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[20px] bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(1,181,116,0.6)]"></div>

                 <lucide-icon [name]="item.icon" [size]="20" [strokeWidth]="item.active ? 2.5 : 2"
                              class="shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                              [ngClass]="{
                                'text-brand-primary scale-105': item.active,
                                'text-[#64748b] dark:text-[#94a3b8] group-hover/link:text-[#0f172a] dark:group-hover/link:text-white group-hover/link:scale-105': !item.active,
                                'text-[#0f172a] dark:text-white scale-105': !item.active && state.collapsed && isFloatingSubmenuOpen(item)
                              }">
                 </lucide-icon>

                 <span class="text-[14px] whitespace-nowrap ml-3.5 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                       [ngClass]="{
                         'font-bold text-[#0f172a] dark:text-white': item.active,
                         'font-medium text-[#475569] dark:text-[#cbd5e1] group-hover/link:text-[#0f172a] dark:group-hover/link:text-white': !item.active
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
                class="absolute right-2 top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-[8px] flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                [ngClass]="{
                  'text-[#0f172a] dark:text-white hover:bg-black/5 dark:hover:bg-white/10': item.active,
                  'text-[#94a3b8] dark:text-[#64748b] hover:text-[#0f172a] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10': !item.active
                }"
                [attr.aria-label]="'Basculer le sous-menu ' + item.label"
                (click)="toggleInlineSubmenu(item, $event)">
                <lucide-icon name="chevron-right" [size]="16" [strokeWidth]="2.5" class="transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]" [class.rotate-90]="item.expanded"></lucide-icon>
              </button>
            </div>

            <!-- Expanded Sidebar: Inline Submenu -->
            <div *ngIf="item.children?.length && !state.collapsed"
                 class="grid transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                 [ngClass]="item.expanded ? 'grid-rows-[1fr] opacity-100 mt-1 mb-2' : 'grid-rows-[0fr] opacity-0 mt-0 mb-0 pointer-events-none'">
              <div class="overflow-hidden">
                <div class="ml-[22px] pl-[14px] border-l border-black/5 dark:border-white/5 flex flex-col gap-0.5">
                  <a *ngFor="let child of item.children; trackBy: trackByPath"
                     [routerLink]="child.path"
                     class="group/child flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                     [ngClass]="{
                       'font-bold text-brand-primary bg-brand-primary/[0.08] dark:bg-brand-primary/[0.15]': child.active,
                       'font-medium text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10': !child.active
                     }"
                     (click)="handleChildNavClick()">
                    <!-- Child Icon Badge -->
                    <span class="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center transition-all duration-300"
                          [ngClass]="child.active ? 'bg-brand-primary/20 text-brand-primary shadow-[0_0_10px_rgba(1,181,116,0.2)]' : 'bg-transparent text-current group-hover/child:scale-110'">
                      <lucide-icon [name]="child.icon" [size]="12" [strokeWidth]="child.active ? 3 : 2.5"></lucide-icon>
                    </span>
                    <span class="truncate">{{ child.label }}</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- Collapsed Sidebar: Floating Dropdown (Children) -->
            <div *ngIf="item.children?.length && state.collapsed && isFloatingSubmenuOpen(item)"
                 role="menu"
                 class="absolute left-[calc(100%+14px)] top-0 w-[240px] rounded-[16px] border border-white/40 dark:border-white/5 bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-2xl shadow-[0_12px_36px_-6px_rgba(17,28,68,0.12),0_0_0_1px_rgba(255,255,255,0.6)_inset] dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)_inset] p-2.5 z-[520] opacity-100 transition-opacity">

              <!-- Small caret pointing left -->
              <div class="absolute -left-[5px] top-[18px] w-[10px] h-[10px] border-l border-b border-white/40 dark:border-white/5 bg-white/90 dark:bg-[#0f172a] rotate-45 shadow-[-2px_2px_4px_rgba(0,0,0,0.02)] pointer-events-none"></div>

              <div class="px-3 pt-2 pb-3 mb-1 flex items-center gap-3 border-b border-black/5 dark:border-white/5">
                <span class="w-8 h-8 rounded-[10px] flex items-center justify-center bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary shadow-[inset_0_0_0_1px_rgba(1,181,116,0.1)]">
                  <lucide-icon [name]="item.icon" [size]="16" [strokeWidth]="2.5"></lucide-icon>
                </span>
                <div class="min-w-0">
                  <p class="text-[13px] font-bold text-[#0f172a] dark:text-[#f1f5f9] leading-tight">
                    {{ item.label }}
                  </p>
                  <p class="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8] mt-0.5 leading-none">Navigation rapide</p>
                </div>
              </div>

              <a *ngFor="let child of item.children; trackBy: trackByPath"
                 [routerLink]="child.path"
                 class="group mt-0.5 flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                 [ngClass]="{
                   'bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary shadow-[inset_0_0_0_1px_rgba(1,181,116,0.15)]': child.active,
                   'text-[#64748b] dark:text-[#cbd5e1] hover:text-[#0f172a] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5': !child.active
                 }"
                 (click)="handleChildNavClick()">
                <span class="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center transition-all duration-300"
                      [ngClass]="child.active ? 'bg-brand-primary/15 text-brand-primary shadow-[inset_0_0_0_1px_rgba(1,181,116,0.2)]' : 'bg-black/5 dark:bg-white/5 text-[#94a3b8] dark:text-[#64748b] group-hover:bg-brand-primary/10 group-hover:text-brand-primary'">
                  <lucide-icon [name]="child.icon" [size]="12" [strokeWidth]="child.active ? 3 : 2.5"></lucide-icon>
                </span>
                <span class="truncate">{{ child.label }}</span>
                <span class="ml-auto opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                      [ngClass]="child.active ? 'text-brand-primary opacity-100 translate-x-0' : 'text-brand-primary/60'">
                  <lucide-icon name="chevron-right" [size]="14" [strokeWidth]="2.5"></lucide-icon>
                </span>
              </a>
            </div>

            <!-- Collapsed Sidebar: Tooltip (No Children) -->
            <div *ngIf="!item.children?.length && state.collapsed && isFloatingSubmenuOpen(item)"
                 class="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 rounded-[16px] border border-white/40 dark:border-white/5 bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-2xl shadow-[0_12px_36px_-6px_rgba(17,28,68,0.12),0_0_0_1px_rgba(255,255,255,0.6)_inset] dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)_inset] p-3 z-[520] flex flex-col items-center justify-center min-w-[110px] opacity-100 transition-opacity">

              <!-- Small caret pointing left -->
              <div class="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] border-l border-b border-white/40 dark:border-white/5 bg-white/90 dark:bg-[#0f172a] rotate-45 shadow-[-2px_2px_4px_rgba(0,0,0,0.02)] pointer-events-none"></div>
              
              <span class="w-8 h-8 rounded-[10px] flex items-center justify-center bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary mb-2 shadow-[inset_0_0_0_1px_rgba(1,181,116,0.1)]">
                <lucide-icon [name]="item.icon" [size]="16" [strokeWidth]="2.5"></lucide-icon>
              </span>
              <span class="text-[13px] font-bold text-[#0f172a] dark:text-[#f1f5f9] whitespace-nowrap">{{ item.label }}</span>
            </div>

          </li>
        </ul>
      </nav>

      <!-- Footer Panel -->
      <div class="pt-4 pb-5 mt-auto flex flex-col transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] w-full border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.01] rounded-br-[24px]"
           [ngClass]="state.collapsed ? 'px-3 items-center gap-4' : 'px-4 gap-4'">
        
        <!-- Profile Banner / Icon -->
        <div class="flex items-center gap-3 transition-all duration-300 group/profile cursor-pointer"
             [ngClass]="state.collapsed ? 'p-0 bg-transparent justify-center' : 'p-2.5 bg-white dark:bg-[#1e293b]/50 hover:bg-white/80 dark:hover:bg-[#1e293b]/80 rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.04),inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] w-full'">
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 text-white font-bold tracking-wider text-[13px] shadow-sm transition-all duration-300 group-hover/profile:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]">
              AP
            </div>
            <!-- Online dot -->
            <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#fcfcfd] dark:border-[#1e293b] transition-all duration-300"></div>
          </div>
          <div class="flex-1 min-w-0 overflow-hidden" *ngIf="!state.collapsed">
            <p class="text-[14px] font-bold text-[#0f172a] dark:text-white truncate leading-tight">Adela Parkson</p>
            <p class="text-[12px] text-[#64748b] dark:text-[#94a3b8] font-medium truncate mt-0.5">Designer produit</p>
          </div>
          
          <!-- Hover Settings Icon -->
          <div class="ml-auto opacity-0 group-hover/profile:opacity-100 transition-opacity duration-300 text-[#94a3b8] dark:text-[#64748b]" *ngIf="!state.collapsed">
            <lucide-icon name="settings" [size]="16" [strokeWidth]="2.5"></lucide-icon>
          </div>
        </div>

        <!-- Logout Button -->
        <button class="flex items-center rounded-[12px] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer shrink-0 group/logout"
                [ngClass]="{
                  'w-10 h-10 justify-center text-[#94a3b8] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 mt-1': state.collapsed,
                  'w-full p-2.5 gap-3 justify-start px-4 text-[#64748b] dark:text-[#94a3b8] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 mt-1': !state.collapsed
                }">
          <lucide-icon name="log-out" [size]="18" [strokeWidth]="2.5" class="shrink-0 transition-transform duration-300 group-hover/logout:-translate-x-0.5"></lucide-icon>
          <span class="text-[14px] font-semibold whitespace-nowrap transition-all duration-300" *ngIf="!state.collapsed">
            Deconnexion
          </span>
        </button>

      </div>
    </aside>
  `,
})
export class SidebarComponent implements OnDestroy {
  layoutService = inject(LayoutService);
  router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private floatingSubmenuLabel: string | null = null;

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'layout-dashboard', active: false, path: '/' },
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
    {
      label: 'Parametres', icon: 'calculator', active: false, path: '/parameters',
      expanded: false,
      children: [
        { label: 'Liste des parametres', icon: 'list', path: '/parameters', active: false },
        { label: 'Nouveau parametre', icon: 'plus', path: '/parameters/nouveau', active: false },
      ],
    },
    {
      label: 'Ratios', icon: 'percent', active: false, path: '/ratios',
      expanded: false,
      children: [
        { label: 'Liste des ratios', icon: 'list', path: '/ratios', active: false },

        { label: 'Nouveau ratio', icon: 'plus', path: '/ratios/nouveau', active: false },
      ],
    },
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


  onNavItemHover(item: NavItem, isCollapsed: boolean): void {
    if (isCollapsed) {
      this.floatingSubmenuLabel = item.label;
      this.cdr.markForCheck();
    }
  }

  onNavItemLeave(): void {
    this.floatingSubmenuLabel = null;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    // No timers to clean up
  }

  onNavItemClick(item: NavItem, isCollapsed: boolean, event: Event): void {
    if (item.children?.length) {
      if (isCollapsed) {
        event.preventDefault();
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

  isFloatingSubmenuOpen(item: NavItem): boolean {
    return this.floatingSubmenuLabel === item.label;
  }

  private updateActiveState(url: string): void {
    const normalizedUrl = this.normalizeUrl(url);

    this.navItems.forEach((item) => {
      const itemPath = this.normalizeUrl(item.path);
      item.active = normalizedUrl === itemPath || (itemPath !== '/' && normalizedUrl.startsWith(`${itemPath}/`));

      if (item.children?.length) {
        let anyChildActive = false;

        item.children.forEach((child) => {
          const childPath = this.normalizeUrl(child.path);
          child.active = normalizedUrl === childPath;
        });

        // If no exact child match, try startsWith for deeper paths
        if (!item.children.some((c) => c.active)) {
          item.children.forEach((child) => {
            const childPath = this.normalizeUrl(child.path);
            if (childPath !== '/' && childPath !== itemPath && normalizedUrl.startsWith(`${childPath}/`)) {
              child.active = true;
            }
          });
        }

        anyChildActive = item.children.some((child) => child.active);

        if (anyChildActive) {
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