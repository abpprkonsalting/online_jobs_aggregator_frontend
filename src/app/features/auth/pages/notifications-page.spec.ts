import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AuthApiService } from '../data-access/auth-api.service';
import { AuthSessionService } from '../data-access/auth-session.service';
import { authTokenInterceptor } from '../data-access/auth-token.interceptor';
import { NotificationApiService } from '../data-access/notification-api.service';
import { NotificationsPage } from './notifications-page';

describe('NotificationsPage', () => {
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
        NotificationApiService,
        provideRouter([{ path: 'account/notifications', component: NotificationsPage }]),
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSessionService).setSession('user-token', {
      id: 'user-1', email: 'user@example.com', role: 'user',
    });
  });

  afterEach(() => httpTesting.verify());

  it('loads the saved preference and displays notification summaries', async () => {
    harness = await RouterTestingHarness.create('/account/notifications');
    harness.detectChanges();
    const preferences = httpTesting.expectOne('/api/users/me/notification-preferences');
    expect(preferences.request.headers.get('Authorization')).toBe('Bearer user-token');
    preferences.flush({ opt_in: true });
    httpTesting.expectOne('/api/users/me/notifications').flush([
      { id: 'history-1', job_count: 3, jobs: [], sent_at: '2026-10-29T12:00:00.000Z' },
    ]);
    harness.detectChanges();
    const page = harness.routeNativeElement as HTMLElement;
    expect((page.querySelector('#notification-opt-in') as HTMLInputElement).checked).toBe(true);
    expect(page.textContent).toContain('3');
    expect(page.textContent).toContain('Oct 29, 2026');
  });

  it('persists opt-in changes with PATCH and confirms the result', async () => {
    harness = await RouterTestingHarness.create('/account/notifications');
    harness.detectChanges();
    httpTesting.expectOne('/api/users/me/notification-preferences').flush({ opt_in: false });
    httpTesting.expectOne('/api/users/me/notifications').flush([]);
    harness.detectChanges();
    const toggle = (harness.routeNativeElement as HTMLElement).querySelector('#notification-opt-in') as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    const request = httpTesting.expectOne('/api/users/me/notification-preferences');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ opt_in: true });
    request.flush({ opt_in: true });
    harness.detectChanges();
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Email notifications turned on.');
  });
});
