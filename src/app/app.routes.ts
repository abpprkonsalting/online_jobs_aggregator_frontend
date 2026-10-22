import { Routes } from '@angular/router';
import { authGuard } from './features/auth/guards/auth.guard';
import { SignInPage } from './features/auth/pages/sign-in-page';
import { JobDetailPage } from './features/jobs/pages/job-detail-page';
import { JobSearchPage } from './features/jobs/pages/job-search-page';
import { NotFoundPage } from './pages/not-found-page';
import { PlaceholderPage } from './pages/placeholder-page';
import { CategoryInterestsPage } from './features/auth/pages/category-interests-page';
import { adminGuard } from './features/auth/guards/admin.guard';
import { AdminUsersPage } from './features/admin/pages/admin-users-page';
import { AdminSourcesPage } from './features/admin/pages/admin-sources-page';
import { AdminGeographicAreasPage } from './features/admin/pages/admin-geographic-areas-page';
import { AdminSourceAreasPage } from './features/admin/pages/admin-source-areas-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'jobs' },
  {
    path: 'jobs/:id',
    component: JobDetailPage,
  },
  {
    path: 'jobs',
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
    path: 'categories',
    component: PlaceholderPage,
    data: {
      title: 'Explore job categories',
      description: 'Category browsing will be available in a future update.',
    },
  },
  {
    path: 'sign-in',
    component: SignInPage,
  },
  { path: '**', component: NotFoundPage },
];
