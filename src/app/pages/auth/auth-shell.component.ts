import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative min-h-screen w-full overflow-hidden bg-[#f4f7fe] dark:bg-[#070d1f] text-[#1b2559] dark:text-white">
      <div class="flex min-h-screen w-full flex-col lg:flex-row">

        <!-- LEFT: form column -->
        <div class="relative flex w-full flex-1 flex-col px-6 sm:px-10 lg:px-16 py-8">
          <div class="mx-auto w-full max-w-[440px] flex-1 flex flex-col">
            <div class="flex items-center gap-2.5 pb-10">
              <div class="w-9 h-9 rounded-[11px] bg-brand-primary shadow-[0_6px_18px_rgba(1,181,116,0.45)] flex items-center justify-center text-white">
                <lucide-icon name="layout-dashboard" [size]="18" [strokeWidth]="2.6"></lucide-icon>
              </div>
              <div class="leading-none">
                <p class="text-[15px] font-extrabold tracking-tight">Finance<span class="text-brand-primary">Dashboard</span></p>
                <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a3aed0] mt-1">Analytics Platform</p>
              </div>
            </div>

            <div class="flex-1 flex flex-col justify-center pb-12">
              <router-outlet />
            </div>

            <p class="text-[12px] text-[#a3aed0] pt-6">
              © {{ year }} Finance Dashboard. Tous droits réservés.
            </p>
          </div>
        </div>

        <!-- RIGHT: brand panel -->
        <div class="relative hidden lg:flex w-[42%] xl:w-[44%] items-center justify-center overflow-hidden
                    bg-gradient-to-br from-[#06d6a0] via-[#01b574] to-[#019267]
                    rounded-bl-[160px]">
          <!-- soft glow blobs -->
          <div class="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-white/15 blur-3xl"></div>
          <div class="absolute bottom-10 left-6 w-72 h-72 rounded-full bg-emerald-900/20 blur-3xl"></div>

          <div class="relative z-10 flex flex-col items-center text-white px-10 text-center">
            <div class="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <lucide-icon name="bar-chart-3" [size]="58" [strokeWidth]="2.4" class="text-brand-primary"></lucide-icon>
            </div>
            <h2 class="mt-8 text-[34px] font-black tracking-tight leading-none">Finance Dashboard</h2>
            <p class="mt-3 text-white/80 text-[15px] font-medium max-w-[320px] leading-relaxed">
              Pilotage, paramétrage et analyse de vos ratios financiers en un seul endroit.
            </p>

          </div>
        </div>
      </div>

      <!-- floating theme toggle -->
      <button
        type="button"
        (click)="theme.toggle()"
        class="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-brand-primary text-white shadow-[0_10px_30px_rgba(1,181,116,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Changer le thème"
      >
        <lucide-icon *ngIf="theme.isDark$ | async" name="sun" [size]="20" [strokeWidth]="2.5"></lucide-icon>
        <lucide-icon *ngIf="!(theme.isDark$ | async)" name="moon" [size]="20" [strokeWidth]="2.5"></lucide-icon>
      </button>
    </div>
  `,
})
export class AuthShellComponent {
  theme = inject(ThemeService);
  readonly year = new Date().getFullYear();
}
