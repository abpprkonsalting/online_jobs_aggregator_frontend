import { TestBed } from '@angular/core/testing';
import { JobListItem } from '../../../core/models/api.models';
import { JobResultCard } from './job-result-card';

const completeJob: JobListItem = {
  id: 'job-1',
  source_id: 'source-1',
  title: 'Frontend Engineer',
  organization: 'Example Co',
  job_url: 'https://example.com/jobs/1',
  description_text: 'Build accessible interfaces.',
  allow_remote: 1,
  salary_min: '90000.00',
  salary_max: '120000.00',
  salary_currency: 'USD',
  salary_unit: 'year',
  date_posted: null,
  posted_at: '2026-10-20T12:00:00.000Z',
};

describe('JobResultCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobResultCard],
    }).compileComponents();
  });

  it('renders available job details and a supplied location', () => {
    const fixture = TestBed.createComponent(JobResultCard);
    fixture.componentRef.setInput('job', completeJob);
    fixture.componentRef.setInput('location', 'Boston, United States');
    fixture.detectChanges();

    const card = fixture.nativeElement as HTMLElement;
    const titleLink = card.querySelector('h2 a') as HTMLAnchorElement;
    expect(titleLink.textContent).toContain('Frontend Engineer');
    expect(titleLink.href).toBe('https://example.com/jobs/1');
    expect(titleLink.target).toBe('_blank');
    expect(titleLink.rel).toContain('noopener');
    expect(card.textContent).toContain('Example Co');
    expect(card.textContent).toContain('Boston, United States');
    expect(card.textContent).toContain('Remote');
    expect(card.textContent).toContain('90,000–120,000 USD per year');
    expect(card.querySelector('time')?.getAttribute('datetime')).toBe(completeJob.posted_at);
    expect(card.textContent).toContain('Posted');
  });

  it('omits unavailable optional details from a partial job', () => {
    const fixture = TestBed.createComponent(JobResultCard);
    fixture.componentRef.setInput('job', {
      ...completeJob,
      organization: null,
      allow_remote: null,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      salary_unit: null,
      date_posted: null,
      posted_at: null,
    });
    fixture.detectChanges();

    const card = fixture.nativeElement as HTMLElement;
    expect(card.querySelector('h2')?.textContent).toContain('Frontend Engineer');
    expect(card.querySelector('.job-meta')?.textContent?.trim()).toBe('');
    expect(card.querySelector('.work-style')).toBeNull();
    expect(card.querySelector('time')).toBeNull();
  });

  it('renders on-site state and uses date_posted when posted_at is absent', () => {
    const fixture = TestBed.createComponent(JobResultCard);
    fixture.componentRef.setInput('job', {
      ...completeJob,
      allow_remote: 0,
      posted_at: null,
      date_posted: '2026-10-18T12:00:00.000Z',
    });
    fixture.detectChanges();

    const card = fixture.nativeElement as HTMLElement;
    expect(card.textContent).toContain('On-site');
    expect(card.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-18T12:00:00.000Z');
  });

  it('omits invalid salary and date values instead of breaking the card', () => {
    const fixture = TestBed.createComponent(JobResultCard);
    fixture.componentRef.setInput('job', {
      ...completeJob,
      salary_min: 'not-a-number',
      salary_max: null,
      posted_at: 'not-a-date',
    });
    fixture.detectChanges();

    const card = fixture.nativeElement as HTMLElement;
    expect(card.querySelector('.job-meta')?.textContent).not.toContain('not-a-number');
    expect(card.querySelector('time')).toBeNull();
  });
});
