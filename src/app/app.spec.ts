import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { JobsApiService } from './features/jobs/data-access/jobs-api.service';

describe('App', () => {
  beforeEach(async () => {
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
});
