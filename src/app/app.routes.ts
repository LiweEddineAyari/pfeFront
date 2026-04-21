import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout/layout.component';
import { EtlPipelineComponent } from './pages/etl-pipeline/etl-pipeline.component';

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
        component: EtlPipelineComponent,
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
      {
        path: 'mapping',
        pathMatch: 'full',
        redirectTo: 'mapping/configurations',
      },
      {
        path: 'mapping/configurations',
        title: 'Configurations de mapping',
        loadComponent: () =>
          import('./pages/mapping-config/mapping-config.component').then(
            (m) => m.MappingConfigComponent
          ),
      },
      {
        path: 'mapping/configurations/:configGroupNumber',
        title: 'Details configuration de mapping',
        loadComponent: () =>
          import('./pages/mapping-config-details/mapping-config-details.component').then(
            (m) => m.MappingConfigDetailsComponent
          ),
      },
      {
        path: 'mapping/nouvelle-configuration',
        title: 'Ajouter une configuration de mapping',
        loadComponent: () =>
          import('./pages/add-mapping-config/add-mapping-config.component').then(
            (m) => m.AddMappingConfigComponent
          ),
      },
      {
        path: 'parameters',
        title: 'Parametres analytiques',
        loadComponent: () =>
          import('./pages/parameters/parameters-page.component').then(
            (m) => m.ParametersPageComponent
          ),
      },
      {
        path: 'ratios',
        title: 'Ratios dynamiques',
        loadComponent: () =>
          import('./pages/ratios/ratios-page.component').then(
            (m) => m.RatiosPageComponent
          ),
      },
      {
        path: 'datamart/mapping-config',
        pathMatch: 'full',
        redirectTo: 'mapping/configurations',
      },
      {
        path: 'datamart/mapping-config/:configGroupNumber',
        redirectTo: 'mapping/configurations/:configGroupNumber',
      },
    ],
  },
];