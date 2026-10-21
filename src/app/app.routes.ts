import { Routes } from '@angular/router';
import { authGuard } from './features/auth/guards/auth.guard';
import { SignInPage } from './features/auth/pages/sign-in-page';
import { JobDetailPage } from './features/jobs/pages/job-detail-page';
import { JobSearchPage } from './features/jobs/pages/job-search-page';
import { NotFoundPage } from './pages/not-found-page';
import { PlaceholderPage } from './pages/placeholder-page';

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
    component: PlaceholderPage,
    data: {
      title: 'Your account',
      description: 'Your account settings will be available here.',
    },
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
