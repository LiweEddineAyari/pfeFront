import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-mini-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-3 p-3 rounded-2xl dark:bg-dark-card bg-gray-50" role="listitem">
      <div class="text-lg">{{ icon }}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold dark:text-white text-gray-800 truncate">{{ title }}</p>
        <p class="text-xs dark:text-gray-400 text-gray-500">{{ subtitle }}</p>
      </div>
      <p class="text-sm font-bold" [class]="amountClass">{{ formattedAmount }}</p>
    </div>
  `,
})
export class MiniCardComponent {
  @Input() icon = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() amount = 0;

  get amountClass(): string {
    return this.amount < 0 ? 'text-red-500' : 'text-green-500';
  }

  get formattedAmount(): string {
    const prefix = this.amount < 0 ? '-$' : '+$';
    return `${prefix}${Math.abs(this.amount).toFixed(2)}`;
  }
}
