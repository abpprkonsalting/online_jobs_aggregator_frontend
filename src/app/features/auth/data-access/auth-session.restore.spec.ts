import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthApiService } from './auth-api.service';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService restore', () => {
  let httpTesting: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        AuthApiService,
        AuthSessionService,
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
  });

  afterEach(() => httpTesting.verify());

  it('refreshes the cookie session, then loads the current user with the new bearer token', () => {
    session.restore().subscribe();

    const refreshRequest = httpTesting.expectOne('/api/auth/refresh');
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.withCredentials).toBe(true);
    expect(refreshRequest.request.body).toBeNull();
    refreshRequest.flush({ access_token: 'restored-access-token' });

    const userRequest = httpTesting.expectOne('/api/auth/me');
    expect(userRequest.request.headers.get('Authorization')).toBe('Bearer restored-access-token');
    userRequest.flush({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });

    expect(session.isInitialized()).toBe(true);
    expect(session.isAuthenticated()).toBe(true);
    expect(session.currentUser()).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    expect(session.restoreError()).toBeNull();
  });

  it('returns to a clean signed-out state when the refresh cookie is missing or expired', () => {
    session.restore().subscribe();

    const refreshRequest = httpTesting.expectOne('/api/auth/refresh');
    expect(refreshRequest.request.withCredentials).toBe(true);
    refreshRequest.flush(
      { error: 'Refresh token required' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(session.isInitialized()).toBe(true);
    expect(session.isAuthenticated()).toBe(false);
    expect(session.currentUser()).toBeNull();
    expect(session.getAccessToken()).toBeNull();
    expect(session.restoreError()).toBeNull();
    httpTesting.expectNone('/api/auth/me');
  });

  it('surfaces unexpected restore failures while keeping the session signed out', () => {
    session.restore().subscribe();

    httpTesting.expectOne('/api/auth/refresh').flush(
      { error: 'Authentication service unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(session.isInitialized()).toBe(true);
    expect(session.isAuthenticated()).toBe(false);
    expect(session.restoreError()).toMatchObject({
      kind: 'server',
      status: 503,
      message: 'Authentication service unavailable',
    });
  });

  it('clears a refreshed token if the current-user lookup is unauthorized', () => {
    session.restore().subscribe();
    httpTesting.expectOne('/api/auth/refresh').flush({ access_token: 'expired-access-token' });

    const userRequest = httpTesting.expectOne('/api/auth/me');
    expect(userRequest.request.headers.get('Authorization')).toBe('Bearer expired-access-token');
    userRequest.flush(
      { error: 'Not authenticated' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(session.isInitialized()).toBe(true);
    expect(session.isAuthenticated()).toBe(false);
    expect(session.currentUser()).toBeNull();
    expect(session.getAccessToken()).toBeNull();
    expect(session.restoreError()).toBeNull();
  });
});
