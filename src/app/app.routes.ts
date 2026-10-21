import { Routes } from '@angular/router';
import { JobDetailPage } from './features/jobs/pages/job-detail-page';
import { JobSearchPage } from './features/jobs/pages/job-search-page';
import { SignInPage } from './features/auth/pages/sign-in-page';
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
