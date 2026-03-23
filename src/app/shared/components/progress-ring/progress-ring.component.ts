import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-flex items-center justify-center" [style.width.px]="size" [style.height.px]="size">
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" [attr.width]="size" [attr.height]="size">
        <!-- Background ring -->
        <circle
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="trackColor"
          [attr.stroke-width]="strokeWidth"
        />
        <!-- Progress ring -->
        <circle
          class="progress-ring-circle"
          [style.--circumference]="circumference"
          [style.--target-offset]="targetOffset"
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="color"
          [attr.stroke-width]="strokeWidth"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="targetOffset"
          [attr.transform]="'rotate(-90 ' + center + ' ' + center + ')'"
        />
        <!-- Center text removed -->
      </svg>
    </div>
  `,
  styles: [`
    @keyframes ringDraw {
      from { stroke-dashoffset: var(--circumference); }
      to   { stroke-dashoffset: var(--target-offset); }
    }
    .progress-ring-circle {
      animation: ringDraw 1.5s cubic-bezier(0.4,0,0.2,1) forwards;
    }
  `],
})
export class ProgressRingComponent {
  @Input() percent = 0;
  @Input() size = 160;
  @Input() strokeWidth = 12;
  @Input() color = '#01b574';
  @Input() trackColor = '#e2e8f0';

  get center(): number {
    return this.size / 2;
  }

  get radius(): number {
    return (this.size - this.strokeWidth) / 2 - 4;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get targetOffset(): number {
    return this.circumference * (1 - this.percent / 100);
  }
}

