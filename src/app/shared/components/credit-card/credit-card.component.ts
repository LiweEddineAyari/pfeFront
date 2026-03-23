import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-credit-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-[24px] p-6 text-white relative overflow-hidden cursor-pointer select-none
             shadow-[0_12px_24px_rgba(5,205,153,0.3)] transition-transform duration-500 flex flex-col justify-between"
      [ngClass]="gradient"
      [style.transform]="isFlipped ? 'perspective(1000px) rotateY(180deg)' : 'perspective(1000px) rotateY(0)'"
      (click)="isFlipped = !isFlipped"
      role="button"
      aria-label="Credit card, click to flip"
      style="min-height: 220px;"
    >
      <!-- Front -->
      <div class="relative z-10 flex flex-col h-full justify-between" [style.opacity]="isFlipped ? '0' : '1'">
        <!-- Top row: Glassy & Mastercard -->
        <div class="flex items-center justify-between mb-8">
          <span class="font-bold text-[24px] tracking-tight">Glassy.</span>
          <!-- Mastercard logo: two overlapping circles -->
          <div class="flex -space-x-3">
            <div class="w-10 h-10 rounded-full bg-white/40 mix-blend-screen"></div>
            <div class="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center">
              <!-- Some inner abstract detail if needed, but simple circles suffice -->
            </div>
          </div>
        </div>

        <div>
          <p class="text-[20px] font-bold tracking-[3px] mb-[26px] font-sans text-white/95">{{ number }}</p>
          <div class="flex items-center gap-8 text-[11px] uppercase tracking-wider font-semibold">
            <div>
              <p class="text-white/60 mb-0.5">Valid Thru</p>
              <p class="text-[14px] text-white tracking-normal">{{ expiry }}</p>
            </div>
            <div>
              <p class="text-white/60 mb-0.5">CVV</p>
              <p class="text-[14px] text-white tracking-normal">{{ cvv }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class CreditCardComponent {
  @Input() name = 'Card Holder';
  @Input() number = '7812 XXXX XXXX XXXX';
  @Input() expiry = '05/24';
  @Input() cvv = '09X';
  @Input() gradient = 'bg-gradient-to-br from-[#05cd99] via-[#00a878] to-[#007a57]';

  isFlipped = false;
}
