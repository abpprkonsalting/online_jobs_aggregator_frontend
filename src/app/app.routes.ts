import { Routes } from '@angular/router';
import { NotFoundPage } from './pages/not-found-page';
import { PlaceholderPage } from './pages/placeholder-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'jobs' },
  {
    path: 'jobs',
    component: PlaceholderPage,
    data: {
      title: 'Find your next opportunity',
      description: 'Job discovery is coming soon. Check back as we build out the search experience.',
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
    component: PlaceholderPage,
    data: {
      title: 'Welcome back',
      description: 'Sign-in and account features will be available in a future update.',
    },
  },
  { path: '**', component: NotFoundPage },
];
