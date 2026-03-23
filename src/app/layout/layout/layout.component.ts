import { Component, ChangeDetectionStrategy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { LayoutService } from '../../core/services/layout.service';
import { combineLatest, map, Observable } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- app-shell -->
    <div class="min-h-screen w-full flex bg-page">

      <!-- Mobile Backdrop -->
      <div *ngIf="layoutService.isMobileMenuOpen$ | async"
           class="sidebar-backdrop lg:hidden"
           (click)="layoutService.closeMobileMenu()"></div>

      <!-- COL 1: Sidebar -->
      <aside class="sidebar-aside"
             [class.sidebar-open]="(layoutService.isMobileMenuOpen$ | async)"
             [class.sidebar-expanded]="!(layoutService.isSidebarCollapsed$ | async)"
             [class.sidebar-collapsed]="(layoutService.isSidebarCollapsed$ | async)">
        <app-sidebar class="flex-1 w-full h-full flex flex-col"></app-sidebar>
      </aside>

      <!-- COL 2: Main content -->
      <main class="main-content transition-all duration-300 ease-out relative"
            [class.main-sidebar-expanded]="!(layoutService.isSidebarCollapsed$ | async)"
            [class.main-sidebar-collapsed]="(layoutService.isSidebarCollapsed$ | async)">
        
        <div class="sticky top-4 z-[100] mx-3 sm:mx-[20px] mb-6 flex">
           <app-topbar class="w-full flex-1"></app-topbar>
        </div>
        
        <!-- Inner pad area -->
        <div class="w-full px-3 sm:px-[20px] pb-6">
          <router-outlet />
        </div>
      </main>

    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
  `],
})
export class LayoutComponent {
  layoutService = inject(LayoutService);
}
