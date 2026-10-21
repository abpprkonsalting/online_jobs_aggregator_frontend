import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
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
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        provideRouter([{ path: 'jobs', component: JobSearchPage }]),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  async function createPage(url = '/jobs') {
    harness = await RouterTestingHarness.create(url);
    harness.detectChanges();
    return harness;
  }

  it('shows loading feedback while jobs are being fetched', async () => {
    const pageHarness = await createPage();

    expect(pageHarness.routeNativeElement?.querySelector('[role="status"]')?.textContent)
      .toContain('Loading jobs');
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
  });

  it('renders returned jobs and the result count', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([job]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('app-job-result-card h2')?.textContent).toContain('Frontend Engineer');
    expect(page.querySelector('.result-count')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('1 role');
    expect(page.querySelector('[role="status"]')).toBeNull();
  });

  it('shows an empty state when the API returns no jobs', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('[role="status"] h3')?.textContent).toContain('No jobs found');
    expect(page.querySelector('app-job-result-card')).toBeNull();
  });

  it('applies a trimmed organization and validated salary range to the URL and API request', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const organization = page.querySelector('#organization') as HTMLInputElement;
    const salaryMinimum = page.querySelector('#salary-min') as HTMLInputElement;
    const salaryMaximum = page.querySelector('#salary-max') as HTMLInputElement;
    organization.value = ' Example Co ';
    organization.dispatchEvent(new Event('input', { bubbles: true }));
    salaryMinimum.value = '80000';
    salaryMinimum.dispatchEvent(new Event('input', { bubbles: true }));
    salaryMaximum.value = '125000';
    salaryMaximum.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('.apply-button') as HTMLButtonElement).click();
    await pageHarness.fixture.whenStable();
    pageHarness.detectChanges();

    const request = httpTesting.expectOne((req) => req.url === '/api/jobs');
    expect(TestBed.inject(Router).url).toBe('/jobs?organization=Example%20Co&salary_min=80000&salary_max=125000');
    expect(request.request.params.get('organization')).toBe('Example Co');
    expect(request.request.params.get('salary_min')).toBe('80000');
    expect(request.request.params.get('salary_max')).toBe('125000');
    request.flush(listResponse([job]));
    pageHarness.detectChanges();
    expect(page.querySelector('app-job-result-card h2')?.textContent).toContain('Frontend Engineer');
  });

  it('rejects an invalid salary range without sending a request', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const salaryMinimum = page.querySelector('#salary-min') as HTMLInputElement;
    const salaryMaximum = page.querySelector('#salary-max') as HTMLInputElement;
    salaryMinimum.value = '120000';
    salaryMinimum.dispatchEvent(new Event('input', { bubbles: true }));
    salaryMaximum.value = '80000';
    salaryMaximum.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('.apply-button') as HTMLButtonElement).click();
    pageHarness.detectChanges();

    expect(page.querySelector('[role="alert"]')?.textContent)
      .toContain('Minimum salary must not exceed maximum salary');
    httpTesting.expectNone((req) => req.url === '/api/jobs');
  });

  it('shows an API error and retries the request when requested', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(
      { error: 'Job service unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Job service unavailable');

    (page.querySelector('.retry-button') as HTMLButtonElement).click();
    pageHarness.detectChanges();
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Loading jobs');

    httpTesting.expectOne('/api/jobs').flush(listResponse([job]));
    pageHarness.detectChanges();
    expect(page.querySelector('app-job-result-card h2')?.textContent).toContain('Frontend Engineer');
  });

  it('restores filters, pagination, and sort from route query parameters', async () => {
    const pageHarness = await createPage(
      '/jobs?organization=Example%20Co&salary_min=80000&limit=10&offset=20&sort=title&sortDir=asc',
    );
    const request = httpTesting.expectOne((req) => req.url === '/api/jobs');

    expect(request.request.params.get('organization')).toBe('Example Co');
    expect(request.request.params.get('salary_min')).toBe('80000');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('offset')).toBe('20');
    expect(request.request.params.get('sort')).toBe('title');
    expect(request.request.params.get('sortDir')).toBe('asc');
    expect((pageHarness.routeNativeElement?.querySelector('#organization') as HTMLInputElement).value)
      .toBe('Example Co');
    expect((pageHarness.routeNativeElement?.querySelector('#salary-min') as HTMLInputElement).value)
      .toBe('80000');
    request.flush(listResponse([]));
  });

  it('reloads the search state when navigating to a different query URL', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));

    await pageHarness.navigateByUrl('/jobs?organization=Other%20Company&salary_max=100000');
    pageHarness.detectChanges();
    const request = httpTesting.expectOne((req) => req.url === '/api/jobs');

    expect(request.request.params.get('organization')).toBe('Other Company');
    expect(request.request.params.get('salary_max')).toBe('100000');
    expect((pageHarness.routeNativeElement?.querySelector('#organization') as HTMLInputElement).value)
      .toBe('Other Company');
    request.flush(listResponse([]));
  });
});
