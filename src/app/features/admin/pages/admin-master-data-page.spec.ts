import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AuthApiService } from '../../auth/data-access/auth-api.service';
import { authTokenInterceptor } from '../../auth/data-access/auth-token.interceptor';
import { AuthSessionService } from '../../auth/data-access/auth-session.service';
import { AdminMasterDataApiService } from '../data-access/admin-master-data-api.service';
import { AdminMasterSchema } from '../models/admin-master-data.models';
import { AdminMasterDataPage } from './admin-master-data-page';

const category = {
  id: 'category-1',
  name: 'Engineering',
  slug: 'engineering',
  description: null,
};

const country = { id: 'country-1', name: 'United States', code: 'US' };

function schema(overrides: Partial<AdminMasterSchema> = {}): AdminMasterSchema {
  return {
    countries: [country],
    cities: [{ id: 'city-1', country_id: country.id, name: 'Boston' }],
    skills: [{ id: 'skill-1', name: 'TypeScript', slug: 'typescript' }],
    categories: [category],
    geographic_areas: [],
    ...overrides,
  };
}

describe('AdminMasterDataPage', () => {
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
        AdminMasterDataApiService,
        provideRouter([{ path: 'admin/master-data', component: AdminMasterDataPage }]),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSessionService).setSession('admin-token', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });
  });

  afterEach(() => httpTesting.verify());

  async function openPage() {
    harness = await RouterTestingHarness.create('/admin/master-data');
    harness.detectChanges();
    return harness;
  }

  function flushInitialData(masterSchema = schema(), keywords: unknown[] = []): void {
    httpTesting.expectOne('/api/master/schema').flush(masterSchema);
    httpTesting.expectOne('/api/master/keywords').flush(keywords);
    httpTesting.expectOne('/api/master/category-keywords').flush([]);
    httpTesting.expectOne('/api/master/categories/category-1/subscribers').flush({
      category_id: 'category-1',
      subscriber_count: 0,
    });
  }

  function selectSection(page: HTMLElement, label: string): void {
    const button = [...page.querySelectorAll<HTMLButtonElement>('.data-tabs button')]
      .find((candidate) => candidate.textContent?.trim() === label);
    if (!button) throw new Error(`Missing master-data section: ${label}`);
    button.click();
  }

  function submitFor(page: HTMLElement, selector: string): void {
    const input = page.querySelector(selector);
    const form = input?.closest('form');
    if (!form) throw new Error(`Missing form for ${selector}`);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  function enter(page: HTMLElement, selector: string, value: string): void {
    const input = page.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('loads the supported master-data catalogues', async () => {
    const pageHarness = await openPage();
    const schemaRequest = httpTesting.expectOne('/api/master/schema');
    expect(schemaRequest.request.headers.get('Authorization')).toBe('Bearer admin-token');
    schemaRequest.flush(schema());
    httpTesting.expectOne('/api/master/keywords').flush([
      {
        id: 'keyword-1',
        name: 'Angular',
        slug: 'angular',
        category_id: category.id,
        enabled: 1,
        created_at: '2026-10-20T12:00:00.000Z',
        updated_at: '2026-10-20T12:00:00.000Z',
      },
    ]);
    httpTesting.expectOne('/api/master/category-keywords').flush([]);
    httpTesting.expectOne('/api/master/categories/category-1/subscribers').flush({
      category_id: 'category-1',
      subscriber_count: 0,
    });
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Master data');
    expect(page.querySelector('tbody')?.textContent).toContain('Engineering');
    selectSection(page, 'Skills');
    pageHarness.detectChanges();
    expect(page.querySelector('tbody')?.textContent).toContain('TypeScript');
    selectSection(page, 'Locations');
    pageHarness.detectChanges();
    expect(page.querySelector('[aria-labelledby="cities-title"] tbody')?.textContent).toContain('Boston');
    selectSection(page, 'Keywords');
    pageHarness.detectChanges();
    expect(page.querySelector('tbody')?.textContent).toContain('Angular');
  });

  it('creates and refreshes a category, then creates a keyword and confirms its category link', async () => {
    const pageHarness = await openPage();
    flushInitialData();
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;
    enter(page, '#category-name', 'Design');
    enter(page, '#category-slug', 'design');
    (page.querySelector('#category-description') as HTMLInputElement).value = 'Product design';
    page.querySelector('#category-description')?.dispatchEvent(new Event('input', { bubbles: true }));
    submitFor(page, '#category-name');

    const createCategory = httpTesting.expectOne('/api/master/categories');
    expect(createCategory.request.method).toBe('POST');
    expect(createCategory.request.body).toEqual({
      name: 'Design',
      slug: 'design',
      description: 'Product design',
    });
    const design = { id: 'category-2', name: 'Design', slug: 'design', description: 'Product design' };
    createCategory.flush(design, { status: 201, statusText: 'Created' });
    httpTesting.expectOne('/api/master/schema').flush(schema({ categories: [category, design] }));
    httpTesting.expectOne('/api/master/categories/category-1/subscribers').flush({
      category_id: 'category-1',
      subscriber_count: 0,
    });
    httpTesting.expectOne('/api/master/categories/category-2/subscribers').flush({
      category_id: 'category-2',
      subscriber_count: 0,
    });
    httpTesting.expectOne('/api/master/keywords').flush([]);
    httpTesting.expectOne('/api/master/category-keywords').flush([]);
    pageHarness.detectChanges();

    selectSection(page, 'Keywords');
    pageHarness.detectChanges();
    enter(page, '#keyword-name', 'Figma');
    enter(page, '#keyword-slug', 'figma');
    const keywordCategory = page.querySelector('#keyword-category') as HTMLSelectElement;
    keywordCategory.value = design.id;
    keywordCategory.dispatchEvent(new Event('change', { bubbles: true }));
    submitFor(page, '#keyword-name');

    const createKeyword = httpTesting.expectOne('/api/master/keywords');
    expect(createKeyword.request.body).toEqual({
      name: 'Figma',
      slug: 'figma',
      category_id: design.id,
    });
    const keyword = {
      id: 'keyword-2',
      name: 'Figma',
      slug: 'figma',
      category_id: design.id,
      enabled: true,
    };
    createKeyword.flush(keyword, { status: 201, statusText: 'Created' });
    httpTesting.expectOne('/api/master/schema').flush(schema({ categories: [category, design] }));
    httpTesting.expectOne('/api/master/categories/category-1/subscribers').flush({
      category_id: 'category-1',
      subscriber_count: 0,
    });
    httpTesting.expectOne('/api/master/categories/category-2/subscribers').flush({
      category_id: 'category-2',
      subscriber_count: 0,
    });
    httpTesting.expectOne('/api/master/keywords').flush([{
      ...keyword,
      enabled: 1,
      created_at: '2026-10-20T12:00:00.000Z',
      updated_at: '2026-10-20T12:00:00.000Z',
    }]);
    httpTesting.expectOne('/api/master/category-keywords').flush([]);
    pageHarness.detectChanges();

    selectSection(page, 'Category-keyword links');
    pageHarness.detectChanges();
    const categorySelect = page.querySelector('#link-category') as HTMLSelectElement;
    categorySelect.value = design.id;
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    const keywordSelect = page.querySelector('#link-keyword') as HTMLSelectElement;
    keywordSelect.value = keyword.id;
    keywordSelect.dispatchEvent(new Event('change', { bubbles: true }));
    submitFor(page, '#link-category');

    const link = httpTesting.expectOne('/api/master/category-keywords');
    expect(link.request.body).toEqual({ category_id: design.id, keyword_id: keyword.id });
    link.flush({
      category_id: design.id,
      keyword_id: keyword.id,
      enabled: true,
    }, { status: 201, statusText: 'Created' });
    pageHarness.detectChanges();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('API confirmed the category-keyword link');
  });

  it('seeds a skill, country, and city through the supported bulk endpoints and refreshes data', async () => {
    const pageHarness = await openPage();
    flushInitialData(schema({ countries: [] }));
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;

    selectSection(page, 'Skills');
    pageHarness.detectChanges();
    enter(page, '#skill-name', 'Go');
    enter(page, '#skill-slug', 'go');
    submitFor(page, '#skill-name');
    const skillRequest = httpTesting.expectOne('/api/master/seed-skills');
    expect(skillRequest.request.body).toEqual({ skills: [{ name: 'Go', slug: 'go' }] });
    skillRequest.flush({ seeded: 1 });
    httpTesting.expectOne('/api/master/schema').flush(schema({ countries: [], skills: [{ id: 'skill-2', name: 'Go', slug: 'go' }] }));
    httpTesting.expectOne('/api/master/categories/category-1/subscribers').flush({
      category_id: 'category-1',
      subscriber_count: 0,
    });
    httpTesting.expectOne('/api/master/keywords').flush([]);
    httpTesting.expectOne('/api/master/category-keywords').flush([]);
    pageHarness.detectChanges();

    selectSection(page, 'Locations');
    pageHarness.detectChanges();
    enter(page, '#country-name', 'Canada');
    enter(page, '#country-code', 'CA');
    submitFor(page, '#country-name');
    const countryRequest = httpTesting.expectOne('/api/master/seed-countries');
    expect(countryRequest.request.body).toEqual({ countries: [{ name: 'Canada', code: 'CA' }] });
    countryRequest.flush({ seeded: 1 });
    const canada = { id: 'country-2', name: 'Canada', code: 'CA' };
    httpTesting.expectOne('/api/master/schema').flush(schema({ countries: [canada] }));
    httpTesting.expectOne('/api/master/categories/category-1/subscribers').flush({
      category_id: 'category-1',
      subscriber_count: 0,
    });
    httpTesting.expectOne('/api/master/keywords').flush([]);
    httpTesting.expectOne('/api/master/category-keywords').flush([]);
    pageHarness.detectChanges();

    enter(page, '#city-name', 'Toronto');
    const cityCountry = page.querySelector('#city-country') as HTMLSelectElement;
    cityCountry.value = canada.id;
    cityCountry.dispatchEvent(new Event('change', { bubbles: true }));
    submitFor(page, '#city-name');
    const cityRequest = httpTesting.expectOne('/api/master/seed-cities');
    expect(cityRequest.request.body).toEqual({ cities: [{ name: 'Toronto', country_id: canada.id }] });
    cityRequest.flush({ seeded: 1 });
    httpTesting.expectOne('/api/master/schema').flush(schema({
      countries: [canada],
      cities: [{ id: 'city-2', country_id: canada.id, name: 'Toronto' }],
    }));
    httpTesting.expectOne('/api/master/categories/category-1/subscribers').flush({
      category_id: 'category-1',
      subscriber_count: 0,
    });
    httpTesting.expectOne('/api/master/keywords').flush([]);
    httpTesting.expectOne('/api/master/category-keywords').flush([]);
    pageHarness.detectChanges();

    expect((pageHarness.routeNativeElement as HTMLElement).textContent).toContain('Toronto');
  });

  it('rejects malformed slugs before calling the API', async () => {
    const pageHarness = await openPage();
    flushInitialData();
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;
    enter(page, '#category-name', 'Bad category');
    enter(page, '#category-slug', 'Bad Slug');
    submitFor(page, '#category-name');
    pageHarness.detectChanges();

    expect(page.textContent).toContain('Use lowercase letters, numbers, and hyphens.');
    httpTesting.expectNone('/api/master/categories');
  });
});
