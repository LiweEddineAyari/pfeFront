import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '../badge/badge.component';
import { cardHover } from '../../../core/animations';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [cardHover],
  template: `
    <div
      class="card-base dark:bg-dark-card bg-white dark:shadow-card-dark shadow-card-light cursor-default"
      style="contain: layout"
      [@cardHover]="hoverState"
      (mouseenter)="hoverState = 'hovered'"
      (mouseleave)="hoverState = 'default'"
      role="region"
      [attr.aria-label]="title + ' stat card'"
    >
      <div class="flex items-center justify-between mb-4">
        <div
          class="rounded-2xl w-12 h-12 flex items-center justify-center text-xl"
          [ngClass]="iconBgClass"
        >
          {{ icon }}
        </div>
        <app-badge [value]="changeLabel" [type]="change >= 0 ? 'positive' : 'negative'" />
      </div>
      <p class="text-3xl font-bold font-display dark:text-white text-gray-800 mb-1">{{ value }}</p>
      <p class="text-sm dark:text-gray-400 text-gray-500">{{ title }}</p>
    </div>
  `,
})
export class StatCardComponent {
  @Input() title = '';
  @Input() value = '';
  @Input() change = 0;
  @Input() icon = '';
  @Input() color = 'green';

  hoverState = 'default';

  get iconBgClass(): string {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
      blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
      purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
      orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
    };
    return colors[this.color] || colors['green'];
  }

  get changeLabel(): string {
    const sign = this.change >= 0 ? '+' : '';
    return `${sign}${this.change}%`;
  }
}
