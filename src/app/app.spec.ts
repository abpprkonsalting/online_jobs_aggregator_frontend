import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ApiError } from './core/http/api-error';
import { App } from './app';
import { routes } from './app.routes';
import { JobsApiService } from './features/jobs/data-access/jobs-api.service';
import { AuthSessionService } from './features/auth/data-access/auth-session.service';

describe('App', () => {
  let setRestoreError: (error: ApiError | null) => void;

  beforeEach(async () => {
    const restoreError = signal<ApiError | null>(null);
    setRestoreError = (error) => restoreError.set(error);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: JobsApiService,
          useValue: {
            list: () => of({ jobs: [], total: 0, limit: 20, offset: 0, hasMore: false }),
          },
        },
        {
          provide: AuthSessionService,
          useValue: { restoreError },
        },
      ],
    }).compileComponents();
  });

  it('should render the application shell and default jobs route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(router.url).toBe('/jobs');
    expect(compiled.querySelector('header nav')?.getAttribute('aria-label')).toBe('Main navigation');
    expect(compiled.querySelector('.brand')?.textContent).toContain('Online Jobs Aggregator');
    expect(compiled.querySelector('h1')?.textContent).toContain('Find your next opportunity');
  });

  it('should navigate to a placeholder route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/categories');
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('Explore job categories');
  });

  it('should render a not-found page for unknown routes', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/unknown');
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('We couldn’t find that page');
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
});
