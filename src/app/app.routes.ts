import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout/layout.component';
import { EtlPipelineComponent } from './pages/etl-pipeline/etl-pipeline.component';
import { AuthShellComponent } from './pages/auth/auth-shell.component';
import { BlankComponent } from './core/auth/blank.component';
import {
  authGuard,
  homeRedirectGuard,
  publicOnlyGuard,
  roleGuard,
} from './core/auth/guards/auth.guards';

const TECH = { roles: ['ROLE_TECH'] };
const FINANCE = { roles: ['ROLE_FINANCE'] };
const TECH_FINANCE = { roles: ['ROLE_TECH', 'ROLE_FINANCE'] };
const ADMIN = { roles: ['ROLE_ADMIN'] };
const NONE = { roles: [] }; // reserved / denied to everyone

export const routes: Routes = [
  // ── Public auth surface ───────────────────────────────────────────────────
  {
    path: 'auth',
    component: AuthShellComponent,
    canActivate: [publicOnlyGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
      {
        path: 'sign-in',
        loadComponent: () =>
          import('./pages/auth/sign-in/sign-in.component').then((m) => m.SignInComponent),
      },
      {
        path: 'sign-up',
        loadComponent: () =>
          import('./pages/auth/sign-up/sign-up.component').then((m) => m.SignUpComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent
          ),
      },
      {
        path: 'verify-otp',
        loadComponent: () =>
          import('./pages/auth/verify-otp/verify-otp.component').then(
            (m) => m.VerifyOtpComponent
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./pages/auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent
          ),
      },
    ],
  },

  // ── Protected application shell ───────────────────────────────────────────
  {
    path: '',
    component: LayoutComponent,
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], component: BlankComponent },

      {
        path: 'dashboard',
        title: 'Tableau de bord',
        canActivate: [roleGuard],
        data: FINANCE,
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'etl-pipeline',
        canActivate: [roleGuard],
        data: TECH,
        component: EtlPipelineComponent,
      },
      {
        path: 'datamart',
        canActivate: [roleGuard],
        data: TECH_FINANCE,
        loadComponent: () =>
          import('./pages/datamart/datamart.component').then((m) => m.DatamartComponent),
      },
      {
        path: 'datamart/client',
        title: 'Donnees clients',
        canActivate: [roleGuard],
        data: TECH_FINANCE,
        loadComponent: () =>
          import('./pages/client-data/client-data.component').then((m) => m.ClientDataComponent),
      },
      {
        path: 'datamart/contrat',
        title: 'Donnees contrats',
        canActivate: [roleGuard],
        data: TECH_FINANCE,
        loadComponent: () =>
          import('./pages/contrat-data/contrat-data.component').then((m) => m.ContratDataComponent),
      },
      {
        path: 'datamart/balance',
        title: 'Donnees balance',
        canActivate: [roleGuard],
        data: TECH_FINANCE,
        loadComponent: () =>
          import('./pages/balance-data/balance-data.component').then((m) => m.BalanceDataComponent),
      },
      { path: 'mapping', pathMatch: 'full', redirectTo: 'mapping/configurations' },
      {
        path: 'mapping/configurations',
        title: 'Configurations de mapping',
        canActivate: [roleGuard],
        data: TECH,
        loadComponent: () =>
          import('./pages/mapping-config/mapping-config.component').then((m) => m.MappingConfigComponent),
      },
      {
        path: 'mapping/configurations/:configGroupNumber',
        title: 'Details configuration de mapping',
        canActivate: [roleGuard],
        data: TECH,
        loadComponent: () =>
          import('./pages/mapping-config-details/mapping-config-details.component').then(
            (m) => m.MappingConfigDetailsComponent
          ),
      },
      {
        path: 'mapping/nouvelle-configuration',
        title: 'Ajouter une configuration de mapping',
        canActivate: [roleGuard],
        data: TECH,
        loadComponent: () =>
          import('./pages/add-mapping-config/add-mapping-config.component').then(
            (m) => m.AddMappingConfigComponent
          ),
      },
      {
        path: 'parameters',
        title: 'Parametres analytiques',
        canActivate: [roleGuard],
        data: TECH_FINANCE,
        loadComponent: () =>
          import('./pages/parameters/parameters-page.component').then((m) => m.ParametersPageComponent),
      },
      {
        path: 'parameters/nouveau',
        title: 'Nouveau parametre',
        canActivate: [roleGuard],
        data: TECH,
        loadComponent: () =>
          import('./pages/parameters/add-parameter/add-parameter-page.component').then(
            (m) => m.AddParameterPageComponent
          ),
      },
      {
        path: 'ratios',
        title: 'Ratios dynamiques',
        canActivate: [roleGuard],
        data: TECH_FINANCE,
        loadComponent: () =>
          import('./pages/ratios/ratios-page.component').then((m) => m.RatiosPageComponent),
      },
      {
        path: 'ratios/nouveau',
        title: 'Nouveau ratio',
        canActivate: [roleGuard],
        data: TECH,
        loadComponent: () =>
          import('./pages/ratios/add-ratio/add-ratio-page.component').then((m) => m.AddRatioPageComponent),
      },
      {
        path: 'stress-test',
        title: 'Stress test',
        canActivate: [roleGuard],
        data: NONE,
        loadComponent: () =>
          import('./pages/stress-test/stress-test-page.component').then((m) => m.StressTestPageComponent),
      },
      {
        path: 'chatbot',
        title: 'FinanceGPT — Analyse IA',
        canActivate: [roleGuard],
        data: FINANCE,
        loadComponent: () =>
          import('./pages/chatbot/chatbot-page.component').then((m) => m.ChatbotPageComponent),
      },

      // ── Self-service profile (any authenticated user) ──
      {
        path: 'profile',
        title: 'Mon profil',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
      },

      // ── Administration (ROLE_ADMIN only) ──
      {
        path: 'admin/users',
        title: 'Gestion des utilisateurs',
        canActivate: [roleGuard],
        data: ADMIN,
        loadComponent: () =>
          import('./pages/admin/users/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'admin/roles',
        title: 'Rôles & permissions',
        canActivate: [roleGuard],
        data: ADMIN,
        loadComponent: () =>
          import('./pages/admin/roles/admin-roles.component').then((m) => m.AdminRolesComponent),
      },
      {
        path: 'admin/signup-requests',
        title: "Demandes d'inscription",
        canActivate: [roleGuard],
        data: ADMIN,
        loadComponent: () =>
          import('./pages/admin/signup-requests/admin-signup-requests.component').then(
            (m) => m.AdminSignupRequestsComponent
          ),
      },

      // ── Legacy redirects ──
      { path: 'datamart/mapping-config', pathMatch: 'full', redirectTo: 'mapping/configurations' },
      {
        path: 'datamart/mapping-config/:configGroupNumber',
        redirectTo: 'mapping/configurations/:configGroupNumber',
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
