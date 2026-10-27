import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { JobListItem, JobListResponse } from '../../../core/models/api.models';
import { AuthSessionService } from '../../auth/data-access/auth-session.service';
import { JobSearchPage } from './job-search-page';

const job: JobListItem = {
  id: 'job-1',
  source_id: 'source-1',
  title: 'Frontend Engineer',
  organization: 'Example Co',
  job_url: 'https://example.com/jobs/1',
  description_text: null,
  allow_remote: 1,
  location: 'Berlin, Germany',
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
      schemas: [NO_ERRORS_SCHEMA],
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
    harness = await RouterTestingHarness.create('/jobs');
    harness.detectChanges();
    await harness.fixture.whenStable();
    if (url !== '/jobs') {
      await harness.navigateByUrl(url);
      harness.detectChanges();
      await harness.fixture.whenStable();
    }
    return harness;
  }

  it('shows loading feedback while jobs are being fetched', async () => {
    const pageHarness = await createPage();

    expect(pageHarness.routeNativeElement?.querySelector('[role="status"]')?.textContent)
      .toContain('Loading jobs');
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
  });

  it('does not render hero messages for signed-in users', async () => {
    TestBed.inject(AuthSessionService).setSession('access-token', {
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    const pageHarness = await createPage();
    const page = pageHarness.routeNativeElement as HTMLElement;
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));

    expect(page.textContent).not.toContain('Job discovery');
    expect(page.textContent).not.toContain('Find your next opportunity');
    expect(page.textContent).not.toContain('Explore roles from across the web');
    expect(page.textContent).not.toContain('Jobs match any categories you follow');
    expect(page.querySelector('.page-header')).toBeNull();
    expect(page.querySelector('.personalization-note')).toBeNull();
  });

  it('does not render hero messages for signed-out users', async () => {
    const pageHarness = await createPage();
    const page = pageHarness.routeNativeElement as HTMLElement;
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));

    expect(page.textContent).not.toContain('Job discovery');
    expect(page.textContent).not.toContain('Find your next opportunity');
    expect(page.textContent).not.toContain('Explore roles from across the web');
    expect(page.textContent).not.toContain('Jobs match any categories you follow');
    expect(page.querySelector('.page-header')).toBeNull();
  });

  it('still renders the results heading and result count', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([job]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('.results-heading')?.querySelector('.eyebrow')?.textContent)
      .toContain('Opportunities');
    expect(page.querySelector('#results-title')?.textContent).toContain('Search results');
    expect(page.querySelector('.result-count')?.textContent?.replace(/\s+/g, ' ').trim())
      .toBe('1 role');
    expect(page.querySelector('[role="status"]')).toBeNull();
  });

  it('renders returned jobs and the result count', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([job]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('table')).not.toBeNull();
    expect(page.querySelector('.result-count')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('1 role');
    expect(page.querySelector('[role="status"]')).toBeNull();
  });

  it('paginates using API metadata and preserves the search state', async () => {
    const pageHarness = await createPage(
      '/jobs?organization=Example%20Co&limit=2&sort=organization&sortDir=asc',
    );
    const firstRequest = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));
    expect(firstRequest.request.params.get('organization')).toBe('Example Co');
    expect(firstRequest.request.params.get('limit')).toBe('2');
    firstRequest.flush({
      ...listResponse([{ ...job, id: 'job-1' }, { ...job, id: 'job-2' }]),
      total: 5,
      limit: 2,
      hasMore: true,
    });
    pageHarness.detectChanges();

    let page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('table')).not.toBeNull();

    await pageHarness.navigateByUrl('/jobs?organization=Example%20Co&limit=2&offset=2&sort=organization&sortDir=asc');
    pageHarness.detectChanges();
    const request = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));
    expect(request.request.params.get('offset')).toBe('2');
    request.flush({
      ...listResponse([{ ...job, id: 'job-3' }, { ...job, id: 'job-4' }]),
      total: 5,
      limit: 2,
      offset: 2,
      hasMore: true,
    });
    pageHarness.detectChanges();

    page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('table')).not.toBeNull();
  });

  it('shows an empty state when the API returns no jobs', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('[role="status"] h3')?.textContent).toContain('No jobs found');
    expect(page.querySelector('table')).toBeNull();
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

    const request = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));
    expect(TestBed.inject(Router).url)
      .toBe('/jobs?organization=Example%20Co&salary_min=80000&salary_max=125000&sort=posted_at&sortDir=desc');
    expect(request.request.params.get('organization')).toBe('Example Co');
    expect(request.request.params.get('salary_min')).toBe('80000');
    expect(request.request.params.get('salary_max')).toBe('125000');
    request.flush(listResponse([job]));
    pageHarness.detectChanges();
    expect(page.querySelector('table')).not.toBeNull();
  });

  it('renders the geographic location in the Location column', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([job]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('th')?.textContent).toContain('Location');
    expect(page.querySelector('table')?.textContent).toContain('Berlin, Germany');
  });

  it('renders a dash when a job has no location', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([{ ...job, location: null }]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('table')?.textContent).toContain('-');
  });

  it('applies a trimmed location to the URL and API request', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const location = page.querySelector('#location') as HTMLInputElement;
    location.value = '  Paris  ';
    location.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('.apply-button') as HTMLButtonElement).click();
    await pageHarness.fixture.whenStable();
    pageHarness.detectChanges();

    const request = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));
    expect(TestBed.inject(Router).url).toBe('/jobs?location=Paris&sort=posted_at&sortDir=desc');
    expect(request.request.params.get('location')).toBe('Paris');
    request.flush(listResponse([job]));
    pageHarness.detectChanges();
  });

  it('restores location from route query parameters', async () => {
    const pageHarness = await createPage('/jobs?location=Berlin');
    const request = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));
    expect(request.request.params.get('location')).toBe('Berlin');
    expect((pageHarness.routeNativeElement?.querySelector('#location') as HTMLInputElement).value)
      .toBe('Berlin');
    request.flush(listResponse([]));
  });

  it('clearing filters clears the location input and URL param', async () => {
    const pageHarness = await createPage('/jobs?location=Berlin');
    httpTesting.expectOne((req) => req.url.startsWith('/api/jobs')).flush(listResponse([]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect((page.querySelector('#location') as HTMLInputElement).value).toBe('Berlin');
    (page.querySelector('.clear-button') as HTMLButtonElement).click();
    await pageHarness.fixture.whenStable();
    pageHarness.detectChanges();

    expect((page.querySelector('#location') as HTMLInputElement).value).toBe('');
    expect(TestBed.inject(Router).url).not.toContain('location=');
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
    httpTesting.expectNone((req) => req.url.startsWith('/api/jobs'));
  });

  it('resets the offset when search criteria change while preserving page size and sort', async () => {
    const pageHarness = await createPage(
      '/jobs?organization=Example%20Co&limit=10&offset=20&sort=organization&sortDir=asc',
    );
    httpTesting.expectOne((req) => req.url.startsWith('/api/jobs')).flush({
      ...listResponse([job]),
      total: 40,
      limit: 10,
      offset: 20,
      hasMore: true,
    });
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const organization = page.querySelector('#organization') as HTMLInputElement;
    organization.value = 'Other Company';
    organization.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('.apply-button') as HTMLButtonElement).click();
    await pageHarness.fixture.whenStable();
    pageHarness.detectChanges();

    const request = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));
    expect(request.request.params.get('organization')).toBe('Other Company');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.has('offset')).toBe(false);
    expect(request.request.params.get('sort')).toBe('organization');
    expect(request.request.params.get('sortDir')).toBe('asc');
    expect(TestBed.inject(Router).url).not.toContain('offset=');
    request.flush(listResponse([]));
  });

  it('applies verified sort options and sends the selected direction', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const sort = page.querySelector('#sort-by') as HTMLSelectElement;
    const direction = page.querySelector('#sort-direction') as HTMLSelectElement;
    expect([...sort.options].map((option) => option.value))
      .toEqual(['posted_at', 'date_posted', 'organization', 'title', 'location']);

    sort.value = 'organization';
    sort.dispatchEvent(new Event('change', { bubbles: true }));
    direction.value = 'asc';
    direction.dispatchEvent(new Event('change', { bubbles: true }));
    (page.querySelector('.apply-button') as HTMLButtonElement).click();
    await pageHarness.fixture.whenStable();
    pageHarness.detectChanges();

    const request = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));
    expect(request.request.params.get('sort')).toBe('organization');
    expect(request.request.params.get('sortDir')).toBe('asc');
    expect(TestBed.inject(Router).url).toContain('sort=organization&sortDir=asc');
    request.flush(listResponse([
      { ...job, id: 'job-a', organization: 'A Company' },
      { ...job, id: 'job-b', organization: 'B Company' },
    ]));
    pageHarness.detectChanges();
    expect(page.querySelector('table')).not.toBeNull();
  });

  it('ignores unsupported sort fields restored from the URL', async () => {
    const pageHarness = await createPage('/jobs?sort=salary_min&sortDir=asc');
    const request = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));

    expect(request.request.params.has('sort')).toBe(false);
    expect((pageHarness.routeNativeElement?.querySelector('#sort-by') as HTMLSelectElement).value)
      .toBe('posted_at');
    request.flush(listResponse([]));
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
    expect(page.querySelector('table')).not.toBeNull();
  });

  it('restores filters, pagination, and sort from route query parameters', async () => {
    const pageHarness = await createPage(
      '/jobs?organization=Example%20Co&salary_min=80000&limit=10&offset=20&sort=organization&sortDir=asc',
    );
    const request = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));

    expect(request.request.params.get('organization')).toBe('Example Co');
    expect(request.request.params.get('salary_min')).toBe('80000');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('offset')).toBe('20');
    expect(request.request.params.get('sort')).toBe('organization');
    expect(request.request.params.get('sortDir')).toBe('asc');
    expect((pageHarness.routeNativeElement?.querySelector('#organization') as HTMLInputElement).value)
      .toBe('Example Co');
    expect((pageHarness.routeNativeElement?.querySelector('#salary-min') as HTMLInputElement).value)
      .toBe('80000');
    expect((pageHarness.routeNativeElement?.querySelector('#sort-by') as HTMLSelectElement).value)
      .toBe('organization');
    expect((pageHarness.routeNativeElement?.querySelector('#sort-direction') as HTMLSelectElement).value)
      .toBe('asc');
    request.flush(listResponse([]));
  });

  it('reloads the search state when navigating to a different query URL', async () => {
    const pageHarness = await createPage();
    httpTesting.expectOne('/api/jobs').flush(listResponse([]));

    await pageHarness.navigateByUrl('/jobs?organization=Other%20Company&salary_max=100000');
    pageHarness.detectChanges();
    const request = httpTesting.expectOne((req) => req.url.startsWith('/api/jobs'));

    expect(request.request.params.get('organization')).toBe('Other Company');
    expect(request.request.params.get('salary_max')).toBe('100000');
    expect((pageHarness.routeNativeElement?.querySelector('#organization') as HTMLInputElement).value)
      .toBe('Other Company');
    request.flush(listResponse([]));
  });
});
