import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
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

        <!-- Search -->
        <div class="topbar-search hidden lg:flex">
          <lucide-icon name="search" [size]="16" [strokeWidth]="2.5"></lucide-icon>
          <input
            type="text"
            placeholder="Rechercher..."
            aria-label="Rechercher dans le tableau de bord"
          />
        </div>

        <!-- Mobile Search Icon -->
        <button class="topbar-icon lg:hidden" aria-label="Rechercher">
          <lucide-icon name="search" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Bell -->
          <button class="topbar-icon" aria-label="Notifications">
           <lucide-icon name="bell" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Info -->
         <button class="topbar-icon hidden sm:flex" aria-label="Informations">
          <lucide-icon name="info" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Theme Toggle -->
        <button
          class="topbar-icon"
          (click)="toggleTheme()"
          aria-label="Changer le theme"
        >
          <lucide-icon *ngIf="themeService.isDark$ | async" name="sun" [size]="18" [strokeWidth]="2.5"></lucide-icon>
          <lucide-icon *ngIf="!(themeService.isDark$ | async)" name="moon" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Avatar -->
        <div class="topbar-avatar">
          AP
        </div>

        <!-- Mobile Hamburger Menu (beside other icons) -->
        <button class="topbar-icon lg:hidden" 
                (click)="layoutService.toggleMobileMenu()" 
          aria-label="Ouvrir le menu">
          <lucide-icon name="menu" [size]="22" [strokeWidth]="2.5"></lucide-icon>
        </button>
      </div>
      
    </header>
  `,
})
export class TopbarComponent {
  themeService = inject(ThemeService);
  layoutService = inject(LayoutService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentPageName = 'Tableau de bord principal';

  constructor() {
    this.currentPageName = this.getPageNameFromUrl(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentPageName = this.getPageNameFromUrl(event.urlAfterRedirects);
        this.cdr.markForCheck();
      });
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  private getPageNameFromUrl(url: string): string {
    const [pathname] = url.split('?');
    const normalizedPath = pathname.replace(/\/+$/, '') || '/';

    if (normalizedPath === '/') return 'Tableau de bord principal';
    if (normalizedPath === '/etl-pipeline') return 'Pipeline ETL';
    if (normalizedPath === '/datamart') return 'Datamart';
    if (normalizedPath === '/datamart/client') return 'Donnees clients';
    if (normalizedPath === '/datamart/contrat') return 'Donnees contrats';

    return normalizedPath
      .split('/')
      .filter(Boolean)
      .map((segment) => segment.replace(/-/g, ' '))
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' / ');
  }
}
