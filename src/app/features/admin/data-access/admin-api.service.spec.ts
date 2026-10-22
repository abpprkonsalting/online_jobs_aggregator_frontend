import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { ApiError } from '../../../core/http/api-error';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AdminApiService } from './admin-api.service';
import { GeographicAreaDefinition } from '../models/admin.models';

describe('AdminApiService', () => {
  let service: AdminApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        AdminApiService,
      ],
    });

    service = TestBed.inject(AdminApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lists users and exposes backend authorization errors', () => {
    let actualError: unknown;

    service.listUsers().subscribe({ error: (error: unknown) => (actualError = error) });

    const request = httpTesting.expectOne('/api/users');
    expect(request.request.method).toBe('GET');
    request.flush({ error: 'Admin role required' }, { status: 403, statusText: 'Forbidden' });
    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({ kind: 'forbidden', status: 403 });
  });

  it('creates users with the backend request shape and preserves conflict errors', () => {
    const body = { email: 'new@example.com', password: 'strong-password', role: 'user' as const };
    let actualError: unknown;

    service.createUser(body).subscribe({ error: (error: unknown) => (actualError = error) });

    const request = httpTesting.expectOne('/api/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ error: 'User already exists' }, { status: 409, statusText: 'Conflict' });
    expect(actualError).toBeInstanceOf(ApiError);
    expect(actualError).toMatchObject({ status: 409, message: 'User already exists' });
  });

  it('updates and deactivates users using their documented routes', () => {
    service.updateUserRole('user-1', 'admin').subscribe();
    const update = httpTesting.expectOne('/api/users/user-1');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ role: 'admin' });
    update.flush({ id: 'user-1', role: 'admin' });

    service.deactivateUser('user-1').subscribe();
    const deactivate = httpTesting.expectOne('/api/users/user-1');
    expect(deactivate.request.method).toBe('DELETE');
    deactivate.flush({ success: true });
  });

  it('lists, creates, updates, and deletes sources with confirmed endpoint methods', () => {
    service.listSources().subscribe();
    httpTesting.expectOne('/api/admin/sources').flush([]);

    const createBody = {
      name: 'Example source',
      type: 'api' as const,
      working_mode: 'both' as const,
      config: { endpoint: 'https://example.com/jobs' },
      enabled: true,
    };
    service.createSource(createBody).subscribe();
    const create = httpTesting.expectOne('/api/admin/sources');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(createBody);
    create.flush({ id: 'source-1', ...createBody, last_run_at: null, next_run_at: null });

    const updateBody = { name: 'Updated source', enabled: false };
    service.updateSource('source-1', updateBody).subscribe();
    const update = httpTesting.expectOne('/api/admin/sources/source-1');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(updateBody);
    update.flush({ id: 'source-1', ...createBody, ...updateBody });

    service.deleteSource('source-1').subscribe();
    const remove = httpTesting.expectOne('/api/admin/sources/source-1');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ success: true });
  });

  it('uses geographic-area routes and preserves JSON definitions', () => {
    service.listGeographicAreas().subscribe();
    httpTesting.expectOne('/api/admin/geographic-areas').flush([]);

    const bbox: [number, number, number, number] = [-71.2, 42.1, -70.9, 42.5];
    const definition: GeographicAreaDefinition = { bbox, zoom: 9 };
    const createBody = { name: 'Boston', definition, enabled: true };
    service.createGeographicArea(createBody).subscribe();
    const create = httpTesting.expectOne('/api/admin/geographic-areas');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(createBody);
    create.flush({ id: 'area-1', ...createBody });

    service.updateGeographicArea('area-1', { definition }).subscribe();
    const update = httpTesting.expectOne('/api/admin/geographic-areas/area-1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ definition });
    update.flush({ id: 'area-1', ...createBody });

    service.deleteGeographicArea('area-1').subscribe();
    const remove = httpTesting.expectOne('/api/admin/geographic-areas/area-1');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ success: true });
  });

  it('lists, links, and unlinks source-area pairs', () => {
    service.listSourceAreas().subscribe();
    httpTesting.expectOne('/api/admin/areas').flush([]);

    const body = { source_id: 'source-1', geographic_area_id: 'area-1', enabled: true };
    service.createSourceArea(body).subscribe();
    const create = httpTesting.expectOne('/api/admin/areas');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(body);
    create.flush(body);

    service.deleteSourceArea('source-1', 'area-1').subscribe();
    const remove = httpTesting.expectOne('/api/admin/areas/source-1/area-1');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ success: true });
  });

  it('lists fetch runs without sending the unsupported source filter', () => {
    service.listFetchRuns().subscribe();

    const request = httpTesting.expectOne('/api/admin/fetch-runs');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([]);
  });
});
