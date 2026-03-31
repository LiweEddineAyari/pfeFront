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
      {
        path: 'datamart',
        loadComponent: () =>
          import('./pages/datamart/datamart.component').then(
            (m) => m.DatamartComponent
          ),
      },
      {
        path: 'datamart/client',
        title: 'Donnees clients',
        loadComponent: () =>
          import('./pages/client-data/client-data.component').then(
            (m) => m.ClientDataComponent
          ),
      },
      {
        path: 'datamart/contrat',
        title: 'Donnees contrats',
        loadComponent: () =>
          import('./pages/contrat-data/contrat-data.component').then(
            (m) => m.ContratDataComponent
          ),
      },
      {
        path: 'datamart/balance',
        title: 'Donnees balance',
        loadComponent: () =>
          import('./pages/balance-data/balance-data.component').then(
            (m) => m.BalanceDataComponent
          ),
      },
    ],
  },
];