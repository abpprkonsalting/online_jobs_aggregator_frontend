import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { JobListItem, JobListResponse } from '../../../core/models/api.models';
import { JobSearchPage } from './job-search-page';

const job: JobListItem = {
  id: 'job-1',
  source_id: 'source-1',
  title: 'Frontend Engineer',
  organization: 'Example Co',
  job_url: 'https://example.com/jobs/1',
  description_text: null,
  allow_remote: 1,
  salary_min: '90000.00',
  salary_max: '120000.00',
  salary_currency: 'USD',
  salary_unit: 'year',
  date_posted: null,
  posted_at: '2026-10-20T12:00:00.000Z',
};

function listResponse(jobs: JobListItem[]): JobListResponse {
  return {
    jobs,
    total: jobs.length,
    limit: 20,
    offset: 0,
    hasMore: false,
  };
}

describe('JobSearchPage', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobSearchPage],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function createPage() {
    const fixture = TestBed.createComponent(JobSearchPage);
    fixture.detectChanges();
    return fixture;
  }

  it('shows loading feedback while jobs are being fetched', () => {
    const fixture = createPage();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent)
      .toContain('Loading jobs');
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
  });

  it('renders returned jobs and the result count', () => {
    const fixture = createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([job]));
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('app-job-result-card h2')?.textContent).toContain('Frontend Engineer');
    expect(page.querySelector('.result-count')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('1 role');
    expect(page.querySelector('[role="status"]')).toBeNull();
  });

  it('shows an empty state when the API returns no jobs', () => {
    const fixture = createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="status"] h3')?.textContent).toContain('No jobs found');
    expect(page.querySelector('app-job-result-card')).toBeNull();
  });

  it('shows an API error and retries the request when requested', () => {
    const fixture = createPage();
    httpTesting.expectOne('/api/jobs').flush(
      { error: 'Job service unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Job service unavailable');

    (page.querySelector('.retry-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Loading jobs');

    httpTesting.expectOne('/api/jobs').flush(listResponse([job]));
    fixture.detectChanges();
    expect(page.querySelector('app-job-result-card h2')?.textContent).toContain('Frontend Engineer');
  });
});
