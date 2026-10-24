import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiError } from './core/http/api-error';
import { ApiClient } from './core/http/api-client';
import { App } from './app';
import { routes } from './app.routes';
import { JobsApiService } from './features/jobs/data-access/jobs-api.service';
import { AuthSessionService } from './features/auth/data-access/auth-session.service';
import { AuthApiService } from './features/auth/data-access/auth-api.service';
import { AuthUser } from './features/auth/models/auth.models';
import { AdminApiService } from './features/admin/data-access/admin-api.service';

describe('App', () => {
  let setRestoreError: (error: ApiError | null) => void;
  let setAuthenticatedUser: (user: AuthUser | null) => void;
  let clearSession: ReturnType<typeof vi.fn>;
  let logout: ReturnType<typeof vi.fn>;
  let getBackendVersion: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const restoreError = signal<ApiError | null>(null);
    setRestoreError = (error) => restoreError.set(error);
    const isAuthenticated = signal(false);
    const currentUser = signal<AuthUser | null>(null);
    setAuthenticatedUser = (user) => {
      currentUser.set(user);
      isAuthenticated.set(user !== null);
    };
    clearSession = vi.fn(() => {
      currentUser.set(null);
      isAuthenticated.set(false);
    });
    logout = vi.fn().mockReturnValue(of({ success: true }));
    getBackendVersion = vi.fn().mockReturnValue(of({
      releaseTag: 'v0.1.2',
      buildStatus: 'release',
    }));
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: ApiClient,
          useValue: { get: getBackendVersion },
        },
        {
          provide: JobsApiService,
          useValue: {
            list: () => of({ jobs: [], total: 0, limit: 20, offset: 0, hasMore: false }),
          },
        },
        {
          provide: AuthSessionService,
          useValue: {
            restoreError,
            isAuthenticated,
            currentUser,
            clear: clearSession,
          },
        },
        {
          provide: AuthApiService,
          useValue: { logout },
        },
        {
          provide: AdminApiService,
          useValue: { listUsers: () => of([]) },
        },
      ],
    }).compileComponents();
  });

  it('renders a sign-in landing page for signed-out visitors', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(router.url).toBe('/');
    expect(compiled.querySelector('header nav')?.getAttribute('aria-label')).toBe('Main navigation');
    expect(compiled.querySelector('.brand')?.textContent).toContain('Online Jobs Aggregator');
    expect(compiled.querySelector('h1')?.textContent).toContain('The right opportunity starts');
    expect(compiled.querySelector('.primary-navigation a[href="/jobs"]')).toBeNull();
    expect(compiled.querySelector('.primary-navigation a[href="/categories"]')).toBeNull();
    expect(compiled.querySelector('.home-copy a[href="/sign-in"]')?.textContent)
      .toContain('Sign in to your account');
    expect(compiled.querySelector('.backend-version')?.textContent?.trim())
      .toBe('Backend v0.1.2 (API + Fetcher)');
    expect(getBackendVersion).toHaveBeenCalledWith('version');
  });

  it('shows the backend version as unavailable when the version request fails', async () => {
    getBackendVersion.mockReturnValue(throwError(() => new Error('Backend unavailable')));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.backend-version')?.textContent?.trim())
      .toBe('Backend version unavailable');
    expect(compiled.querySelector('.site-footer-content p')?.textContent)
      .toContain('Find your next opportunity.');
  });

  it('shows the backend build status when there is no release tag', async () => {
    getBackendVersion.mockReturnValue(of({
      releaseTag: null,
      buildStatus: 'development',
    }));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.backend-version')?.textContent?.trim())
      .toBe('Backend development (API + Fetcher)');
  });

  it('protects job and category browsing from signed-out visitors', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/categories');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/?returnUrl=%2Fcategories');
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('The right opportunity starts');
  });

  it('shows authenticated visitors the not-found page for unknown routes', async () => {
    setAuthenticatedUser({ id: 'user-1', email: 'user@example.com', role: 'user' });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/unknown');
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('We couldn’t find that page');
  });

  it('redirects signed-out visitors from account routes to the landing page with their destination', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/account?tab=interests');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url.startsWith('/?')).toBe(true);
    expect(router.parseUrl(router.url).queryParams['returnUrl'])
      .toBe('/account?tab=interests');
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('The right opportunity starts');
    expect((fixture.nativeElement as HTMLElement)
      .querySelector('.home-copy a[href="/sign-in?returnUrl=%2Faccount%3Ftab%3Dinterests"]'))
      .not.toBeNull();
  });

  it('redirects signed-out visitors from admin routes to the landing page and preserves their destination', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin?section=users');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url.startsWith('/?')).toBe(true);
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe('/admin?section=users');
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('The right opportunity starts');
  });

  it('redirects authenticated non-admin users away from admin routes', async () => {
    setAuthenticatedUser({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/');
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('Welcome back');
    expect((fixture.nativeElement as HTMLElement).querySelector('.primary-navigation a[href="/admin"]'))
      .toBeNull();
  });

  it('allows admins to open admin routes and shows the admin navigation link', async () => {
    setAuthenticatedUser({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin');
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(router.url).toBe('/admin');
    expect(page.querySelector('h1')?.textContent).toContain('User management');
    expect(page.querySelector('.primary-navigation a[href="/admin"]')?.textContent?.trim())
      .toBe('Admin');
  });

  it('surfaces unexpected session restoration errors in the application shell', async () => {
    setRestoreError(new ApiError('Authentication service unavailable', 'server', 503));
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/jobs');
    await fixture.whenStable();
    fixture.detectChanges();

    const warning = (fixture.nativeElement as HTMLElement).querySelector('.session-warning');
    expect(warning?.getAttribute('role')).toBe('alert');
    expect(warning?.textContent).toContain('Authentication service unavailable');
    expect(warning?.querySelector('a')?.getAttribute('href')).toBe('/sign-in');
  });

  it('clears the session and returns to the landing page after confirmed server logout', async () => {
    setAuthenticatedUser({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/categories');
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.sign-out-button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(logout).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/');
    expect(page.querySelector('.sign-out-button')).toBeNull();
    expect(page.querySelector('.sign-in-link')).not.toBeNull();
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it('clears local state and returns to the landing page when server logout fails', async () => {
    setAuthenticatedUser({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    logout.mockReturnValue(throwError(() =>
      new ApiError('Session service unavailable', 'server', 503),
    ));
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/categories');
    await fixture.whenStable();
    fixture.detectChanges();

    const signOutButton = (fixture.nativeElement as HTMLElement)
      .querySelector('.sign-out-button') as HTMLButtonElement;
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('user@example.com');
    signOutButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(logout).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/');
    expect(page.querySelector('.sign-out-button')).toBeNull();
    expect(page.querySelector('.sign-in-link')).not.toBeNull();
    expect(page.querySelector('[role="alert"]')?.textContent)
      .toContain('Session service unavailable');
  });
});
