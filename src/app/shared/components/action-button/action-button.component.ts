import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="flex flex-col items-center gap-3 group cursor-pointer"
      [attr.aria-label]="label"
    >
      <div
        class="w-[66px] h-[66px] rounded-full flex items-center justify-center
               dark:bg-dark-card bg-white shadow-[0_8px_24px_rgba(149,157,165,0.15)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)]
               transition-all duration-200
               group-hover:scale-110 
               group-hover:shadow-[0_12px_30px_rgba(149,157,165,0.25)] dark:group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)]
               group-active:scale-95"
      >
        <lucide-icon
          [name]="icon"
          [size]="24"
          [strokeWidth]="2.5"
          class="transition-transform duration-200"
          [ngClass]="getColorClass()"
        ></lucide-icon>
      </div>
      <span class="text-[14px] font-bold text-[#1b2559] dark:text-white transition-colors">
        {{ label }}
      </span>
    </button>
  `,
})
export class ActionButtonComponent {
  @Input() icon = 'circle';
  @Input() label = '';

  getColorClass(): string {
    switch (this.icon) {
      case 'refresh-cw': return 'text-brand-green';
      case 'plus': return 'text-[#ffb547]'; // orange/yellow
      case 'dollar-sign': return 'text-brand-green';
      case 'more-horizontal': return 'text-[#ff5b5b]'; // red
      default: return 'text-brand-green';
    }
  }
}
