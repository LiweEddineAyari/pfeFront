import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private isDarkSubject: BehaviorSubject<boolean>;
  isDark$: Observable<boolean>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Read theme SYNCHRONOUSLY in constructor
    const initial = this.readSavedTheme();
    this.isDarkSubject = new BehaviorSubject<boolean>(initial);
    this.isDark$ = this.isDarkSubject.asObservable();

    // Apply class to <html> immediately
    this.applyClass(initial);
  }

  get isDark(): boolean {
    return this.isDarkSubject.value;
  }

  toggle(): void {
    const next = !this.isDarkSubject.value;
    this.isDarkSubject.next(next);
    this.applyClass(next);
    this.saveTheme(next);
  }

  private readSavedTheme(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    // No saved preference -> check OS preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyClass(isDark: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private saveTheme(isDark: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
}

