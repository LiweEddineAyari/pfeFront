import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
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
          HORIZON <span class="font-normal">PRO</span>
        </h1>
        
        <!-- Mobile Close Button -->
        <button
          class="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary transition-all shrink-0 lg:hidden"
          (click)="layoutService.closeMobileMenu()"
          aria-label="Close menu"
        >
          <lucide-icon name="x" [size]="22" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Desktop Toggle Anchor -->
        <button 
          class="w-8 h-8 rounded-lg items-center justify-center text-brand-primary hover:opacity-80 transition-all shrink-0 absolute right-4 hidden lg:flex"
          [class.relative]="state.collapsed"
          [class.right-auto]="state.collapsed"
          (click)="layoutService.toggleSidebar()"
          aria-label="Toggle sidebar"
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
          <li *ngFor="let item of navItems; trackBy: trackByLabel">
            
            <a [routerLink]="item.path"
               class="flex items-center rounded-xl transition-all duration-200 cursor-pointer overflow-hidden p-3 relative"
               [ngClass]="{
                 'text-text-primary bg-page': item.active && !state.collapsed,
                 'text-text-secondary hover:bg-page': !item.active || state.collapsed,
                 'justify-center': state.collapsed
               }"
               (click)="handleNavClick()">
               
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
            <p class="text-[12px] text-text-secondary font-medium truncate mt-0.5">Product Designer</p>
          </div>
        </div>

        <!-- Logout Button -->
        <button class="flex items-center rounded-xl text-red-500 hover:opacity-80 transition-all cursor-pointer shrink-0"
                [ngClass]="state.collapsed ? 'w-10 h-10 justify-center' : 'w-full p-2.5 gap-3 justify-start px-4'">
          <lucide-icon name="log-out" [size]="20" [strokeWidth]="2.5" class="shrink-0"></lucide-icon>
          <span class="text-[15px] font-bold whitespace-nowrap transition-all duration-200" *ngIf="!state.collapsed">
            Logout
          </span>
        </button>

      </div>
    </aside>
  `,
})
export class SidebarComponent {
  layoutService = inject(LayoutService);
  router = inject(Router);

  navItems: NavItem[] = [
    { label: 'Dashboards', icon: 'home', active: false, path: '/' },
    { label: 'ETL Pipeline', icon: 'server', active: false, path: '/etl-pipeline' },
    { label: 'Datamart', icon: 'database', active: false, path: '/datamart' },
  ];

  constructor() {
    this.updateActiveState(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateActiveState(event.urlAfterRedirects));
  }

  handleNavClick(): void {
    this.layoutService.closeMobileMenu();
  }

  private updateActiveState(url: string): void {
    const normalizedUrl = this.normalizeUrl(url);

    this.navItems.forEach((item) => {
      item.active = normalizedUrl === this.normalizeUrl(item.path);
    });
  }

  private normalizeUrl(url: string): string {
    const [pathname] = url.split('?');
    const normalizedPath = pathname.replace(/\/+$/, '');

    return normalizedPath === '' ? '/' : normalizedPath;
  }

  trackByLabel(_: number, item: NavItem): string {
    return item.label;
  }
}