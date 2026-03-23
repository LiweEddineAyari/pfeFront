import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-transaction-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-4 py-2.5 px-1 rounded-xl transition-all duration-150
             hover:bg-gray-50 dark:hover:bg-white/5 group cursor-default"
      role="listitem"
      [attr.aria-label]="title + ' transaction'"
    >
      <div
        class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border border-transparent group-hover:bg-white/50 dark:group-hover:bg-white/10"
        [ngClass]="iconBg"
      >
        <lucide-icon [name]="icon" [size]="20" [strokeWidth]="2" [ngClass]="iconColor"></lucide-icon>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[15px] font-bold dark:text-white text-[#1b2559] truncate">{{ title }}</p>
        <p class="text-[13px] text-gray-400 font-medium">{{ date }}</p>
      </div>
      <p
        class="text-[15px] font-bold dark:text-white text-[#1b2559] shrink-0"
      >
        {{ formattedAmount }}
      </p>
    </div>
  `,
})
export class TransactionItemComponent {
  @Input() icon = 'circle';
  @Input() iconBg = '';
  @Input() iconColor = '';
  @Input() title = '';
  @Input() date = '';
  @Input() amount = 0;

  get formattedAmount(): string {
    const prefix = this.amount < 0 ? '-$' : '+$';
    return `${prefix}${Math.abs(this.amount).toFixed(2)}`;
  }
}
