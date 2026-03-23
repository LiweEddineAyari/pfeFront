import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'etl-pipeline',
        loadComponent: () =>
          import('./pages/etl-pipeline/etl-pipeline.component').then(
            (m) => m.EtlPipelineComponent
          ),
      },
    ],
  },
];
