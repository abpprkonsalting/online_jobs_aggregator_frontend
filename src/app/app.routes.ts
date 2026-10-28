import { Routes } from '@angular/router';
import { authGuard } from './features/auth/guards/auth.guard';
import { SignInPage } from './features/auth/pages/sign-in-page';
import { JobDetailPage } from './features/jobs/pages/job-detail-page';
import { JobSearchPage } from './features/jobs/pages/job-search-page';
import { CategoriesPage } from './features/jobs/pages/categories-page';
import { NotFoundPage } from './pages/not-found-page';
import { CategoryInterestsPage } from './features/auth/pages/category-interests-page';
import { adminGuard } from './features/auth/guards/admin.guard';
import { HomePage } from './pages/home-page';
import { AdminUsersPage } from './features/admin/pages/admin-users-page';
import { AdminSourcesPage } from './features/admin/pages/admin-sources-page';
import { AdminGeographicAreasPage } from './features/admin/pages/admin-geographic-areas-page';
import { AdminSourceAreasPage } from './features/admin/pages/admin-source-areas-page';
import { AdminFetchRunsPage } from './features/admin/pages/admin-fetch-runs-page';
import { AdminMasterDataPage } from './features/admin/pages/admin-master-data-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePage },
  {
    path: 'jobs/:id',
    canActivate: [authGuard],
    component: JobDetailPage,
  },
  {
    path: 'jobs',
    canActivate: [authGuard],
    component: JobSearchPage,
  },
  {
    path: 'account',
    canActivate: [authGuard],
    component: CategoryInterestsPage,
  },
  {
    path: 'admin',
    pathMatch: 'full',
    canActivate: [adminGuard],
    component: AdminUsersPage,
  },
  {
    path: 'admin/sources',
    canActivate: [adminGuard],
    component: AdminSourcesPage,
  },
  {
    path: 'admin/geographic-areas',
    canActivate: [adminGuard],
    component: AdminGeographicAreasPage,
  },
  {
    path: 'admin/assignments',
    canActivate: [adminGuard],
    component: AdminSourceAreasPage,
  },
  {
    path: 'admin/fetch-runs',
    canActivate: [adminGuard],
    component: AdminFetchRunsPage,
  },
  {
    path: 'admin/master-data',
    canActivate: [adminGuard],
    component: AdminMasterDataPage,
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    component: CategoriesPage,
  },
  {
    path: 'sign-in',
    component: SignInPage,
  },
  { path: '**', canActivate: [authGuard], component: NotFoundPage },
];
