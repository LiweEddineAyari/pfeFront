import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { of, Observable } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';

interface Transaction {
  id: number;
  title: string;
  date: string;
  amount: number;
  icon: string;
  iconBg: string;
  iconColor: string;
}

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './right-panel.component.html'
})
export class RightPanelComponent {
  themeService = inject(ThemeService);

  creditTransactions$: Observable<Transaction[]> = of([
    { id: 1, title: 'Public Transport', date: '22 September 2022', amount: -15.50, icon: 'bus-front', iconBg: 'bg-[#ebf8ff] dark:bg-[#1b2559]', iconColor: 'text-[#4299e1]' },
    { id: 2, title: 'Grocery Store', date: '18 September 2022', amount: -42.28, icon: 'shopping-bag', iconBg: 'bg-[#e6fffa] dark:bg-[#1b2559]', iconColor: 'text-[#38b2ac]' },
    { id: 3, title: 'Public Transport', date: '15 September 2022', amount: -11.37, icon: 'bus-front', iconBg: 'bg-[#ebf8ff] dark:bg-[#1b2559]', iconColor: 'text-[#4299e1]' },
    { id: 4, title: 'Netflix', date: '12 September 2022', amount: -34.90, icon: 'tv', iconBg: 'bg-[#fff5f5] dark:bg-[#1b2559]', iconColor: 'text-[#e53e3e]' },
    { id: 5, title: 'Drink Store', date: '09 September 2022', amount: -5.21, icon: 'glass-water', iconBg: 'bg-[#ebf8ff] dark:bg-[#1b2559]', iconColor: 'text-[#4299e1]' },
    { id: 6, title: 'Drink Store', date: '09 September 2022', amount: -5.21, icon: 'glass-water', iconBg: 'bg-[#ebf8ff] dark:bg-[#1b2559]', iconColor: 'text-[#4299e1]' },
    { id: 7, title: 'Apartment Debt', date: '05 September 2022', amount: -314.90, icon: 'home', iconBg: 'bg-[#faf5ff] dark:bg-[#1b2559]', iconColor: 'text-[#9f7aea]' }
  ]);

  trackById(index: number, item: Transaction): number {
    return item.id;
  }
}
