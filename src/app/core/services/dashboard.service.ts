import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private revenueLabels = new BehaviorSubject<string[]>([
    'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB',
  ]);
  private revenueDataset1 = new BehaviorSubject<number[]>([
    15000, 30000, 18000, 39000, 20000, 42000,
  ]);
  private revenueDataset2 = new BehaviorSubject<number[]>([
    10000, 20000, 11000, 30000, 14000, 32000,
  ]);

  private trafficLabels = new BehaviorSubject<string[]>([
    '00', '04', '08', '12', '14', '16', '18',
  ]);
  private trafficData = new BehaviorSubject<number[]>([
    20, 45, 52, 65, 80, 70, 55,
  ]);

  private projectStatusLabels = new BehaviorSubject<string[]>([
    'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thr', 'Fri',
  ]);
  private projectStatusData = new BehaviorSubject<number[]>([
    35, 28, 42, 55, 48, 62, 71,
  ]);

  private creditTransactions = new BehaviorSubject<Transaction[]>([
    {
      id: '1',
      icon: 'building-2',
      iconBg: 'bg-[#ebf8ff] dark:bg-[#ebf8ff]/10',
      iconColor: 'text-[#4299e1]',
      title: 'Bill & Taxes',
      date: 'Today, 16:36',
      amount: -154.50,
      type: 'debit',
    },
    {
      id: '2',
      icon: 'car',
      iconBg: 'bg-[#e6fffa] dark:bg-[#e6fffa]/10',
      iconColor: 'text-[#38b2ac]',
      title: 'Car Energy',
      date: '23 Jun, 13:06',
      amount: -40.50,
      type: 'debit',
    },
    {
      id: '3',
      icon: 'graduation-cap',
      iconBg: 'bg-[#fffaf0] dark:bg-[#fffaf0]/10',
      iconColor: 'text-[#ed8936]',
      title: 'Design Course',
      date: '21 Jun, 19:04',
      amount: -70.00,
      type: 'debit',
    },
  ]);

  private rightPanelTransactions = new BehaviorSubject<Transaction[]>([
    {
      id: '4',
      icon: 'bus',
      iconBg: 'bg-blue-100 dark:bg-indigo-500/15',
      iconColor: 'text-blue-500',
      title: 'Public Transport',
      date: '22 September 2022',
      amount: -15.50,
      type: 'debit',
    },
    {
      id: '5',
      icon: 'shopping-cart',
      iconBg: 'bg-green-100 dark:bg-green-500/15',
      iconColor: 'text-green-500',
      title: 'Grocery Store',
      date: '18 September 2022',
      amount: -42.28,
      type: 'debit',
    },
    {
      id: '6',
      icon: 'pill',
      iconBg: 'bg-red-100 dark:bg-red-500/15',
      iconColor: 'text-red-500',
      title: 'Pharmacy',
      date: '15 September 2022',
      amount: -22.90,
      type: 'debit',
    },
    {
      id: '7',
      icon: 'coffee',
      iconBg: 'bg-amber-100 dark:bg-amber-500/15',
      iconColor: 'text-amber-500',
      title: 'Coffee Shop',
      date: '12 September 2022',
      amount: -8.40,
      type: 'debit',
    },
  ]);

  private sparklineLabels = new BehaviorSubject<string[]>([
    'Sat', 'Sun', 'Mon', 'Tue', 'Wed',
  ]);
  private sparklineData = new BehaviorSubject<number[]>([
    30, 45, 35, 50, 45,
  ]);

  revenueLabels$ = this.revenueLabels.asObservable();
  revenueDataset1$ = this.revenueDataset1.asObservable();
  revenueDataset2$ = this.revenueDataset2.asObservable();
  trafficLabels$ = this.trafficLabels.asObservable();
  trafficData$ = this.trafficData.asObservable();
  projectStatusLabels$ = this.projectStatusLabels.asObservable();
  projectStatusData$ = this.projectStatusData.asObservable();
  creditTransactions$ = this.creditTransactions.asObservable();
  rightPanelTransactions$ = this.rightPanelTransactions.asObservable();
  sparklineLabels$ = this.sparklineLabels.asObservable();
  sparklineData$ = this.sparklineData.asObservable();
}
