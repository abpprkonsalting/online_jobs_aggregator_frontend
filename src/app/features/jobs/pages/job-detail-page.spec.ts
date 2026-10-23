import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { JobDetail } from '../../../core/models/api.models';
import { routes } from '../../../app.routes';
import { AuthSessionService } from '../../auth/data-access/auth-session.service';

const detail: JobDetail = {
  id: 'job-1',
  source_id: 'source-1',
  title: 'Frontend Engineer',
  organization: 'Example Co',
  job_url: 'https://example.com/jobs/1',
  description_text: 'Build accessible interfaces.\nWork with the design team.\n<img src=x onerror=alert(1)>',
  allow_remote: 1,
  salary_min: '90000.00',
  salary_max: '120000.00',
  salary_currency: 'USD',
  salary_unit: 'YEAR',
  date_posted: null,
  posted_at: '2026-10-20T12:00:00.000Z',
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
    raw_text: 'Boston, United States',
    city_name: null,
    country_id: null,
    country_name: null,
  }],
  days_waiting: 1,
};

describe('JobDetailPage', () => {
  let httpTesting: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        {
          provide: AuthSessionService,
          useValue: {
            isAuthenticated: () => true,
            currentUser: () => ({ id: 'user-1', email: 'user@example.com', role: 'user' }),
          },
        },
        provideRouter(routes),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  async function openJob(path = '/jobs/job-1') {
    harness = await RouterTestingHarness.create(path);
    harness.detectChanges();
    return harness;
  }

  it('loads a job by direct URL and renders its verified detail fields', async () => {
    const pageHarness = await openJob();
    const request = httpTesting.expectOne('/api/jobs/job-1');
    expect(request.request.method).toBe('GET');
    request.flush(detail);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Frontend Engineer');
    expect(page.querySelector('.organization')?.textContent).toBe('Example Co');
    expect(page.querySelector('.job-facts')?.textContent).toContain('Remote');
    expect(page.querySelector('.job-facts')?.textContent).toContain('Posted');
    expect(page.querySelector('.job-facts')?.textContent).toContain('Waiting 1 day');
    expect(page.querySelector('.description')?.textContent).toContain('Work with the design team.');
    expect(page.querySelector('.description')?.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(page.querySelector('.description img')).toBeNull();
    expect(page.querySelector('.detail-grid')?.textContent).toContain('90,000–120,000 USD per year');
    expect(page.querySelector('.detail-grid')?.textContent).toContain('Boston, United States');
    expect(page.querySelector('.detail-grid')?.textContent).toContain('Engineering');
    expect(page.querySelector('.detail-grid')?.textContent).toContain('TypeScript');

    const originalLink = page.querySelector('.original-link') as HTMLAnchorElement;
    expect(originalLink.href).toBe(detail.job_url);
    expect(originalLink.target).toBe('_blank');
    expect(originalLink.rel).toContain('noopener');
    expect(TestBed.inject(Router).url).toBe('/jobs/job-1');
  });

  it('shows a not-found state when the API reports a missing job', async () => {
    const pageHarness = await openJob('/jobs/missing-job');
    httpTesting.expectOne('/api/jobs/missing-job').flush(
      { error: 'Job not found' },
      { status: 404, statusText: 'Not Found' },
    );
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('[role="status"] h1')?.textContent).toBe('Job not found');
    expect(page.textContent).toContain('Back to job search');
    expect(page.querySelector('.original-link')).toBeNull();
  });

  it('allows retrying after a detail request fails', async () => {
    const pageHarness = await openJob();
    httpTesting.expectOne('/api/jobs/job-1').flush(
      { error: 'Job service unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Job service unavailable');
    (page.querySelector('.retry-button') as HTMLButtonElement).click();
    pageHarness.detectChanges();

    const retryRequest = httpTesting.expectOne('/api/jobs/job-1');
    retryRequest.flush(detail);
    pageHarness.detectChanges();
    expect(page.querySelector('h1')?.textContent).toContain('Frontend Engineer');
  });

  it('handles missing optional detail fields without rendering fabricated values', async () => {
    const pageHarness = await openJob();
    httpTesting.expectOne('/api/jobs/job-1').flush({
      ...detail,
      organization: null,
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
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('.organization')?.textContent).toBe('Organization not listed');
    expect(page.querySelector('.description')).toBeNull();
    expect(page.querySelector('.detail-grid')?.textContent).toContain('Salary information is not available.');
    expect(page.querySelector('.detail-grid')?.textContent).toContain('Location information is not available.');
    expect(page.querySelector('.detail-grid')?.textContent).toContain('No categories are listed.');
    expect(page.querySelector('.detail-grid')?.textContent).toContain('No skills are listed.');
    expect(page.querySelector('.job-facts')?.textContent).not.toContain('Posted');
  });
});
