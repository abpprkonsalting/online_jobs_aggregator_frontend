import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{
        provide: AuthApiService,
        useValue: {
          refresh: () => of({ access_token: 'restored-token' }),
          getCurrentUser: () => of({
            id: 'restored-user',
            email: 'user@example.com',
            role: 'user',
          }),
        },
      }],
    });
    session = TestBed.inject(AuthSessionService);
  });

  it('starts signed out without an access token or current user', () => {
    expect(session.isAuthenticated()).toBe(false);
    expect(session.getAccessToken()).toBeNull();
    expect(session.currentUser()).toBeNull();
  });

  it('exposes the current user after an in-memory session is set', () => {
    const user = { id: 'user-1', email: 'user@example.com', role: 'user' as const };
    session.setSession('access-token', user);

    expect(session.isAuthenticated()).toBe(true);
    expect(session.getAccessToken()).toBe('access-token');
    expect(session.currentUser()).toEqual(user);
  });

  it('replaces the access token without changing the current user', () => {
    const user = { id: 'user-1', email: 'user@example.com', role: 'user' as const };
    session.setSession('old-token', user);
    session.setAccessToken('new-token');

    expect(session.getAccessToken()).toBe('new-token');
    expect(session.currentUser()).toEqual(user);
    expect(session.isAuthenticated()).toBe(true);
  });

  it('clears all in-memory session state', () => {
    session.setSession('access-token', {
      id: 'user-1',
      email: 'user@example.com',
      role: 'admin',
    });
    session.clear();

    expect(session.isAuthenticated()).toBe(false);
    expect(session.getAccessToken()).toBeNull();
    expect(session.currentUser()).toBeNull();
  });
});
