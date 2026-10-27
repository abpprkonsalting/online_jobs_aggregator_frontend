import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { JobResultCard } from '../components/job-result-card';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import {
  JobListQuery,
  JobListResponse,
  JobSortField,
  SortDirection,
} from '../../../core/models/api.models';
import { JobsApiService } from '../data-access/jobs-api.service';

const JOB_SORT_FIELDS: ReadonlySet<string> = new Set([
  'posted_at',
  'date_posted',
  'organization',
]);

function isJobSortField(value: string | null): value is JobSortField {
  return value !== null && JOB_SORT_FIELDS.has(value);
}

const salaryRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const minimum = control.get('salaryMin')?.value;
  const maximum = control.get('salaryMax')?.value;

  return typeof minimum === 'number' && typeof maximum === 'number' && minimum > maximum
    ? { salaryRange: true }
    : null;
};

@Component({
  selector: 'app-job-search-page',
  imports: [JobResultCard, ReactiveFormsModule],
  template: `
    <section class="search-page">
      <form class="filters-bar" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
        <div class="filter-field">
          <label for="sort-by">Sort by</label>
          <select id="sort-by" formControlName="sort">
            <option value="posted_at">Recently posted</option>
            <option value="date_posted">Original posting date</option>
            <option value="organization">Organization</option>
          </select>
        </div>

        <div class="filter-field">
          <label for="sort-direction">Direction</label>
          <select id="sort-direction" formControlName="sortDir">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div class="filter-field">
          <label for="organization">Organization</label>
          <input
            id="organization"
            type="search"
            formControlName="organization"
            autocomplete="organization"
            placeholder="Company name"
          />
        </div>

        <div class="filter-field salary-fields">
          <div>
            <label for="salary-min">Minimum salary</label>
            <input
              id="salary-min"
              type="number"
              min="0"
              step="any"
              formControlName="salaryMin"
              inputmode="decimal"
              placeholder="Any"
            />
          </div>
          <div>
            <label for="salary-max">Maximum salary</label>
            <input
              id="salary-max"
              type="number"
              min="0"
              step="any"
              formControlName="salaryMax"
              inputmode="decimal"
              placeholder="Any"
            />
          </div>
        </div>

        @if (filterForm.hasError('salaryRange')) {
          <p class="validation-message" role="alert">Minimum salary must not exceed maximum salary.</p>
        }

        <button type="submit" class="apply-button">Apply filters</button>
        <button type="button" class="clear-button" (click)="clearFilters()">Clear filters</button>
      </form>

      <section class="results-panel" aria-labelledby="results-title">
        @let currentState = state();
        <div class="panel-heading results-heading">
          <div>
            <p class="eyebrow">Opportunities</p>
            <h2 id="results-title">Search results</h2>
          </div>
          @if (currentState.status === 'loaded') {
            <span class="result-count">
              {{ currentState.value.total }}
              {{ currentState.value.total === 1 ? 'role' : 'roles' }}
            </span>
          }
        </div>
        @switch (currentState.status) {
          @case ('loading') {
            <div class="empty-results" role="status" aria-live="polite">
              <span class="loading-indicator" aria-hidden="true"></span>
              <h3>Loading jobs</h3>
              <p>We’re gathering the latest opportunities.</p>
            </div>
          }
          @case ('error') {
            <div class="empty-results" role="alert">
              <span class="empty-icon error-icon" aria-hidden="true">!</span>
              <h3>We couldn’t load jobs</h3>
              <p>{{ currentState.error.message }}</p>
              <button type="button" class="retry-button" (click)="loadJobs()">Try again</button>
            </div>
          }
          @case ('loaded') {
            @if (currentState.value.jobs.length === 0) {
              <div class="empty-results" role="status">
                <span class="empty-icon" aria-hidden="true">↗</span>
                <h3>No jobs found</h3>
                <p>There are no matching jobs right now. Please check back later.</p>
              </div>
            } @else {
              <div class="job-list" aria-label="Job results">
                @for (job of currentState.value.jobs; track job.id) {
                  <app-job-result-card [job]="job" />
                }
              </div>
              <nav class="pagination" aria-label="Job result pages">
                <p class="pagination-summary" aria-live="polite">
                  Showing {{ currentState.value.offset + 1 }}–{{ currentState.value.offset + currentState.value.jobs.length }}
                  of {{ currentState.value.total }}
                </p>
                <div class="pagination-actions">
                  <button
                    type="button"
                    class="clear-button"
                    [disabled]="currentState.value.offset <= 0"
                    (click)="changePage(currentState.value, -1)"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    class="clear-button"
                    [disabled]="!currentState.value.hasMore"
                    (click)="changePage(currentState.value, 1)"
                  >
                    Next
                  </button>
                </div>
              </nav>
            }
          }
        }
      </section>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .search-page {
      width: 100%;
      min-width: 0;
    }

    .filters-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: flex-end;
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 0;
    }

    .salary-fields {
      flex-direction: row;
      gap: 0.55rem;
    }

    .salary-fields > div {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      min-width: 0;
    }

    .filter-field label,
    .salary-fields label {
      color: var(--color-ink);
      font-size: 0.8rem;
      font-weight: 650;
    }

    .panel-heading {
      display: flex;
      min-width: 0;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.025em;
    }

    .filter-field input,
    .filter-field select,
    .salary-fields input {
      width: 100%;
      min-width: 0;
      min-height: 2.65rem;
      padding: 0.55rem 0.65rem;
      border: 1px solid var(--color-border);
      border-radius: 0.55rem;
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: 0.875rem;
    }

    .validation-message {
      margin: 0;
      color: #a43d25;
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .apply-button,
    .clear-button {
      min-height: 2.65rem;
      border-radius: 0.55rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 650;
    }

    .apply-button {
      border: 0;
      background: var(--color-ink);
      color: #fff;
    }

    .apply-button:hover {
      background: var(--color-accent-dark);
    }

    .clear-button {
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-muted);
    }

    .results-panel {
      overflow: hidden;
    }

    .results-heading {
      min-height: 5.25rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }

    .results-heading .eyebrow {
      margin-bottom: 0.35rem;
      font-size: 0.65rem;
    }

    .results-heading h2 {
      font-size: 1.2rem;
    }

    .result-count {
      color: var(--color-muted);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .job-list {
      display: grid;
      min-width: 0;
      gap: 0.75rem;
      padding: 1rem;
    }

    .pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0 1rem 1rem;
    }

    .empty-results {
      display: flex;
      min-height: 17rem;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
    }

    .empty-icon {
      display: grid;
      width: 2.75rem;
      aspect-ratio: 1;
      place-items: center;
      margin-bottom: 1rem;
      border-radius: 0.9rem;
      background: #fff0e9;
      color: var(--color-accent-dark);
      font-size: 1.35rem;
    }

    .empty-results h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }

    .empty-results p {
      max-width: 25rem;
      margin: 0.55rem 0 0;
      color: var(--color-muted);
      font-size: 0.9rem;
      line-height: 1.6;
    }

    .loading-indicator {
      width: 2rem;
      aspect-ratio: 1;
      margin-bottom: 1rem;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 800ms linear infinite;
    }

    .error-icon {
      background: #fff0ec;
      color: #a43d25;
      font-weight: 800;
    }

    .retry-button {
      min-height: 2.75rem;
      margin-top: 1.25rem;
      padding: 0.6rem 1rem;
      border: 0;
      border-radius: 0.6rem;
      background: var(--color-ink);
      color: #fff;
      cursor: pointer;
      font-weight: 650;
    }

    .retry-button:hover {
      background: var(--color-accent-dark);
    }

    .retry-button:focus-visible {
      outline: 3px solid var(--color-accent);
      outline-offset: 3px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 760px) {
      .filters-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-field {
        width: 100%;
      }

      .salary-fields {
        flex-direction: column;
      }

      .salary-fields > div {
        width: 100%;
      }

      .apply-button,
      .clear-button {
        width: 100%;
      }
    }

    @media (max-width: 420px) {
      .filters-bar,
      .results-heading {
        padding: 1rem;
      }

      .empty-results {
        min-height: 14rem;
        padding: 1.25rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .loading-indicator {
        animation-duration: 2s;
      }
    }
  `,
})
export class JobSearchPage implements OnInit {
  private readonly jobsApi = inject(JobsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly state = signal<AsyncState<JobListResponse>>({ status: 'loading' });
  protected readonly filterForm = new FormGroup({
    sort: new FormControl<JobSortField>('posted_at', { nonNullable: true }),
    sortDir: new FormControl<SortDirection>('desc', { nonNullable: true }),
    organization: new FormControl('', { nonNullable: true }),
    salaryMin: new FormControl<number | null>(null, [Validators.min(0)]),
    salaryMax: new FormControl<number | null>(null, [Validators.min(0)]),
  }, { validators: salaryRangeValidator });
  private currentQuery: JobListQuery = {};

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const query = this.queryFromParams(params);
        this.currentQuery = query;
        this.filterForm.patchValue({
          sort: query.sort ?? 'posted_at',
          sortDir: query.sortDir ?? 'desc',
          organization: query.organization ?? '',
          salaryMin: query.salary_min ?? null,
          salaryMax: query.salary_max ?? null,
        });
        this.loadJobs(query);
      });
  }

  protected applyFilters(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { organization, salaryMin, salaryMax, sort, sortDir } = this.filterForm.getRawValue();
    const query: JobListQuery = {
      limit: this.currentQuery.limit,
      sort,
      sortDir,
    };
    const normalizedOrganization = organization.trim();
    if (normalizedOrganization) {
      query.organization = normalizedOrganization;
    }
    if (salaryMin !== null) {
      query.salary_min = salaryMin;
    }
    if (salaryMax !== null) {
      query.salary_max = salaryMax;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.toUrlParams(query),
    });
  }

  protected clearFilters(): void {
    this.filterForm.reset({ organization: '', salaryMin: null, salaryMax: null });
    this.applyFilters();
  }

  protected loadJobs(query: JobListQuery = this.currentQuery): void {
    this.currentQuery = query;
    this.state.set({ status: 'loading' });
    this.jobsApi.list(query).subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: ApiError) => this.state.set({ status: 'error', error }),
    });
  }

  protected changePage(response: JobListResponse, direction: -1 | 1): void {
    if ((direction === -1 && response.offset <= 0) || (direction === 1 && !response.hasMore)) {
      return;
    }

    const offset = direction === -1
      ? Math.max(0, response.offset - response.limit)
      : response.offset + response.limit;
    const query: JobListQuery = {
      ...this.currentQuery,
      limit: response.limit,
      offset,
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.toUrlParams(query),
    });
  }

  private queryFromParams(params: ParamMap): JobListQuery {
    const query: JobListQuery = {};
    const limit = this.integerParam(params.get('limit'), 1, 100);
    const offset = this.integerParam(params.get('offset'), 0);
    const salaryMinimum = this.numberParam(params.get('salary_min'));
    const salaryMaximum = this.numberParam(params.get('salary_max'));
    const organization = params.get('organization')?.trim();
    const sort = params.get('sort');
    const sortDir = params.get('sortDir');

    if (limit !== undefined) query.limit = limit;
    if (offset !== undefined) query.offset = offset;
    if (salaryMinimum !== undefined) query.salary_min = salaryMinimum;
    if (salaryMaximum !== undefined) query.salary_max = salaryMaximum;
    if (organization) query.organization = organization;
    if (isJobSortField(sort)) query.sort = sort;
    if (sortDir === 'asc' || sortDir === 'desc') query.sortDir = sortDir;

    return query;
  }

  private integerParam(value: string | null, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number | undefined {
    if (value === null || !/^\d+$/.test(value)) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
      ? parsed
      : undefined;
  }

  private numberParam(value: string | null): number | undefined {
    if (value === null || value.trim() === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  private toUrlParams(query: JobListQuery): Params {
    return {
      organization: query.organization ?? null,
      salary_min: query.salary_min ?? null,
      salary_max: query.salary_max ?? null,
      limit: query.limit ?? null,
      offset: query.offset ?? null,
      sort: query.sort ?? null,
      sortDir: query.sortDir ?? null,
    };
  }
}
