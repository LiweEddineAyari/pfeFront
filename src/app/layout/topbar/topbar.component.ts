import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
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
          Pages / <span>Main Dashboard</span>
        </p>
        <h1 class="topbar-title">Main Dashboard</h1>
      </div>

      <!-- Right: Search + Icons + Theme Toggle + Avatar -->
      <div class="topbar-right">

        <!-- Search -->
        <div class="topbar-search hidden lg:flex">
          <lucide-icon name="search" [size]="16" [strokeWidth]="2.5"></lucide-icon>
          <input
            type="text"
            placeholder="Search..."
            aria-label="Search dashboard"
          />
        </div>

        <!-- Mobile Search Icon -->
        <button class="topbar-icon lg:hidden" aria-label="Search">
          <lucide-icon name="search" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Bell -->
        <button class="topbar-icon" aria-label="Notifications">
           <lucide-icon name="bell" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Info -->
         <button class="topbar-icon hidden sm:flex" aria-label="Information">
          <lucide-icon name="info" [size]="18" [strokeWidth]="2.5"></lucide-icon>
        </button>

        <!-- Theme Toggle -->
        <button
          class="topbar-icon"
          (click)="toggleTheme()"
          aria-label="Toggle theme"
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
                aria-label="Open menu">
          <lucide-icon name="menu" [size]="22" [strokeWidth]="2.5"></lucide-icon>
        </button>
      </div>
      
    </header>
  `,
})
export class TopbarComponent {
  themeService = inject(ThemeService);
  layoutService = inject(LayoutService);

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
