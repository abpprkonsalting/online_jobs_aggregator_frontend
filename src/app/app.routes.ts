import { Routes } from '@angular/router';
import { JobSearchPage } from './features/jobs/pages/job-search-page';
import { NotFoundPage } from './pages/not-found-page';
import { PlaceholderPage } from './pages/placeholder-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'jobs' },
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
    component: PlaceholderPage,
    data: {
      title: 'Welcome back',
      description: 'Sign-in and account features will be available in a future update.',
    },
  },
  { path: '**', component: NotFoundPage },
];
