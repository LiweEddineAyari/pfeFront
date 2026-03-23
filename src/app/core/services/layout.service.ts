import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private sidebarCollapsed = new BehaviorSubject<boolean>(false);
  isSidebarCollapsed$ = this.sidebarCollapsed.asObservable();

  private mobileMenuOpen = new BehaviorSubject<boolean>(false);
  isMobileMenuOpen$ = this.mobileMenuOpen.asObservable();

  toggleSidebar(): void {
    this.sidebarCollapsed.next(!this.sidebarCollapsed.value);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed.next(collapsed);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.next(!this.mobileMenuOpen.value);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.next(false);
  }
}
