import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private sidebarCollapsed = new BehaviorSubject<boolean>(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );
  isSidebarCollapsed$ = this.sidebarCollapsed.asObservable();

  private mobileMenuOpen = new BehaviorSubject<boolean>(false);
  isMobileMenuOpen$ = this.mobileMenuOpen.asObservable();

  toggleSidebar(): void {
    const newState = !this.sidebarCollapsed.value;
    localStorage.setItem('sidebarCollapsed', String(newState));
    this.sidebarCollapsed.next(newState);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    localStorage.setItem('sidebarCollapsed', String(collapsed));
    this.sidebarCollapsed.next(collapsed);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.next(!this.mobileMenuOpen.value);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.next(false);
  }
}
