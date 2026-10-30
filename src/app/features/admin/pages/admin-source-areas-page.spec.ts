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
import {
  AdminGeographicArea,
  AdminSource,
  AdminSourceArea,
} from '../models/admin.models';
import { AdminSourceAreasPage } from './admin-source-areas-page';

const source: AdminSource = {
  id: 'source-1',
  name: 'Example source',
  code_id: 'ReziJobSource',
  type: 'api',
  working_mode: 'both',
  config: {},
  enabled: 1,
  last_run_at: null,
  next_run_at: null,
  created_at: '2026-10-20T12:00:00.000Z',
  updated_at: '2026-10-20T12:00:00.000Z',
};

const area: AdminGeographicArea = {
  id: 'area-1',
  name: 'Boston',
  definition: { bbox: [-71.2, 42.1, -70.9, 42.5], zoom: 9 },
  enabled: 1,
  created_at: '2026-10-20T12:00:00.000Z',
  updated_at: '2026-10-20T12:00:00.000Z',
};

const assignment: AdminSourceArea = {
  source_id: source.id,
  source_name: source.name,
  geographic_area_id: area.id,
  area_name: area.name,
  area_definition: area.definition,
  enabled: 1,
  last_run_at: null,
  next_run_at: null,
};

describe('AdminSourceAreasPage', () => {
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
        provideRouter([{ path: 'admin/assignments', component: AdminSourceAreasPage }]),
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
    harness = await RouterTestingHarness.create('/admin/assignments');
    harness.detectChanges();
    return harness;
  }

  function flushInitialData(assignments: AdminSourceArea[]): void {
    httpTesting.expectOne('/api/admin/sources').flush([source]);
    httpTesting.expectOne('/api/admin/geographic-areas').flush([area]);
    httpTesting.expectOne('/api/admin/areas').flush(assignments);
  }

  function choosePair(page: HTMLElement): void {
    const sourceSelect = page.querySelector('#assignment-source') as HTMLSelectElement;
    sourceSelect.value = source.id;
    sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const areaSelect = page.querySelector('#assignment-area') as HTMLSelectElement;
    areaSelect.value = area.id;
    areaSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('loads sources, areas, and existing assignments for the page', async () => {
    const pageHarness = await openPage();
    flushInitialData([assignment]);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Source-area assignments');
    expect(page.querySelector('tbody')?.textContent).toContain('Example source');
    expect(page.querySelector('tbody')?.textContent).toContain('Boston');
    expect(page.querySelector('tbody')?.textContent).toContain('Never');
  });

  it('creates a source-area link and refreshes the assignment list', async () => {
    const pageHarness = await openPage();
    flushInitialData([]);
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;
    choosePair(page);
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const create = httpTesting.expectOne('/api/admin/areas');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      source_id: source.id,
      geographic_area_id: area.id,
      enabled: true,
    });
    create.flush({
      source_id: source.id,
      geographic_area_id: area.id,
      enabled: true,
    }, { status: 201, statusText: 'Created' });
    httpTesting.expectOne('/api/admin/areas').flush([assignment]);
    pageHarness.detectChanges();

    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('tbody')?.textContent)
      .toContain('Boston');
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('[role="status"]')?.textContent)
      .toContain('Source-area link created.');
  });

  it('prevents duplicate links before sending a create request', async () => {
    const pageHarness = await openPage();
    flushInitialData([assignment]);
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;
    choosePair(page);
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    pageHarness.detectChanges();

    expect(page.querySelector('[role="alert"]')?.textContent)
      .toContain('This source is already linked to that area.');
    httpTesting.expectNone('/api/admin/areas');
  });

  it('unlinks a pair and refreshes the assignment list after success', async () => {
    const pageHarness = await openPage();
    flushInitialData([assignment]);
    pageHarness.detectChanges();
    ((pageHarness.routeNativeElement as HTMLElement).querySelector('.unlink-assignment') as HTMLButtonElement).click();

    const remove = httpTesting.expectOne(`/api/admin/areas/${source.id}/${area.id}`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ success: true });
    httpTesting.expectOne('/api/admin/areas').flush([]);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('tbody')).toBeNull();
    expect(page.textContent).toContain('No source-area assignments yet.');
    expect(page.querySelector('[role="status"]')?.textContent)
      .toContain('Unlinked Example source from Boston.');
  });

  it('preserves an assignment and shows an API error when unlinking fails', async () => {
    const pageHarness = await openPage();
    flushInitialData([assignment]);
    pageHarness.detectChanges();
    ((pageHarness.routeNativeElement as HTMLElement).querySelector('.unlink-assignment') as HTMLButtonElement).click();
    httpTesting.expectOne(`/api/admin/areas/${source.id}/${area.id}`).flush(
      { error: 'Assignment could not be removed' },
      { status: 409, statusText: 'Conflict' },
    );
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Assignment could not be removed');
    expect(page.querySelector('tbody')?.textContent).toContain('Boston');
    expect(page.querySelector('[role="status"]')).toBeNull();
  });
});
