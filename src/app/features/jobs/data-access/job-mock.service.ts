import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { JobListItem, JobListQuery, JobListResponse, SortCriterion } from '../../../core/models/api.models';

const ORGANIZATIONS = [
  'Acme Corp',
  'Globex Corporation',
  'Soylent Corp',
  'Umbrella Corporation',
  'Hooli',
  'Stark Industries',
  'Wayne Enterprises',
  'Cyberdyne Systems',
  'Oceanic Airlines',
  'Massive Dynamic',
];

const TITLES = [
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'DevOps Engineer',
  'Software Engineer',
  'Senior Software Engineer',
  'Staff Engineer',
  'Engineering Manager',
  'Product Manager',
  'Technical Writer',
];

const CURRENCIES = ['USD', 'EUR', 'GBP'];
const UNITS = ['year', 'hour'];
const REMOTE_VALUES = [0, 1];

function randomElement<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPastDate(): string {
  const daysAgo = randomInt(0, 90);
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function generateJob(id: string): JobListItem {
  const salaryMin = randomInt(70, 150);
  const salaryMax = salaryMin + randomInt(10, 50);
  const postedAt = randomPastDate();

  return {
    id,
    source_id: `source-${id}`,
    title: randomElement(TITLES),
    organization: randomElement(ORGANIZATIONS),
    job_url: `https://example.com/jobs/${id}`,
    description_text: null,
    allow_remote: randomElement(REMOTE_VALUES),
    salary_min: salaryMin.toString(),
    salary_max: salaryMax.toString(),
    salary_currency: randomElement(CURRENCIES),
    salary_unit: randomElement(UNITS),
    date_posted: null,
    posted_at: postedAt,
  };
}

const MOCK_JOBS: JobListItem[] = Array.from({ length: 1000 }, (_, i) => generateJob(`job-${i + 1}`));

function applyFilters(jobs: JobListItem[], query: JobListQuery): JobListItem[] {
  return jobs.filter((job) => {
    if (query.organization) {
      const org = job.organization ?? '';
      if (!org.toLowerCase().includes(query.organization.toLowerCase())) {
        return false;
      }
    }
    if (query.salary_min !== undefined) {
      const min = Number(job.salary_min);
      if (Number.isNaN(min) || min < query.salary_min) {
        return false;
      }
    }
    if (query.salary_max !== undefined) {
      const max = Number(job.salary_max);
      if (Number.isNaN(max) || max > query.salary_max) {
        return false;
      }
    }
    return true;
  });
}

function applySorts(jobs: JobListItem[], query: JobListQuery): JobListItem[] {
  const sorts: SortCriterion[] = query.sorts && query.sorts.length > 0
    ? query.sorts
    : query.sort && query.sortDir
      ? [{ field: query.sort, dir: query.sortDir }]
      : [];

  if (sorts.length === 0) {
    return jobs;
  }

  return [...jobs].sort((a, b) => {
    for (const criterion of sorts) {
      const field = criterion.field;
      const dir = criterion.dir === 'asc' ? 1 : -1;

      let aValue: string | number;
      let bValue: string | number;

      switch (field) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'organization':
          aValue = a.organization ?? '';
          bValue = b.organization ?? '';
          break;
        case 'location':
          aValue = a.allow_remote ?? 0;
          bValue = b.allow_remote ?? 0;
          break;
        case 'salary':
          aValue = Number(a.salary_min ?? '0');
          bValue = Number(b.salary_min ?? '0');
          break;
        case 'posted_at':
        case 'date_posted':
          aValue = a.posted_at ?? a.date_posted ?? '';
          bValue = b.posted_at ?? b.date_posted ?? '';
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (aValue < bValue) return -1 * dir;
      if (aValue > bValue) return 1 * dir;
    }
    return 0;
  });
}

@Injectable({ providedIn: 'root' })
export class JobMockService {
  private readonly jobs = MOCK_JOBS;

  list(query: JobListQuery = {}): Observable<JobListResponse> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    let filtered = applyFilters(this.jobs, query);
    const total = filtered.length;

    filtered = applySorts(filtered, query);
    const page = filtered.slice(offset, offset + limit);

    const response: JobListResponse = {
      jobs: page,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };

    return of(response);
  }
}
