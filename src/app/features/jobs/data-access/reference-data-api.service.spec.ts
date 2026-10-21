import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Category, City, Country, Skill, Source } from '../../../core/models/api.models';
import { JobsApiService } from './jobs-api.service';
import { ReferenceDataApiService } from './reference-data-api.service';
import { ReferenceDataStore } from './reference-data.store';

describe('ReferenceDataApiService', () => {
  let service: ReferenceDataApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        ReferenceDataApiService,
      ],
    });

    service = TestBed.inject(ReferenceDataApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads categories from the confirmed public endpoint', () => {
    const categories: Category[] = [{ id: 'category-1', name: 'Engineering', slug: 'engineering', description: null }];
    let response: Category[] | undefined;

    service.getCategories().subscribe((value) => (response = value));

    const request = httpTesting.expectOne('/api/categories');
    expect(request.request.method).toBe('GET');
    request.flush(categories);
    expect(response).toEqual(categories);
  });

  it('loads skills from the confirmed public endpoint', () => {
    const skills: Skill[] = [{ id: 'skill-1', name: 'TypeScript', slug: 'typescript' }];
    let response: Skill[] | undefined;

    service.getSkills().subscribe((value) => (response = value));

    httpTesting.expectOne('/api/skills').flush(skills);
    expect(response).toEqual(skills);
  });

  it('loads cities from the confirmed public endpoint', () => {
    const cities: City[] = [{ id: 'city-1', country_id: 'country-1', name: 'Boston' }];
    let response: City[] | undefined;

    service.getCities().subscribe((value) => (response = value));

    httpTesting.expectOne('/api/cities').flush(cities);
    expect(response).toEqual(cities);
  });

  it('loads countries from the confirmed public endpoint', () => {
    const countries: Country[] = [{ id: 'country-1', name: 'United States', code: 'US' }];
    let response: Country[] | undefined;

    service.getCountries().subscribe((value) => (response = value));

    httpTesting.expectOne('/api/countries').flush(countries);
    expect(response).toEqual(countries);
  });

  it('loads sources from the confirmed authenticated endpoint', () => {
    const sources: Source[] = [{
      id: 'source-1',
      name: 'Example source',
      type: 'api',
      working_mode: 'both',
      enabled: 1,
    }];
    let response: Source[] | undefined;

    service.getSources().subscribe((value) => (response = value));

    const request = httpTesting.expectOne('/api/admin/sources');
    expect(request.request.method).toBe('GET');
    request.flush(sources);
    expect(response).toEqual(sources);
  });
});

describe('ReferenceDataStore', () => {
  let store: ReferenceDataStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        JobsApiService,
        ReferenceDataApiService,
        ReferenceDataStore,
      ],
    });

    store = TestBed.inject(ReferenceDataStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('tracks reference requests independently so failures do not block job requests', () => {
    store.loadCategories();
    expect(store.categories()).toEqual({ status: 'loading' });

    store.loadSkills();
    expect(store.skills()).toEqual({ status: 'loading' });

    let jobsLoaded = false;
    TestBed.inject(JobsApiService).list().subscribe(() => (jobsLoaded = true));

    httpTesting.expectOne('/api/categories').flush(
      { error: 'Category service unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    httpTesting.expectOne('/api/skills').flush([]);
    httpTesting.expectOne('/api/jobs').flush({
      jobs: [],
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false,
    });

    expect(store.categories().status).toBe('error');
    expect(store.skills()).toEqual({ status: 'loaded', value: [] });
    expect(jobsLoaded).toBe(true);
  });
});
