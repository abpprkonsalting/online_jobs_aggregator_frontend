import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-base-url';
import { ApiClient } from './api-client';
import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('ApiClient', () => {
  let client: ApiClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api/' },
      ],
    });

    client = TestBed.inject(ApiClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('uses the configured API base URL and returns successful responses', () => {
    let response: { result: string } | undefined;
    client.get<{ result: string }>('/jobs', { withCredentials: true }).subscribe((value) => (response = value));

    const request = httpTesting.expectOne('/api/jobs');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ result: 'ok' });

    expect(response).toEqual({ result: 'ok' });
  });

  it('normalizes backend validation errors and their field details', () => {
    let actualError: unknown;
    client.post('/auth/login', {}).subscribe({ error: (error: unknown) => (actualError = error) });

    httpTesting.expectOne('/api/auth/login').flush(
      {
        errors: [{ msg: 'Invalid value', path: 'email', location: 'body' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({
      kind: 'validation',
      status: 400,
      validationErrors: [{ message: 'Invalid value', field: 'email', location: 'body' }],
    });
  });

  it('normalizes backend authentication errors', () => {
    let actualError: unknown;
    client.get('/auth/me').subscribe({ error: (error: unknown) => (actualError = error) });

    httpTesting.expectOne('/api/auth/me').flush(
      { error: 'Not authenticated' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({
      kind: 'unauthorized',
      status: 401,
      message: 'Not authenticated',
    });
  });

  it('normalizes authorization errors', () => {
    let actualError: unknown;
    client.get('/admin/sources').subscribe({ error: (error: unknown) => (actualError = error) });

    httpTesting.expectOne('/api/admin/sources').flush(
      { error: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({
      kind: 'forbidden',
      status: 403,
      message: 'Forbidden',
    });
  });

  it('normalizes server errors', () => {
    let actualError: unknown;
    client.get('/jobs').subscribe({ error: (error: unknown) => (actualError = error) });

    httpTesting.expectOne('/api/jobs').flush(
      { error: 'Database unavailable' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({
      kind: 'server',
      status: 500,
      message: 'Database unavailable',
    });
  });

  it('normalizes network errors', () => {
    let actualError: unknown;
    client.get('/jobs').subscribe({ error: (error: unknown) => (actualError = error) });

    httpTesting.expectOne('/api/jobs').error(new ProgressEvent('error'));

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({ kind: 'network', status: 0 });
  });
});
