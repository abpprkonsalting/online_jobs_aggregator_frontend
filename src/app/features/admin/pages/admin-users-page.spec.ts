import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AuthApiService } from '../../auth/data-access/auth-api.service';
import { authTokenInterceptor } from '../../auth/data-access/auth-token.interceptor';
import { AuthSessionService } from '../../auth/data-access/auth-session.service';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminUsersPage } from './admin-users-page';

const users = [{
  id: 'user-1',
  email: 'existing@example.com',
  role: 'user' as const,
  is_active: 1,
  last_login_at: null,
  created_at: '2026-10-20T12:00:00.000Z',
}];

describe('AdminUsersPage', () => {
  let httpTesting: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        AuthApiService,
        AuthSessionService,
        AdminApiService,
        provideRouter([{ path: 'admin', component: AdminUsersPage }]),
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
  afterEach(() => vi.restoreAllMocks());

  async function openPage() {
    harness = await RouterTestingHarness.create('/admin');
    harness.detectChanges();
    return harness;
  }

  it('loads and renders existing users', async () => {
    const pageHarness = await openPage();
    const request = httpTesting.expectOne('/api/users');
    expect(request.request.headers.get('Authorization')).toBe('Bearer admin-token');
    request.flush(users);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('User management');
    expect(page.querySelector('tbody')?.textContent).toContain('existing@example.com');
    expect(page.querySelector('tbody')?.textContent).toContain('Never');
  });

  it('creates a validated user and refreshes the list after success', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/users').flush(users);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const email = page.querySelector('#user-email') as HTMLInputElement;
    const password = page.querySelector('#user-password') as HTMLInputElement;
    const role = page.querySelector('#user-role') as HTMLSelectElement;
    email.value = 'new@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'secret123';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    role.value = 'admin';
    role.dispatchEvent(new Event('change', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const create = httpTesting.expectOne('/api/users');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      email: 'new@example.com',
      password: 'secret123',
      role: 'admin',
    });
    create.flush({ id: 'user-2', email: 'new@example.com', role: 'admin' }, {
      status: 201,
      statusText: 'Created',
    });
    const refresh = httpTesting.expectOne('/api/users');
    expect(refresh.request.method).toBe('GET');
    refresh.flush([...users, { ...users[0], id: 'user-2', email: 'new@example.com', role: 'admin' }]);
    pageHarness.detectChanges();

    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('[role="status"]')?.textContent)
      .toContain('Created account for new@example.com');
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('tbody')?.textContent)
      .toContain('new@example.com');
  });

  it('shows validation feedback and does not send invalid user data', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/users').flush(users);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const email = page.querySelector('#user-email') as HTMLInputElement;
    const password = page.querySelector('#user-password') as HTMLInputElement;
    email.value = 'invalid-email';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'short';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    pageHarness.detectChanges();

    expect(page.textContent).toContain('Enter a valid email address.');
    expect(page.textContent).toContain('Password must be at least 6 characters.');
    httpTesting.expectNone('/api/users');
  });

  it('shows duplicate and validation failures without presenting a success state', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/users').flush(users);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const email = page.querySelector('#user-email') as HTMLInputElement;
    email.value = 'existing@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    const password = page.querySelector('#user-password') as HTMLInputElement;
    password.value = 'secret123';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    httpTesting.expectOne('/api/users').flush(
      { error: 'User already exists' },
      { status: 409, statusText: 'Conflict' },
    );
    pageHarness.detectChanges();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('User already exists');
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelector('tbody')?.textContent).toContain('existing@example.com');
  });

  it('surfaces backend field validation errors without creating a user', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/users').flush(users);
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    const email = page.querySelector('#user-email') as HTMLInputElement;
    email.value = 'new@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    const password = page.querySelector('#user-password') as HTMLInputElement;
    password.value = 'secret123';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    httpTesting.expectOne('/api/users').flush(
      { errors: [{ msg: 'Password is too weak', path: 'password', location: 'body' }] },
      { status: 400, statusText: 'Bad Request' },
    );
    pageHarness.detectChanges();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('invalid fields');
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelector('tbody')?.textContent).toContain('existing@example.com');
  });

  it('changes a user role in the list only after the API confirms the update', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/users').flush(users);
    pageHarness.detectChanges();
    ((pageHarness.routeNativeElement as HTMLElement).querySelector('.role-action') as HTMLButtonElement).click();

    const update = httpTesting.expectOne('/api/users/user-1');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ role: 'admin' });
    update.flush({ id: 'user-1', role: 'admin' });
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('tbody')?.textContent).toContain('Administrator');
    expect(page.querySelector('.role-action')?.textContent).toContain('Set as user');
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Updated existing@example.com');
  });

  it('keeps the old role and reports an error when a role update fails', async () => {
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/users').flush(users);
    pageHarness.detectChanges();
    ((pageHarness.routeNativeElement as HTMLElement).querySelector('.role-action') as HTMLButtonElement).click();

    httpTesting.expectOne('/api/users/user-1').flush(
      { error: 'Admin role required' },
      { status: 403, statusText: 'Forbidden' },
    );
    pageHarness.detectChanges();

    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Admin role required');
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelector('tbody')?.textContent).toContain('User');
    expect(page.querySelector('.role-action')?.textContent).toContain('Make admin');
  });

  it('does not deactivate a user when confirmation is cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/users').flush(users);
    pageHarness.detectChanges();
    ((pageHarness.routeNativeElement as HTMLElement).querySelector('.deactivate-button') as HTMLButtonElement).click();
    pageHarness.detectChanges();

    expect(confirm).toHaveBeenCalledWith(
      'Deactivate existing@example.com? They will no longer be able to sign in.',
    );
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('tbody')?.textContent)
      .toContain('Active');
    httpTesting.expectNone('/api/users/user-1');
  });

  it('deactivates a user only after API success', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const pageHarness = await openPage();
    httpTesting.expectOne('/api/users').flush(users);
    pageHarness.detectChanges();

    ((pageHarness.routeNativeElement as HTMLElement).querySelector('.deactivate-button') as HTMLButtonElement).click();
    const deactivate = httpTesting.expectOne('/api/users/user-1');
    expect(deactivate.request.method).toBe('DELETE');
    deactivate.flush({ success: true });
    pageHarness.detectChanges();
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('tbody')?.textContent)
      .toContain('Inactive');
    expect((pageHarness.routeNativeElement as HTMLElement).querySelector('[role="status"]')?.textContent)
      .toContain('Deactivated existing@example.com');
  });

  it('keeps a user active and reports an error when deactivation fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const pageHarness = await openPage();
    const otherUser = { ...users[0], id: 'user-2', email: 'other@example.com' };
    httpTesting.expectOne('/api/users').flush([users[0], otherUser]);
    pageHarness.detectChanges();
    const buttons = (pageHarness.routeNativeElement as HTMLElement).querySelectorAll('.deactivate-button');
    (buttons[1] as HTMLButtonElement).click();
    httpTesting.expectOne('/api/users/user-2').flush(
      { error: 'Unable to deactivate user' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    pageHarness.detectChanges();
    const page = pageHarness.routeNativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Unable to deactivate user');
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelector('tbody')?.textContent).toContain('other@example.com');
    expect(page.querySelector('tbody')?.textContent).toContain('Active');
  });
});
