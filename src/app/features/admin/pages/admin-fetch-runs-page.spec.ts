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
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminFetchRun } from '../models/admin.models';
import { AdminFetchRunsPage } from './admin-fetch-runs-page';

const runs: AdminFetchRun[] = [
  {
    id: 'run-running',
    source_id: 'source-1',
    status: 'running',
    started_at: '2026-10-21T10:00:00.000Z',
    finished_at: null,
    jobs_found: 0,
    jobs_saved_new: 0,
    jobs_saved_updated: 0,
    error_message: null,
    metadata: null,
    warnings: null,
    created_at: '2026-10-21T10:00:00.000Z',
    updated_at: '2026-10-21T10:00:00.000Z',
  },
  {
    id: 'run-success',
    source_id: 'source-2',
    status: 'success',
    started_at: '2026-10-21T09:00:00.000Z',
    finished_at: '2026-10-21T09:05:00.000Z',
    jobs_found: 12,
    jobs_saved_new: 8,
    jobs_saved_updated: 4,
    error_message: null,
    metadata: { batch: 'daily' },
    warnings: ['One posting had no location.'],
    created_at: '2026-10-21T09:00:00.000Z',
    updated_at: '2026-10-21T09:05:00.000Z',
  },
  {
    id: 'run-failed',
    source_id: null,
    status: 'failed',
    started_at: '2026-10-21T08:00:00.000Z',
    finished_at: '2026-10-21T08:01:00.000Z',
    jobs_found: 0,
    jobs_saved_new: 0,
    jobs_saved_updated: 0,
    error_message: 'Source timed out.',
    metadata: null,
    warnings: [],
    created_at: '2026-10-21T08:00:00.000Z',
    updated_at: '2026-10-21T08:01:00.000Z',
  },
];

describe('AdminFetchRunsPage', () => {
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
        AdminApiService,
        provideRouter([{ path: 'admin/fetch-runs', component: AdminFetchRunsPage }]),
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
    harness = await RouterTestingHarness.create('/admin/fetch-runs');
    harness.detectChanges();
    return harness;
  }

  it('displays running, successful, and failed fetches with counts and details', async () => {
    const pageHarness = await openPage();
    const request = httpTesting.expectOne('/api/admin/fetch-runs');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    expect(request.request.headers.get('Authorization')).toBe('Bearer admin-token');
    request.flush(runs);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelectorAll('.status-badge').length).toBe(3);
    expect(page.querySelector('.status-badge.running')?.textContent).toContain('running');
    expect(page.querySelector('.status-badge.success')?.textContent).toContain('success');
    expect(page.querySelector('.status-badge.failed')?.textContent).toContain('failed');
    expect(page.querySelector('tbody')?.textContent).toContain('In progress');
    expect(page.querySelector('tbody')?.textContent).toContain('12');
    expect(page.querySelector('tbody')?.textContent).toContain('8');
    expect(page.querySelector('tbody')?.textContent).toContain('4');
    expect(page.querySelector('tbody')?.textContent).toContain('One posting had no location.');
    expect(page.querySelector('tbody')?.textContent).toContain('Source timed out.');
  });

  it('shows an empty state when no fetches have been recorded', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/fetch-runs').flush([]);
    pageHarness.detectChanges();

    expect((pageHarness.routeNativeElement as HTMLElement).textContent)
      .toContain('No fetch runs have been recorded.');
  });

  it('surfaces API errors and retries the complete history request', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/fetch-runs').flush(
      { error: 'Fetch history unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    pageHarness.detectChanges();
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent)
      .toContain('Fetch history unavailable');

    const buttons = Array.from(
      (pageHarness.routeNativeElement as HTMLElement).querySelectorAll('button'),
    );
    const refreshButton = buttons.find((b) => b.textContent?.includes('Refresh'));
    (refreshButton as HTMLButtonElement).click();
    httpTesting.expectOne('/api/admin/fetch-runs').flush([]);
    pageHarness.detectChanges();
    expect((pageHarness.routeNativeElement as HTMLElement).textContent)
      .toContain('No fetch runs have been recorded.');
  });
});
