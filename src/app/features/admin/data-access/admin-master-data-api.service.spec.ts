import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { ApiError } from '../../../core/http/api-error';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AdminMasterDataApiService } from './admin-master-data-api.service';

describe('AdminMasterDataApiService', () => {
  let service: AdminMasterDataApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        AdminMasterDataApiService,
      ],
    });

    service = TestBed.inject(AdminMasterDataApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads master schema and keywords from their supported endpoints', () => {
    service.getSchema().subscribe();
    const schema = httpTesting.expectOne('/api/master/schema');
    expect(schema.request.method).toBe('GET');
    schema.flush({ countries: [], cities: [], skills: [], categories: [], geographic_areas: [] });

    service.getKeywords().subscribe();
    const keywords = httpTesting.expectOne('/api/master/keywords');
    expect(keywords.request.method).toBe('GET');
    keywords.flush([]);
  });

  it('creates categories and keywords using the backend request fields', () => {
    const category = { name: 'Engineering', slug: 'engineering', description: 'Build things' };
    service.createCategory(category).subscribe();
    const createCategory = httpTesting.expectOne('/api/master/categories');
    expect(createCategory.request.method).toBe('POST');
    expect(createCategory.request.body).toEqual(category);
    createCategory.flush({ id: 'category-1', ...category }, { status: 201, statusText: 'Created' });

    const keyword = { name: 'Angular', slug: 'angular', category_id: 'category-1', enabled: true };
    service.createKeyword(keyword).subscribe();
    const createKeyword = httpTesting.expectOne('/api/master/keywords');
    expect(createKeyword.request.method).toBe('POST');
    expect(createKeyword.request.body).toEqual(keyword);
    createKeyword.flush({ id: 'keyword-1', ...keyword }, { status: 201, statusText: 'Created' });
  });

  it('seeds one or more skills, countries, and cities with their documented arrays', () => {
    service.seedSkills({ skills: [{ name: 'TypeScript', slug: 'typescript' }] }).subscribe();
    const skills = httpTesting.expectOne('/api/master/seed-skills');
    expect(skills.request.method).toBe('POST');
    expect(skills.request.body).toEqual({ skills: [{ name: 'TypeScript', slug: 'typescript' }] });
    skills.flush({ seeded: 1 });

    service.seedCountries({ countries: [{ name: 'United States', code: 'US' }] }).subscribe();
    const countries = httpTesting.expectOne('/api/master/seed-countries');
    expect(countries.request.body).toEqual({ countries: [{ name: 'United States', code: 'US' }] });
    countries.flush({ seeded: 1 });

    service.seedCities({ cities: [{ name: 'Boston', country_id: 'country-1' }] }).subscribe();
    const cities = httpTesting.expectOne('/api/master/seed-cities');
    expect(cities.request.body).toEqual({ cities: [{ name: 'Boston', country_id: 'country-1' }] });
    cities.flush({ seeded: 1 });
  });

  it('creates category-keyword links and preserves permission errors', () => {
    const link = {
      category_id: 'category-1',
      keyword_id: 'keyword-1',
      weight: 0.8,
      enabled: true,
    };
    let actualError: unknown;
    service.createCategoryKeyword(link).subscribe({
      error: (error: unknown) => (actualError = error),
    });
    const request = httpTesting.expectOne('/api/master/category-keywords');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(link);
    request.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({ kind: 'forbidden', status: 403 });
  });
});
