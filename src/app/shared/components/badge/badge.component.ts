import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
      [ngClass]="{
        'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 badge-pulse': type === 'positive',
        'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400': type === 'negative',
        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': type === 'neutral'
      }"
    >
      <lucide-icon *ngIf="type === 'positive'" name="trending-up" [size]="12" [strokeWidth]="2.5"></lucide-icon>
      <svg *ngIf="type === 'negative'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/>
      </svg>
      {{ value }}
    </span>
  `,
  styles: [`
    @keyframes badgePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(5,205,153,0.4); }
      50% { box-shadow: 0 0 0 6px rgba(5,205,153,0); }
    }
    .badge-pulse {
      animation: badgePulse 3s ease-in-out infinite;
    }
  `],
})
export class BadgeComponent {
  @Input() value = '';
  @Input() type: 'positive' | 'negative' | 'neutral' = 'neutral';
}
