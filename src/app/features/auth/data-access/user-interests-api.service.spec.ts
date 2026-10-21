import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { ApiError } from '../../../core/http/api-error';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AuthApiService } from './auth-api.service';
import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthSessionService } from './auth-session.service';
import { UserInterestsApiService } from './user-interests-api.service';

const userId = '7b7e594c-89bb-4773-a39b-1808ad48ad22';
const categoryId = '7b7e594c-89bb-4773-a39b-1808ad48ad23';

describe('UserInterestsApiService', () => {
  let httpTesting: HttpTestingController;
  let service: UserInterestsApiService;
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
        UserInterestsApiService,
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(UserInterestsApiService);
    session = TestBed.inject(AuthSessionService);
    session.setSession('access-token', {
      id: userId,
      email: 'user@example.com',
      role: 'user',
    });
  });

  afterEach(() => httpTesting.verify());

  it('lists category interests for the authenticated user', () => {
    let response: unknown;
    service.listCategoryInterests(userId).subscribe((value) => (response = value));

    const request = httpTesting.expectOne(`/api/users/${userId}/categories`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush([{
      id: categoryId,
      name: 'Engineering',
      slug: 'engineering',
      description: null,
      enabled: 1,
      created_at: '2026-10-21T12:00:00.000Z',
    }]);

    expect(response).toEqual([{
      id: categoryId,
      name: 'Engineering',
      slug: 'engineering',
      description: null,
      enabled: 1,
      created_at: '2026-10-21T12:00:00.000Z',
    }]);
  });

  it('adds a category interest for the authenticated user', () => {
    let response: unknown;
    service.addCategoryInterest(userId, categoryId).subscribe((value) => (response = value));

    const request = httpTesting.expectOne(`/api/users/${userId}/categories`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ category_id: categoryId });
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush({ user_id: userId, category_id: categoryId }, { status: 201, statusText: 'Created' });

    expect(response).toEqual({ user_id: userId, category_id: categoryId });
  });

  it('removes a category interest for the authenticated user', () => {
    let response: unknown;
    service.removeCategoryInterest(userId, categoryId).subscribe((value) => (response = value));

    const request = httpTesting.expectOne(`/api/users/${userId}/categories/${categoryId}`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush({ success: true });

    expect(response).toEqual({ success: true });
  });

  it('normalizes forbidden cross-user interest requests', () => {
    let actualError: unknown;
    service.listCategoryInterests(userId).subscribe({
      error: (error: unknown) => (actualError = error),
    });

    httpTesting.expectOne(`/api/users/${userId}/categories`).flush(
      { error: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({ kind: 'forbidden', status: 403 });
  });

  it('does not send an access token when no session exists and reports unauthorized requests', () => {
    session.clear();
    let actualError: unknown;
    service.listCategoryInterests(userId).subscribe({
      error: (error: unknown) => (actualError = error),
    });

    const request = httpTesting.expectOne(`/api/users/${userId}/categories`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(
      { error: 'Authorization header required' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({ kind: 'unauthorized', status: 401 });
  });

  it('encodes user and category identifiers as individual path segments', () => {
    service.removeCategoryInterest('user/id', 'category/id').subscribe();

    const request = httpTesting.expectOne('/api/users/user%2Fid/categories/category%2Fid');
    expect(request.request.method).toBe('DELETE');
    request.flush({ success: true });
  });
});
