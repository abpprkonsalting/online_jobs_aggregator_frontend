import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../data-access/auth-session.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  if (!session.isAuthenticated()) {
    return router.createUrlTree(['/'], { queryParams: { returnUrl: state.url } });
  }

  return session.currentUser()?.role === 'admin'
    ? true
    : router.createUrlTree(['/']);
};
