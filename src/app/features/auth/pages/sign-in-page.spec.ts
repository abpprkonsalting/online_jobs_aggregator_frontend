import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ApiClient } from '../../../core/http/api-client';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AuthSessionService } from '../data-access/auth-session.service';
import { routes } from '../../../app.routes';

describe('SignInPage', () => {
  let httpTesting: HttpTestingController;
  let harness: RouterTestingHarness;
  let session: AuthSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        ApiClient,
        provideRouter(routes),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
  });

  afterEach(() => httpTesting.verify());

  async function openSignIn(path = '/sign-in') {
    harness = await RouterTestingHarness.create(path);
    harness.detectChanges();
    return harness;
  }

  function setCredentials(page: HTMLElement, email: string, password: string): void {
    const emailInput = page.querySelector('#email') as HTMLInputElement;
    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    const passwordInput = page.querySelector('#password') as HTMLInputElement;
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('shows required-field validation without calling the API', async () => {
    const pageHarness = await openSignIn();
    const page = pageHarness.routeNativeElement as HTMLElement;
    (page.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    pageHarness.detectChanges();

    expect(page.querySelector('#email-error')?.textContent).toContain('Enter your email address');
    expect(page.querySelector('#password-error')?.textContent).toContain('Enter your password');
    expect(page.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
    httpTesting.expectNone('/api/auth/login');
  });

  it('rejects invalid email formats before making a request', async () => {
    const pageHarness = await openSignIn();
    const page = pageHarness.routeNativeElement as HTMLElement;
    setCredentials(page, 'not-an-email', 'password');
    (page.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    pageHarness.detectChanges();

    expect(page.querySelector('#email-error')?.textContent).toContain('Enter a valid email address');
    httpTesting.expectNone('/api/auth/login');
  });

  it('shows invalid-credential feedback and remains signed out', async () => {
    const pageHarness = await openSignIn();
    const page = pageHarness.routeNativeElement as HTMLElement;
    setCredentials(page, 'user@example.com', 'incorrect');
    (page.querySelector('button[type="submit"]') as HTMLButtonElement).click();

    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.withCredentials).toBe(true);
    request.flush(
      { error: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' },
    );
    pageHarness.detectChanges();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Invalid credentials');
    expect(session.isAuthenticated()).toBe(false);
    expect(session.currentUser()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });

  it('establishes an in-memory session after a successful login', async () => {
    const pageHarness = await openSignIn();
    const page = pageHarness.routeNativeElement as HTMLElement;
    setCredentials(page, 'user@example.com', 'correct-horse');
    (page.querySelector('button[type="submit"]') as HTMLButtonElement).click();

    const request = httpTesting.expectOne('/api/auth/login');
    pageHarness.detectChanges();
    expect((page.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    request.flush({
      access_token: 'access-token',
      user: { id: 'user-1', email: 'user@example.com', role: 'user' },
    });
    await pageHarness.fixture.whenStable();
    pageHarness.detectChanges();

    expect(session.isAuthenticated()).toBe(true);
    expect(session.getAccessToken()).toBe('access-token');
    expect(session.currentUser()).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
    });
    expect(TestBed.inject(Router).url).toBe('/jobs');
    httpTesting.expectOne('/api/categories').flush([]);
    httpTesting.expectOne('/api/users/me/saved-jobs').flush([]);
    httpTesting.expectOne('/api/jobs').flush({
      jobs: [],
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false,
    });
  });

  it('returns to the protected destination after successful sign-in', async () => {
    const pageHarness = await openSignIn('/sign-in?returnUrl=%2Faccount%3Ftab%3Dinterests');
    const page = pageHarness.routeNativeElement as HTMLElement;
    setCredentials(page, 'user@example.com', 'correct-horse');
    (page.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    httpTesting.expectOne('/api/auth/login').flush({
      access_token: 'access-token',
      user: { id: 'user-1', email: 'user@example.com', role: 'user' },
    });
    await pageHarness.fixture.whenStable();
    httpTesting.expectOne('/api/categories').flush([]);
    httpTesting.expectOne('/api/users/user-1/categories').flush([]);
    pageHarness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/account?tab=interests');
    expect(pageHarness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Category interests');
  });

  it('uses the jobs page instead of an external return URL', async () => {
    const pageHarness = await openSignIn('/sign-in?returnUrl=https%3A%2F%2Fevil.example');
    const page = pageHarness.routeNativeElement as HTMLElement;
    setCredentials(page, 'user@example.com', 'correct-horse');
    (page.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    httpTesting.expectOne('/api/auth/login').flush({
      access_token: 'access-token',
      user: { id: 'user-1', email: 'user@example.com', role: 'user' },
    });
    await pageHarness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/jobs');
    httpTesting.expectOne('/api/users/me/saved-jobs').flush([]);
    httpTesting.expectOne('/api/categories').flush([]);
    httpTesting.expectOne('/api/jobs').flush({
      jobs: [],
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false,
    });
  });
});
