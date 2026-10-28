import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Category } from '../../../core/models/api.models';
import { ReferenceDataApiService } from '../data-access/reference-data-api.service';
import { CategoriesPage } from './categories-page';

const engineering: Category = {
  id: 'category-1',
  name: 'Engineering',
  slug: 'engineering',
  description: 'Build and maintain software.',
};
const design: Category = {
  id: 'category-2',
  name: 'Design',
  slug: 'design',
  description: null,
};

describe('CategoriesPage', () => {
  let httpTesting: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        ReferenceDataApiService,
        provideRouter([{ path: 'categories', component: CategoriesPage }]),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  async function openPage() {
    harness = await RouterTestingHarness.create('/categories');
    harness.detectChanges();
    return harness;
  }

  it('loads categories and renders them as job links', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/categories').flush([engineering, design]);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Job categories');
    expect(page.textContent).toContain('Engineering');
    expect(page.textContent).toContain('Design');
    const firstLink = page.querySelector('.category-list a') as HTMLAnchorElement;
    expect(firstLink).not.toBeNull();
    expect(firstLink.getAttribute('href')).toContain('category=category-1');
  });

  it('shows an empty state when no categories are available', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/categories').flush([]);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.textContent).toContain('No categories are available yet.');
  });

  it('shows an error state when the categories request fails and is retryable', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/categories').flush(
      { error: 'Category service unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.textContent).toContain('Category service unavailable');

    (page.querySelector('.retry-button') as HTMLButtonElement).click();
    pageHarness.detectChanges();

    httpTesting.expectOne('/api/categories').flush([engineering]);
    pageHarness.detectChanges();

    expect(page.textContent).toContain('Engineering');
    expect(page.textContent).not.toContain('Category service unavailable');
  });
});
