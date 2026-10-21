import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { JobDetail, JobListResponse } from '../../../core/models/api.models';
import { JobsApiService } from './jobs-api.service';

describe('JobsApiService', () => {
  let service: JobsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        JobsApiService,
      ],
    });

    service = TestBed.inject(JobsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('requests a jobs page and returns the list response', () => {
    const response: JobListResponse = {
      jobs: [
        {
          id: 'job-1',
          source_id: 'source-1',
          title: 'Frontend Engineer',
          organization: 'Example Co',
          job_url: 'https://example.com/jobs/1',
          description_text: null,
          allow_remote: 1,
          salary_min: '90000.00',
          salary_max: null,
          salary_currency: 'USD',
          salary_unit: 'year',
          date_posted: null,
          posted_at: '2026-10-20T12:00:00.000Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
      hasMore: false,
    };
    let actualResponse: JobListResponse | undefined;

    service.list().subscribe((value) => (actualResponse = value));

    const request = httpTesting.expectOne('/api/jobs');
    expect(request.request.method).toBe('GET');
    request.flush(response);

    expect(actualResponse).toEqual(response);
  });

  it('serializes supported pagination, sorting, and filter options', () => {
    service.list({
      limit: 25,
      offset: 50,
      sort: 'salary_min',
      sortDir: 'asc',
      salary_min: 65000,
      salary_max: 120000,
      organization: 'Example Co',
    }).subscribe();

    const request = httpTesting.expectOne((req) => req.url === '/api/jobs');
    expect(request.request.params.keys()).toEqual([
      'limit',
      'offset',
      'sort',
      'sortDir',
      'salary_min',
      'salary_max',
      'organization',
    ]);
    expect(request.request.params.get('limit')).toBe('25');
    expect(request.request.params.get('offset')).toBe('50');
    expect(request.request.params.get('sort')).toBe('salary_min');
    expect(request.request.params.get('sortDir')).toBe('asc');
    expect(request.request.params.get('salary_min')).toBe('65000');
    expect(request.request.params.get('salary_max')).toBe('120000');
    expect(request.request.params.get('organization')).toBe('Example Co');
    request.flush({ jobs: [], total: 0, limit: 25, offset: 50, hasMore: false });
  });

  it('serializes an explicit zero offset without adding missing options', () => {
    service.list({ offset: 0 }).subscribe();

    const request = httpTesting.expectOne('/api/jobs?offset=0');
    expect(request.request.params.keys()).toEqual(['offset']);
    request.flush({ jobs: [], total: 0, limit: 20, offset: 0, hasMore: false });
  });

  it('requests a job detail and returns its related data', () => {
    const response: JobDetail = {
      id: 'job-1',
      source_id: 'source-1',
      title: 'Frontend Engineer',
      organization: 'Example Co',
      job_url: 'https://example.com/jobs/1',
      description_text: 'Build accessible interfaces.',
      allow_remote: null,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      salary_unit: null,
      date_posted: null,
      posted_at: null,
      skills: [{ id: 'skill-1', name: 'TypeScript', slug: 'typescript' }],
      categories: [{
        id: 'category-1',
        name: 'Engineering',
        slug: 'engineering',
        classification_confidence: '0.95',
      }],
      locations: [{
        id: 'location-1',
        city_id: null,
        raw_text: 'Remote',
        city_name: null,
        country_id: null,
        country_name: null,
      }],
      days_waiting: null,
    };
    let actualResponse: JobDetail | undefined;

    service.getById('job-1').subscribe((value) => (actualResponse = value));

    const request = httpTesting.expectOne('/api/jobs/job-1');
    expect(request.request.method).toBe('GET');
    request.flush(response);

    expect(actualResponse).toEqual(response);
  });

  it('encodes the job id as one path segment', () => {
    service.getById('job/id ?#').subscribe();

    const request = httpTesting.expectOne('/api/jobs/job%2Fid%20%3F%23');
    request.flush({
      id: 'job/id ?#',
      source_id: 'source-1',
      title: 'Encoded ID job',
      organization: null,
      job_url: 'https://example.com/jobs/encoded',
      description_text: null,
      allow_remote: null,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      salary_unit: null,
      date_posted: null,
      posted_at: null,
      skills: [],
      categories: [],
      locations: [],
      days_waiting: null,
    });
  });
});
