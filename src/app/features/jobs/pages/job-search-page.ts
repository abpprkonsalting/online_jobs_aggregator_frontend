import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { JobResultCard } from '../components/job-result-card';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { JobListQuery, JobListResponse } from '../../../core/models/api.models';
import { JobsApiService } from '../data-access/jobs-api.service';

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
    <section class="search-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Job discovery</p>
        <h1 id="page-title">Find your next opportunity</h1>
        <p class="page-description">
          Explore roles from across the web and find a position that fits your next move.
        </p>
      </header>

      <div class="search-layout">
        <aside class="filters-panel" aria-labelledby="filters-title">
          <div class="panel-heading">
            <h2 id="filters-title">Search filters</h2>
          </div>
          <p class="filters-description">
            Filter by organization and salary. More options will be added as backend support is verified.
          </p>
          <form [formGroup]="filterForm" (ngSubmit)="applyFilters()">
            <label for="organization">Organization</label>
            <input
              id="organization"
              type="search"
              formControlName="organization"
              autocomplete="organization"
              placeholder="Company name"
            />

            <div class="salary-fields">
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
        </aside>

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
              }
            }
          }
        </section>
      </div>
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

    .page-header {
      max-width: 44rem;
      margin-bottom: clamp(2.5rem, 6vw, 4rem);
    }

    .eyebrow {
      margin: 0 0 0.85rem;
      color: var(--color-accent-dark);
      font-size: 0.78rem;
      font-weight: 750;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 13ch;
      margin: 0;
      font-size: clamp(2.5rem, 6vw, 4.5rem);
      font-weight: 700;
      letter-spacing: -0.065em;
      line-height: 1.03;
    }

    .page-description {
      max-width: 38rem;
      margin: 1.25rem 0 0;
      color: var(--color-muted);
      font-size: clamp(1rem, 2vw, 1.15rem);
      line-height: 1.7;
    }

    .search-layout {
      display: grid;
      min-width: 0;
      grid-template-columns: minmax(14rem, 17rem) minmax(0, 1fr);
      align-items: start;
      gap: 1.25rem;
    }

    .filters-panel,
    .results-panel {
      min-width: 0;
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
    }

    .filters-panel {
      padding: 1.25rem;
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



    .filters-description {
      margin: 0.8rem 0 1rem;
      color: var(--color-muted);
      font-size: 0.875rem;
      line-height: 1.55;
    }

    form {
      display: grid;
      gap: 0.65rem;
    }

    label {
      color: var(--color-ink);
      font-size: 0.8rem;
      font-weight: 650;
    }

    input {
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

    input:focus-visible {
      outline: 3px solid rgb(216 102 54 / 25%);
      border-color: var(--color-accent);
    }

    .salary-fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.55rem;
      margin-top: 0.35rem;
    }

    .salary-fields > div {
      display: grid;
      min-width: 0;
      gap: 0.45rem;
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
      margin-top: 0.35rem;
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
      .search-layout {
        grid-template-columns: minmax(0, 1fr);
      }

    }

    @media (max-width: 420px) {
      .filters-panel,
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
  protected readonly state = signal<AsyncState<JobListResponse>>({ status: 'loading' });
  protected readonly filterForm = new FormGroup({
    organization: new FormControl('', { nonNullable: true }),
    salaryMin: new FormControl<number | null>(null, [Validators.min(0)]),
    salaryMax: new FormControl<number | null>(null, [Validators.min(0)]),
  }, { validators: salaryRangeValidator });
  private currentQuery: JobListQuery = {};

  ngOnInit(): void {
    this.loadJobs();
  }

  protected applyFilters(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { organization, salaryMin, salaryMax } = this.filterForm.getRawValue();
    const query: JobListQuery = {};
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

    this.loadJobs(query);
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
}
