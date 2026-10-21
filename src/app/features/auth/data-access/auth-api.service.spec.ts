import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { ApiError } from '../../../core/http/api-error';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        AuthApiService,
      ],
    });

    service = TestBed.inject(AuthApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('logs in with credentials and accepts the http-only refresh cookie', () => {
    const credentials = { email: 'user@example.com', password: 'correct-horse' };
    let response: unknown;
    service.login(credentials).subscribe((value) => (response = value));

    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);
    expect(request.request.withCredentials).toBe(true);
    request.flush({
      access_token: 'access-token',
      user: { id: 'user-1', email: credentials.email, role: 'user' },
    });

    expect(response).toEqual({
      access_token: 'access-token',
      user: { id: 'user-1', email: credentials.email, role: 'user' },
    });
  });

  it('refreshes through the http-only cookie without accepting a token parameter', () => {
    let response: unknown;
    service.refresh().subscribe((value) => (response = value));

    const request = httpTesting.expectOne('/api/auth/refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.withCredentials).toBe(true);
    request.flush({ access_token: 'refreshed-access-token' });

    expect(response).toEqual({ access_token: 'refreshed-access-token' });
  });

  it('loads the current user from the authenticated endpoint', () => {
    let response: unknown;
    service.getCurrentUser().subscribe((value) => (response = value));

    const request = httpTesting.expectOne('/api/auth/me');
    expect(request.request.method).toBe('GET');
    request.flush({ id: 'user-1', email: 'user@example.com', role: 'admin' });

    expect(response).toEqual({ id: 'user-1', email: 'user@example.com', role: 'admin' });
  });

  it('logs out with the refresh cookie and returns the API result', () => {
    let response: unknown;
    service.logout().subscribe((value) => (response = value));

    const request = httpTesting.expectOne('/api/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.withCredentials).toBe(true);
    request.flush({ success: true });

    expect(response).toEqual({ success: true });
  });

  it('reports invalid login credentials as an API authentication error', () => {
    let actualError: unknown;
    service.login({ email: 'user@example.com', password: 'incorrect' })
      .subscribe({ error: (error: unknown) => (actualError = error) });

    httpTesting.expectOne('/api/auth/login').flush(
      { error: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({
      kind: 'unauthorized',
      status: 401,
      message: 'Invalid credentials',
    });
  });

  it('reports an expired refresh cookie as an API authentication error', () => {
    let actualError: unknown;
    service.refresh().subscribe({ error: (error: unknown) => (actualError = error) });

    const request = httpTesting.expectOne('/api/auth/refresh');
    expect(request.request.withCredentials).toBe(true);
    request.flush(
      { error: 'Refresh token required' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({
      kind: 'unauthorized',
      status: 401,
      message: 'Refresh token required',
    });
  });
});
