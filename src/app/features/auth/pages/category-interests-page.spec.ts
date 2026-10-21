import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AuthApiService } from '../data-access/auth-api.service';
import { authTokenInterceptor } from '../data-access/auth-token.interceptor';
import { AuthSessionService } from '../data-access/auth-session.service';
import { UserInterestsApiService } from '../data-access/user-interests-api.service';
import { routes } from '../../../app.routes';
import { ReferenceDataApiService } from '../../jobs/data-access/reference-data-api.service';
import { JobsApiService } from '../../jobs/data-access/jobs-api.service';
import { Category, JobListResponse } from '../../../core/models/api.models';
import { UserCategoryInterest } from '../models/auth.models';

const userId = '7b7e594c-89bb-4773-a39b-1808ad48ad22';
const engineering: Category = {
  id: '7b7e594c-89bb-4773-a39b-1808ad48ad23',
  name: 'Engineering',
  slug: 'engineering',
  description: 'Build and maintain software.',
};
const design: Category = {
  id: '7b7e594c-89bb-4773-a39b-1808ad48ad24',
  name: 'Design',
  slug: 'design',
  description: null,
};

function interest(category: Category): UserCategoryInterest {
  return {
    ...category,
    enabled: 1,
    created_at: '2026-10-21T12:00:00.000Z',
  };
}

const emptyJobs: JobListResponse = {
  jobs: [],
  total: 0,
  limit: 20,
  offset: 0,
  hasMore: false,
};

describe('CategoryInterestsPage', () => {
  let httpTesting: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        AuthApiService,
        AuthSessionService,
        UserInterestsApiService,
        ReferenceDataApiService,
        JobsApiService,
        provideRouter(routes),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSessionService).setSession('access-token', {
      id: userId,
      email: 'user@example.com',
      role: 'user',
    });
  });

  afterEach(() => httpTesting.verify());

  async function openPage() {
    harness = await RouterTestingHarness.create('/account');
    harness.detectChanges();
    return harness;
  }

  function loadInitialData(
    pageHarness: RouterTestingHarness,
    categories: Category[],
    interests: UserCategoryInterest[],
  ): HTMLElement {
    const categoriesRequest = httpTesting.expectOne('/api/categories');
    expect(categoriesRequest.request.headers.has('Authorization')).toBe(false);
    categoriesRequest.flush(categories);

    const interestsRequest = httpTesting.expectOne(`/api/users/${userId}/categories`);
    expect(interestsRequest.request.headers.get('Authorization')).toBe('Bearer access-token');
    interestsRequest.flush(interests);
    pageHarness.detectChanges();
    return pageHarness.routeNativeElement as HTMLElement;
  }

  it('loads public categories and only the signed-in user’s interests', async () => {
    const pageHarness = await openPage();
    const page = loadInitialData(pageHarness, [engineering, design], [interest(engineering)]);

    expect(page.querySelector('h1')?.textContent).toContain('Category interests');
    expect(page.querySelector('#category')?.textContent).toContain('Design');
    expect(page.querySelector('.interest-list')?.textContent).toContain('Engineering');
    expect(page.querySelector('.interest-list')?.textContent).not.toContain('Design');
  });

  it('shows an empty state when the user has no followed categories', async () => {
    const pageHarness = await openPage();
    const page = loadInitialData(pageHarness, [engineering], []);

    expect(page.textContent).toContain('You are not following any categories yet.');
    expect(page.querySelector('.interest-list')).toBeNull();
  });

  it('adds a category and reloads interests so the saved choice survives page navigation', async () => {
    const pageHarness = await openPage();
    const page = loadInitialData(pageHarness, [engineering, design], []);
    const categorySelect = page.querySelector('#category') as HTMLSelectElement;
    categorySelect.value = engineering.id;
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    pageHarness.detectChanges();
    expect((page.querySelector('.primary-button') as HTMLButtonElement).disabled).toBe(false);
    (page.querySelector('.primary-button') as HTMLButtonElement).click();

    const addRequest = httpTesting.expectOne(`/api/users/${userId}/categories`);
    expect(addRequest.request.method).toBe('POST');
    expect(addRequest.request.body).toEqual({ category_id: engineering.id });
    expect(addRequest.request.headers.get('Authorization')).toBe('Bearer access-token');
    addRequest.flush({ user_id: userId, category_id: engineering.id }, { status: 201, statusText: 'Created' });

    const updatedInterestsRequest = httpTesting.expectOne(`/api/users/${userId}/categories`);
    updatedInterestsRequest.flush([interest(engineering)]);
    pageHarness.detectChanges();
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('.interest-list')?.textContent)
      .toContain('Engineering');

    await pageHarness.navigateByUrl('/jobs');
    httpTesting.expectOne('/api/jobs').flush(emptyJobs);
    await pageHarness.navigateByUrl('/account');
    pageHarness.detectChanges();
    httpTesting.expectOne('/api/categories').flush([engineering, design]);
    const reloadRequest = httpTesting.expectOne(`/api/users/${userId}/categories`);
    expect(reloadRequest.request.headers.get('Authorization')).toBe('Bearer access-token');
    reloadRequest.flush([interest(engineering)]);
    pageHarness.detectChanges();

    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('.interest-list')?.textContent)
      .toContain('Engineering');
  });

  it('removes a followed category only after the API confirms the mutation', async () => {
    const pageHarness = await openPage();
    const page = loadInitialData(pageHarness, [engineering], [interest(engineering)]);
    (page.querySelector('.remove-button') as HTMLButtonElement).click();

    const deleteRequest = httpTesting.expectOne(`/api/users/${userId}/categories/${engineering.id}`);
    expect(deleteRequest.request.method).toBe('DELETE');
    expect(deleteRequest.request.headers.get('Authorization')).toBe('Bearer access-token');
    deleteRequest.flush({ success: true });

    httpTesting.expectOne(`/api/users/${userId}/categories`).flush([]);
    pageHarness.detectChanges();
    expect((pageHarness.routeNativeElement as HTMLElement).textContent)
      .toContain('You are not following any categories yet.');
  });

  it('keeps category and interest errors independent and retryable', async () => {
    const pageHarness = await openPage();
    const categoriesRequest = httpTesting.expectOne('/api/categories');
    const interestsRequest = httpTesting.expectOne(`/api/users/${userId}/categories`);
    categoriesRequest.flush(
      { error: 'Category service unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    interestsRequest.flush(
      { error: 'Interest service unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    pageHarness.detectChanges();

    let page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.textContent).toContain('Category service unavailable');
    expect(page.textContent).toContain('Interest service unavailable');
    (page.querySelector('.retry-categories') as HTMLButtonElement).click();
    (page.querySelector('.retry-interests') as HTMLButtonElement).click();
    pageHarness.detectChanges();

    httpTesting.expectOne('/api/categories').flush([engineering]);
    httpTesting.expectOne(`/api/users/${userId}/categories`).flush([]);
    pageHarness.detectChanges();
    page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.textContent).not.toContain('service unavailable');
    expect(page.textContent).toContain('You are not following any categories yet.');
  });
});
