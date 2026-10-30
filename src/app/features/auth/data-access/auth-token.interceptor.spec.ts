import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthSessionService } from './auth-session.service';

describe('authTokenInterceptor', () => {
  let api: ApiClient;
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        AuthSessionService,
      ],
    });

    api = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
  });

  afterEach(() => httpTesting.verify());

  it('adds the access token to protected API requests', () => {
    session.setSession('access-token', {
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    api.get('/admin/users').subscribe();

    const request = httpTesting.expectOne('/api/admin/users');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush([]);
  });

  it('adds the access token to the current-user request', () => {
    session.setSession('access-token', {
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    api.get('/auth/me').subscribe();

    const request = httpTesting.expectOne('/api/auth/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush({ id: 'user-1', email: 'user@example.com', role: 'user' });
  });

  it('adds the access token to job requests for server-side category matching', () => {
    session.setSession('access-token', {
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    api.get('/jobs').subscribe();

    const request = httpTesting.expectOne('/api/jobs');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush({ jobs: [], total: 0, limit: 20, offset: 0, hasMore: false });
  });

  it('adds the access token to reference-data requests that require authentication', () => {
    session.setSession('access-token', {
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    api.get('/categories').subscribe();

    const request = httpTesting.expectOne('/api/categories');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush([]);
  });

  it('does not add the access token to public API requests', () => {
    session.setSession('access-token', {
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    api.get('/health').subscribe();

    const request = httpTesting.expectOne('/api/health');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ status: 'ok' });
  });

  it('does not send the access token to a third-party URL', () => {
    session.setSession('access-token', {
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    http.get('https://third-party.example/api/admin/users').subscribe();

    const request = httpTesting.expectOne('https://third-party.example/api/admin/users');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });
});
