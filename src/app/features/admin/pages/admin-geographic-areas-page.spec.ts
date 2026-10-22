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
import { AdminGeographicArea } from '../models/admin.models';
import { AdminGeographicAreasPage } from './admin-geographic-areas-page';

const area: AdminGeographicArea = {
  id: 'area-1',
  name: 'Boston',
  definition: {
    bbox: [-71.2, 42.1, -70.9, 42.5],
    zoom: 9,
  },
  enabled: 1,
  created_at: '2026-10-20T12:00:00.000Z',
  updated_at: '2026-10-20T12:00:00.000Z',
};

describe('AdminGeographicAreasPage', () => {
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
        provideRouter([{ path: 'admin/geographic-areas', component: AdminGeographicAreasPage }]),
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
    harness = await RouterTestingHarness.create('/admin/geographic-areas');
    harness.detectChanges();
    return harness;
  }

  function fillAreaForm(page: HTMLElement): void {
    const fields: [string, string][] = [
      ['#area-name', 'Boston area'],
      ['#min-longitude', '-71.2'],
      ['#min-latitude', '42.1'],
      ['#max-longitude', '-70.9'],
      ['#max-latitude', '42.5'],
      ['#area-zoom', '9'],
    ];
    for (const [selector, value] of fields) {
      const input = page.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  it('loads areas and displays the stored bounding box and zoom', async () => {
    const pageHarness = await openPage();
    const request = httpTesting.expectOne('/api/admin/geographic-areas');
    expect(request.request.headers.get('Authorization')).toBe('Bearer admin-token');
    request.flush([area]);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Geographic areas');
    expect(page.querySelector('tbody')?.textContent).toContain('-71.2, 42.1, -70.9, 42.5');
    expect(page.querySelector('tbody')?.textContent).toContain('9');
  });

  it('creates an area using the documented bbox and zoom shape, then reloads', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/geographic-areas').flush([]);
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;
    fillAreaForm(page);
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const create = httpTesting.expectOne('/api/admin/geographic-areas');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      name: 'Boston area',
      definition: { bbox: [-71.2, 42.1, -70.9, 42.5], zoom: 9 },
      enabled: true,
    });
    const created = { ...area, name: 'Boston area' };
    create.flush(created, { status: 201, statusText: 'Created' });
    httpTesting.expectOne('/api/admin/geographic-areas').flush([created]);
    pageHarness.detectChanges();

    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('tbody')?.textContent)
      .toContain('Boston area');
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('[role="status"]')?.textContent)
      .toContain('Created Boston area');
  });

  it('edits an area and sends the updated bounding box to the API', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/geographic-areas').flush([area]);
    pageHarness.detectChanges();
    ((pageHarness.routeNativeElement as HTMLElement).querySelector('.edit-area') as HTMLButtonElement).click();
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const minLongitude = page.querySelector('#min-longitude') as HTMLInputElement;
    minLongitude.value = '-72';
    minLongitude.dispatchEvent(new Event('input', { bubbles: true }));
    const enabled = page.querySelector('#area-status') as HTMLSelectElement;
    enabled.value = enabled.options[1].value;
    enabled.dispatchEvent(new Event('change', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const update = httpTesting.expectOne('/api/admin/geographic-areas/area-1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({
      name: 'Boston',
      definition: { bbox: [-72, 42.1, -70.9, 42.5], zoom: 9 },
      enabled: false,
    });
    const bbox: [number, number, number, number] = [-72, 42.1, -70.9, 42.5];
    const updated = {
      ...area,
      enabled: 0,
      definition: { bbox, zoom: 9 },
    };
    update.flush(updated);
    httpTesting.expectOne('/api/admin/geographic-areas').flush([updated]);
    pageHarness.detectChanges();
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('tbody')?.textContent)
      .toContain('-72, 42.1, -70.9, 42.5');
  });

  it('rejects out-of-range coordinates, inverted bounds, and fractional zoom', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/geographic-areas').flush([]);
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;
    fillAreaForm(page);
    const minLongitude = page.querySelector('#min-longitude') as HTMLInputElement;
    minLongitude.value = '181';
    minLongitude.dispatchEvent(new Event('input', { bubbles: true }));
    const maxLatitude = page.querySelector('#max-latitude') as HTMLInputElement;
    maxLatitude.value = '40';
    maxLatitude.dispatchEvent(new Event('input', { bubbles: true }));
    const zoom = page.querySelector('#area-zoom') as HTMLInputElement;
    zoom.value = '9.5';
    zoom.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    pageHarness.detectChanges();

    expect(page.textContent).toContain('Longitude must be between -180 and 180.');
    expect(page.textContent).toContain('Zoom must be a non-negative whole number.');
    expect(page.textContent)
      .toContain('Minimum longitude and latitude must be less than their maximum values.');
    httpTesting.expectNone('/api/admin/geographic-areas');
  });

  it('rejects an invalid zoom level before submitting', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/admin/geographic-areas').flush([]);
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;
    fillAreaForm(page);
    const zoom = page.querySelector('#area-zoom') as HTMLInputElement;
    zoom.value = '-1';
    zoom.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    pageHarness.detectChanges();

    expect(page.textContent).toContain('Zoom must be a non-negative whole number.');
    httpTesting.expectNone('/api/admin/geographic-areas');
  });
});
