import { TestBed } from '@angular/core/testing';
import { JobSearchPage } from './job-search-page';

describe('JobSearchPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobSearchPage],
    }).compileComponents();
  });

  it('renders the page heading, planned filter region, and empty results region', () => {
    const fixture = TestBed.createComponent(JobSearchPage);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Find your next opportunity');
    expect(page.querySelector('aside[aria-labelledby="filters-title"] h2')?.textContent)
      .toContain('Search filters');
    expect(page.querySelector('section[aria-labelledby="results-title"] h2')?.textContent)
      .toContain('Search results');
    expect(page.querySelector('[role="status"]')?.textContent)
      .toContain('Your results will appear here');
    expect(page.textContent).toContain('Coming soon');
  });
});
