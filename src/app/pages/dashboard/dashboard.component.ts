import { Component, OnInit, ChangeDetectionStrategy, inject, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Observable, map, combineLatest } from 'rxjs';

import { DashboardService } from '../../core/services/dashboard.service';
import { ThemeService } from '../../core/services/theme.service';
import { fadeInUp, staggerList, cardHover } from '../../core/animations';


import { ProgressRingComponent } from '../../shared/components/progress-ring/progress-ring.component';
import { RightPanelComponent } from '../../layout/right-panel/right-panel.component';

import { Transaction } from '../../core/models/transaction.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    BaseChartDirective,

    ProgressRingComponent,
    RightPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp, staggerList, cardHover],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private dashboardService = inject(DashboardService);
  private ngZone = inject(NgZone);
  themeService = inject(ThemeService);

  revenueConfig$!: Observable<{ datasets: ChartConfiguration<'line'>['data']['datasets']; labels: string[]; options?: any }>;
  trafficConfig$!: Observable<{ datasets: ChartConfiguration<'bar'>['data']['datasets']; labels: string[]; options?: any }>;
  projectConfig$!: Observable<{ datasets: ChartConfiguration<'line'>['data']['datasets']; labels: string[]; options?: any }>;
  creditTransactions$!: Observable<Transaction[]>;

  private getThemeColor(varName: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#01b574';
  }

  // Counter animation states
  trafficCount = '2.579';
  salesCount = '1540';
  profitCount = '3.984';

  revenueOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1500, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1b2559',
        titleFont: { family: '"Plus Jakarta Sans", sans-serif', size: 12 },
        bodyFont: { family: '"Plus Jakarta Sans", sans-serif', size: 12 },
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#a0aec0', font: { size: 12, family: '"Plus Jakarta Sans", sans-serif' }, padding: 8 },
      },
      y: { display: false },
    },
    elements: {
      point: { radius: 0, hoverRadius: 5, hoverBackgroundColor: '#fff', hoverBorderWidth: 3 },
      line: { tension: 0.4, borderWidth: 3 },
    },
  };

  trafficOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1b2559',
        cornerRadius: 8,
        padding: 10,
        displayColors: false,
        titleFont: { family: '"Plus Jakarta Sans", sans-serif' },
        bodyFont: { family: '"Plus Jakarta Sans", sans-serif' },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#a3aed0', font: { size: 12, family: '"Plus Jakarta Sans", sans-serif' }, padding: 8 },
      },
      y: { display: false },
    },
    elements: {
      bar: { borderRadius: 10 }
    }
  };

  projectOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1500, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#a3aed0', font: { size: 12, family: '"Plus Jakarta Sans", sans-serif' }, padding: 8 },
      },
      y: { display: false, min: 0, max: 100 },
    },
    elements: {
      point: { radius: 0, hoverRadius: 5 },
      line: { tension: 0.4, borderWidth: 3 },
    },
    layout: { padding: { top: 10, bottom: 25 } }
  };

  ngOnInit(): void {
    this.creditTransactions$ = this.dashboardService.creditTransactions$;

    this.revenueConfig$ = combineLatest([
      this.dashboardService.revenueLabels$,
      this.dashboardService.revenueDataset1$,
      this.dashboardService.revenueDataset2$,
      this.themeService.isDark$
    ]).pipe(
      map(([labels, data1, data2, _isDark]): { datasets: any[]; labels: string[]; options: any } => ({
        labels,
        datasets: [
          {
            data: data1,
            borderColor: this.getThemeColor('--chart-green'),
            fill: false,
            label: 'Revenue',
            borderWidth: 4.5,
          },
          {
            data: data2,
            borderColor: this.getThemeColor('--chart-blue'),
            fill: false,
            label: 'Profit',
            borderWidth: 3.5,
          },
        ],
        options: this.revenueOptions
      }))
    );

    this.trafficConfig$ = combineLatest([
      this.dashboardService.trafficLabels$,
      this.dashboardService.trafficData$,
      this.themeService.isDark$
    ]).pipe(
      map(([labels, data, isDark]): { datasets: any[]; labels: string[]; options: any } => {
        const chartGreen = this.getThemeColor('--chart-bar');
        const tickColor = isDark ? 'rgba(255, 255, 255, 0.7)' : '#a3aed0';
        
        const options = { ...this.trafficOptions };
        if (options.scales?.['x']) {
          (options.scales['x'] as any).ticks.color = tickColor;
        }

        return {
          labels,
          datasets: [
            {
              data,
              backgroundColor: (ctx: any) => {
                const chart = ctx.chart;
                const { chartArea, scales } = chart;
                if (!chartArea || !scales?.['y']) return 'rgba(1, 181, 116, 1)';

                const yScale = scales['y'];
                const value = (ctx.dataset.data[ctx.dataIndex] as number) ?? 0;
                const yTop = yScale.getPixelForValue(value);
                const yBottom = yScale.getPixelForValue(0);

                const gradient = chart.ctx.createLinearGradient(0, yTop, 0, yBottom);
                gradient.addColorStop(0, 'rgba(9, 175, 114, 1)');       // rich green at bar top
                gradient.addColorStop(0.55, 'rgba(78, 204, 162, 0.57)'); // mid mint
                gradient.addColorStop(1, 'rgba(78, 204, 163, 0.12)');   // near-transparent at base
                return gradient;
              },
              borderRadius: { topLeft: 8, topRight: 8 } as unknown as number,
              borderSkipped: false,
              barThickness: 18,
            },
          ],
          options
        };
      })
    );

    this.projectConfig$ = combineLatest([
      this.dashboardService.projectStatusLabels$,
      this.dashboardService.projectStatusData$,
      this.themeService.isDark$
    ]).pipe(
      map(([labels, data, isDark]): { datasets: any[]; labels: string[]; options: any } => {
        const tickColor = isDark ? 'rgba(255, 255, 255, 0.7)' : '#a3aed0';
        const options = { ...this.projectOptions };
        if (options.scales?.['x']) {
          (options.scales['x'] as any).ticks.color = tickColor;
        }

        return {
          labels,
          datasets: [
            {
              data,
              borderColor: this.getThemeColor('--chart-green'),
              backgroundColor: 'transparent',
              fill: false,
              label: 'Progress',
              borderWidth: 2.5,
            },
          ],
          options
        };
      })
    );
  }

  ngAfterViewInit(): void {
    // Numbers static from component initialization for immediate display
  }

  trackById(_: number, item: Transaction): string {
    return item.id;
  }

  getAbsAmount(amount: number): string {
    return Math.abs(amount).toFixed(2);
  }
}
