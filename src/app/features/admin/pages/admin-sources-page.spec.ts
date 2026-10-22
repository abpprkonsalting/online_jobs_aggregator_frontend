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
import { AdminSource } from '../models/admin.models';
import { AdminSourcesPage } from './admin-sources-page';

const source: AdminSource = {
  id: 'source-1',
  name: 'Example source',
  type: 'api',
  working_mode: 'both',
  config: { endpoint: 'https://example.com/jobs' },
  enabled: 1,
  last_run_at: null,
  next_run_at: null,
  created_at: '2026-10-20T12:00:00.000Z',
  updated_at: '2026-10-20T12:00:00.000Z',
};

describe('AdminSourcesPage', () => {
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
        provideRouter([{ path: 'admin/sources', component: AdminSourcesPage }]),
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
    harness = await RouterTestingHarness.create('/admin/sources');
    harness.detectChanges();
    return harness;
  }

  it('loads and displays source details', async () => {
    const pageHarness = await openPage();
    const request = httpTesting.expectOne('/api/admin/sources');
    expect(request.request.headers.get('Authorization')).toBe('Bearer admin-token');
    request.flush([source]);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Job sources');
    expect(page.querySelector('tbody')?.textContent).toContain('Example source');
    expect(page.querySelector('tbody')?.textContent).toContain('api');
    expect(page.querySelector('tbody')?.textContent).toContain('Enabled');
  });

  it('creates a source using the verified API body and reloads the list', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/sources').flush([]);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    (page.querySelector('#source-name') as HTMLInputElement).value = 'New source';
    page.querySelector('#source-name')?.dispatchEvent(new Event('input', { bubbles: true }));
    const type = page.querySelector('#source-type') as HTMLSelectElement;
    type.value = 'scrape';
    type.dispatchEvent(new Event('change', { bubbles: true }));
    const mode = page.querySelector('#working-mode') as HTMLSelectElement;
    mode.value = 'proactive';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    const config = page.querySelector('#source-config') as HTMLTextAreaElement;
    config.value = '{"url":"https://example.com/jobs","headers":{"x-test":"yes"}}';
    config.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const create = httpTesting.expectOne('/api/admin/sources');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      name: 'New source',
      type: 'scrape',
      working_mode: 'proactive',
      config: { url: 'https://example.com/jobs', headers: { 'x-test': 'yes' } },
      enabled: true,
    });
    const created = { ...source, id: 'source-2', name: 'New source', type: 'scrape' as const, working_mode: 'proactive' as const };
    create.flush(created, { status: 201, statusText: 'Created' });
    httpTesting.expectOne('/api/admin/sources').flush([created]);
    pageHarness.detectChanges();

    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('tbody')?.textContent)
      .toContain('New source');
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('[role="status"]')?.textContent)
      .toContain('Created New source');
  });

  it('edits source configuration and fields, while keeping type immutable', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/sources').flush([source]);
    pageHarness.detectChanges();
    ((pageHarness.routeNativeElement as HTMLElement).querySelector('.edit-source') as HTMLButtonElement).click();
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const type = page.querySelector('#source-type') as HTMLSelectElement;
    expect(type.disabled).toBe(true);
    expect(page.textContent).toContain('does not support changing a saved source’s type');

    const name = page.querySelector('#source-name') as HTMLInputElement;
    name.value = 'Updated source';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const enabled = page.querySelector('#source-enabled') as HTMLSelectElement;
    enabled.value = enabled.options[1].value;
    enabled.dispatchEvent(new Event('change', { bubbles: true }));
    const config = page.querySelector('#source-config') as HTMLTextAreaElement;
    config.value = '{"endpoint":"https://example.com/updated","limit":25}';
    config.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const update = httpTesting.expectOne('/api/admin/sources/source-1');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({
      name: 'Updated source',
      working_mode: 'both',
      config: { endpoint: 'https://example.com/updated', limit: 25 },
      enabled: false,
    });
    const updated = { ...source, name: 'Updated source', enabled: 0, config: { endpoint: 'https://example.com/updated', limit: 25 } };
    update.flush(updated);
    httpTesting.expectOne('/api/admin/sources').flush([updated]);
    pageHarness.detectChanges();
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('tbody')?.textContent)
      .toContain('Updated source');
  });

  it('rejects invalid or non-object configuration without sending a request', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/sources').flush([]);
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;
    (page.querySelector('#source-name') as HTMLInputElement).value = 'Invalid source';
    page.querySelector('#source-name')?.dispatchEvent(new Event('input', { bubbles: true }));
    const config = page.querySelector('#source-config') as HTMLTextAreaElement;
    config.value = '[]';
    config.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    pageHarness.detectChanges();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Configuration must be a JSON object.');
    httpTesting.expectNone('/api/admin/sources');
  });

  it('reports API errors and does not change the source list on failed updates', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/sources').flush([source]);
    pageHarness.detectChanges();
    ((pageHarness.routeNativeElement as HTMLElement).querySelector('.edit-source') as HTMLButtonElement).click();
    pageHarness.detectChanges();
    (pageHarness.routeNativeElement as HTMLElement).querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    httpTesting.expectOne('/api/admin/sources/source-1').flush(
      { error: 'Source name already exists' },
      { status: 409, statusText: 'Conflict' },
    );
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Source name already exists');
    expect(page.querySelector('tbody')?.textContent).toContain('Example source');
  });
});
