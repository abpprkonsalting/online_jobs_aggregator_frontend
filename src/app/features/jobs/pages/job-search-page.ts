import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TableModule } from 'primeng/table';
import { TableLazyLoadEvent } from 'primeng/table';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import {
  JobListItem,
  JobListQuery,
  JobListResponse,
  JobSortField,
  SortDirection,
  SortCriterion,
  SavedJob,
} from '../../../core/models/api.models';
import { JobsApiService } from '../data-access/jobs-api.service';
import { formatDate } from '../../../core/utils/date.util';

const JOB_SORT_FIELDS: ReadonlySet<string> = new Set([
  'posted_at',
  'date_posted',
  'organization',
  'title',
  'salary',
]);

function isJobSortField(value: string | null): value is JobSortField {
  return value !== null && JOB_SORT_FIELDS.has(value);
}

const VIEWPORT_BREAKPOINT = 1024;

const salaryRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const minimum = control.get('salaryMin')?.value;
  const maximum = control.get('salaryMax')?.value;

  return typeof minimum === 'number' && typeof maximum === 'number' && minimum > maximum
    ? { salaryRange: true }
    : null;
};

@Component({
  selector: 'app-job-search-page',
  imports: [ReactiveFormsModule, TableModule, RouterLink],
  template: `
    <section class="search-page">
      @if (!isDesktop()) {
        <div class="desktop-only-message" role="status" aria-live="polite">
          <p>This view is meant to be used on desktop. Please open on a desktop device.</p>
        </div>
      } @else {
        <nav class="job-tabs" role="group" aria-label="Job views">
          <button type="button" [attr.aria-pressed]="activeTab() === 'search'" [class.active]="activeTab() === 'search'" (click)="setTab('search')">Search</button>
          <button type="button" [attr.aria-pressed]="activeTab() === 'favorites'" [class.active]="activeTab() === 'favorites'" (click)="setTab('favorites')">Favorites@if (savedJobCount() !== null) { <span class="tab-count">{{ savedJobCount() }}</span> }</button>
        </nav>

        @if (activeTab() === 'search') {
          <form class="filters-bar" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
            <div class="filter-field">
              <label for="organization">Organization</label>
              <input id="organization" type="search" formControlName="organization" autocomplete="organization" placeholder="Company name" />
            </div>
            <div class="filter-field">
              <label for="location">Location</label>
              <input id="location" type="search" formControlName="location" autocomplete="location" placeholder="City or country" />
            </div>
            <div class="filter-field remote-filter">
              <label for="is-remote">Is remote</label>
              <input id="is-remote" type="checkbox" formControlName="isRemote" />
            </div>
            <div class="filter-field salary-fields">
              <div><label for="salary-min">Minimum salary</label><input id="salary-min" type="number" min="0" step="any" formControlName="salaryMin" inputmode="decimal" placeholder="Any" /></div>
              <div><label for="salary-max">Maximum salary</label><input id="salary-max" type="number" min="0" step="any" formControlName="salaryMax" inputmode="decimal" placeholder="Any" /></div>
            </div>
            @if (filterForm.hasError('salaryRange')) {
              <p class="validation-message" role="alert">Minimum salary must not exceed maximum salary.</p>
            }
            <div class="filter-field actions">
              <button type="submit" class="apply-button">Apply filters</button>
              <button type="button" class="clear-button" (click)="clearFilters()">Clear filters</button>
            </div>
          </form>

          <section class="results-panel" aria-labelledby="results-title">
            @let currentState = state();
            <div class="panel-heading results-heading">
              <div><p class="eyebrow">Opportunities</p><h2 id="results-title">Search results</h2></div>
              @if (currentState.status === 'loaded') {
                <span class="result-count">{{ currentState.value.total }} {{ currentState.value.total === 1 ? 'role' : 'roles' }}</span>
              }
            </div>
            @switch (currentState.status) {
              @case ('loading') {
                <div class="empty-results" role="status" aria-live="polite"><span class="loading-indicator" aria-hidden="true"></span><h3>Loading jobs</h3><p>We're gathering the latest opportunities.</p></div>
              }
              @case ('error') {
                <div class="empty-results" role="alert"><span class="empty-icon error-icon" aria-hidden="true">!</span><h3>We couldn't load jobs</h3><p>{{ currentState.error.message }}</p><button type="button" class="retry-button" (click)="loadJobs()">Try again</button></div>
              }
              @case ('loaded') {
                @if (currentState.value.jobs.length === 0) {
                  <div class="empty-results" role="status"><span class="empty-icon" aria-hidden="true">↗</span><h3>No jobs found</h3><p>There are no matching jobs right now. Please check back later.</p></div>
                } @else {
                  <p-table
                    [value]="currentState.value.jobs"
                    [first]="currentState.value.offset"
                    [paginator]="true"
                    [paginatorPosition]="'both'"
                    [rows]="currentState.value.limit"
                    [totalRecords]="currentState.value.total"
                    [rowsPerPageOptions]="[10, 20, 50]"
                    [lazy]="true"
                    [loading]="state().status === 'loading'"
                    [sortMode]="'multiple'"
                    (onLazyLoad)="onLazyLoad($event)"
                    (onSort)="onSort($event)"
                    [showCurrentPageReport]="true"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} roles"
                    [tableStyle]="{ width: '100%', 'table-layout': 'fixed' }"
                    role="table"
                  >
                    <ng-template pTemplate="header"><tr>
                      <th scope="col" class="title-column" pSortableColumn="title">Title <p-sortIcon field="title"></p-sortIcon></th>
                      <th scope="col" class="organization-column" pSortableColumn="organization">Organization <p-sortIcon field="organization"></p-sortIcon></th>
                      <th scope="col" class="location-column">Location</th>
                      <th scope="col" class="salary-column" pSortableColumn="salary">Salary <p-sortIcon field="salary"></p-sortIcon></th>
                      <th scope="col" class="posted-column" pSortableColumn="posted_at">Posted <p-sortIcon field="posted_at"></p-sortIcon></th>
                      <th scope="col" class="remote-column">Remote</th>
                      <th scope="col" class="save-column">Save Job</th>
                    </tr></ng-template>
                    <ng-template pTemplate="body" let-job><tr class="job-row">
                      <td class="title-cell"><a class="job-title" [routerLink]="['/jobs', job.id]" [title]="job.title">{{ job.title }}</a></td>
                      <td class="organization-cell" [title]="job.organization ?? ''">{{ job.organization ?? '—' }}</td>
                      <td class="location-cell" [title]="job.location ?? ''">{{ job.location ?? '—' }}</td>
                      <td>{{ formatSalary(job) }}</td>
                      <td>{{ formatPostedDate(job) }}</td>
                      <td class="remote-cell"><span [attr.aria-label]="job.allow_remote === 1 ? 'Remote' : 'Not remote'">{{ job.allow_remote === 1 ? '✓' : '—' }}</span></td>
                      <td class="save-cell"><button type="button" class="save-button" [class.saved]="savedJobIds().has(job.id)" [attr.aria-pressed]="savedJobIds().has(job.id)" [disabled]="savingJobId() === job.id" (click)="toggleSavedJob(job)">{{ savingJobId() === job.id ? 'Saving…' : savedJobIds().has(job.id) ? 'Saved' : 'Save Job' }}</button>
                        @if (jobActionErrorId() === job.id) { <span class="save-error" role="alert">{{ jobActionError() }}</span> }
                      </td>
                    </tr></ng-template>
                    <ng-template pTemplate="emptymessage"><tr><td colspan="7" class="empty-cell"><div class="empty-results" role="status"><span class="empty-icon" aria-hidden="true">↗</span><h3>No jobs found</h3><p>There are no matching jobs right now. Please check back later.</p></div></td></tr></ng-template>
                    <ng-template pTemplate="loadingbody"><tr><td colspan="7" class="empty-cell"><div class="empty-results" role="status" aria-live="polite"><span class="loading-indicator" aria-hidden="true"></span><h3>Loading jobs</h3><p>We're gathering the latest opportunities.</p></div></td></tr></ng-template>
                  </p-table>
                }
              }
            }
          </section>
        } @else {
          <section class="results-panel favorites-panel" aria-labelledby="favorites-title">
            <div class="panel-heading results-heading"><div><p class="eyebrow">Your collection</p><h2 id="favorites-title">Favorite jobs</h2></div><button type="button" class="clear-button" (click)="loadFavorites()">Refresh</button></div>
            @let favorites = savedJobsState();
            @switch (favorites.status) {
              @case ('loading') { <div class="empty-results" role="status" aria-live="polite"><span class="loading-indicator" aria-hidden="true"></span><h3>Loading favorites</h3></div> }
              @case ('error') { <div class="empty-results" role="alert"><h3>We couldn't load your favorites</h3><p>{{ favorites.error.message }}</p><button type="button" class="retry-button" (click)="loadFavorites()">Try again</button></div> }
              @case ('loaded') {
                @if (jobActionErrorId() && jobActionError()) { <p class="favorites-error" role="alert">{{ jobActionError() }}</p> }
                @if (favorites.value.length === 0) { <div class="empty-results" role="status"><h3>No favorite jobs yet</h3><p>Save jobs from Search and they will appear here.</p><button type="button" class="retry-button" (click)="setTab('search')">Search jobs</button></div> }
                @else {
                  <table class="favorites-table"><thead><tr><th scope="col">Title</th><th scope="col">Organization</th><th scope="col">Location</th><th scope="col">Remote</th><th scope="col">Salary</th><th scope="col">Saved</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
                    <tbody>@for (item of favorites.value; track item.id) { <tr>
                      <td><a class="job-title" [routerLink]="['/jobs', item.job_id]" [title]="item.job?.title ?? 'Job details unavailable'">{{ item.job?.title ?? 'Job details unavailable' }}</a></td>
                      <td class="organization-cell" [title]="item.job?.organization ?? ''">{{ item.job?.organization ?? '—' }}</td>
                      <td class="location-cell" [title]="item.job?.location ?? ''">{{ item.job?.location ?? '—' }}</td>
                      <td class="remote-cell"><span [attr.aria-label]="item.job?.allow_remote === 1 ? 'Remote' : 'Not remote'">{{ item.job?.allow_remote === 1 ? '✓' : '—' }}</span></td>
                      <td>{{ item.job ? formatSalary(item.job) : '—' }}</td><td>{{ formatSavedDate(item.created_at) }}</td><td>{{ item.status === 'applied' ? 'Applied' : 'Saved' }}</td>
                      <td><button type="button" class="remove-button" [disabled]="savingJobId() === item.job_id" (click)="removeFavorite(item.job_id)">{{ savingJobId() === item.job_id ? 'Removing…' : 'Remove' }}</button></td>
                    </tr> }</tbody>
                  </table>
                }
              }
              @case ('idle') { <p>Favorites have not been loaded.</p> }
            }
          </section>
        }
      }
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

    .desktop-only-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 30rem;
      padding: 2rem;
      text-align: center;
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
      color: var(--color-ink);
    }

    .desktop-only-message p {
      margin: 0;
      font-size: 1rem;
      color: var(--color-muted);
    }

    .filters-bar {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
      justify-content: space-between;
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

    .filter-field input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
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

    .filter-field input {
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
  private _sortChangeNavigating = false;
  protected readonly state = signal<AsyncState<JobListResponse>>({ status: 'loading' });
  protected readonly savedJobIds = signal<Set<string>>(new Set());
  protected readonly savedJobsState = signal<AsyncState<SavedJob[]>>({ status: 'loading' });
  protected readonly savedJobCount = computed(() => {
    const saved = this.savedJobsState();
    return saved.status === 'loaded' ? saved.value.length : null;
  });
  protected readonly activeTab = signal<'search' | 'favorites'>('search');
  protected readonly savingJobId = signal<string | null>(null);
  protected readonly jobActionErrorId = signal<string | null>(null);
  protected readonly jobActionError = signal<string | null>(null);
  protected readonly filterForm = new FormGroup({
    organization: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
    isRemote: new FormControl<boolean | null>(null),
    salaryMin: new FormControl<number | null>(null, [Validators.min(0)]),
    salaryMax: new FormControl<number | null>(null, [Validators.min(0)]),
  }, { validators: salaryRangeValidator });
  private currentQuery: JobListQuery = {};
  protected readonly isDesktop = signal(window.innerWidth >= VIEWPORT_BREAKPOINT);

  protected readonly loadedResponse = computed(() => {
    const s = this.state();
    return s.status === 'loaded' ? s.value : null;
  });

  protected formatSalary(job: JobListItem): string {
    const parts: string[] = [];
    if (job.salary_min) parts.push(job.salary_min);
    if (job.salary_max) parts.push(job.salary_max);
    if (job.salary_currency) parts.push(job.salary_currency);
    if (job.salary_unit) parts.push(`/ ${job.salary_unit}`);
    return parts.length > 0 ? parts.join(' ') : '-';
  }

  protected formatPostedDate(job: JobListItem): string {
    const value = job.posted_at ?? job.date_posted;
    if (!value) return '-';
    return formatDate(value) ?? '-';
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.isDesktop.set((event.target as Window).innerWidth >= VIEWPORT_BREAKPOINT);
  }

  protected formatSavedDate(value: string): string {
    return formatDate(value) ?? '—';
  }

  ngOnInit(): void {
    this.loadFavorites();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (this._sortChangeNavigating) {
          this._sortChangeNavigating = false;
          return;
        }
        const query = this.queryFromParams(params);
        this.filterForm.patchValue({
          organization: query.organization ?? '',
          location: query.location ?? '',
          isRemote: query.allow_remote ?? null,
          salaryMin: query.salary_min ?? null,
          salaryMax: query.salary_max ?? null,
        });
        this.loadJobs(query);
      });
  }

  protected setTab(tab: 'search' | 'favorites'): void {
    this.activeTab.set(tab);
    if (tab === 'favorites' && this.savedJobsState().status === 'idle') {
      this.loadFavorites();
    }
  }

  protected loadFavorites(): void {
    this.savedJobsState.set({ status: 'loading' });
    this.jobsApi.listSavedJobs().subscribe({
      next: (savedJobs) => {
        this.savedJobIds.set(new Set(savedJobs.map((item) => item.job_id)));
        if (savedJobs.length === 0) {
          this.savedJobsState.set({ status: 'loaded', value: [] });
          return;
        }

        const hydratedJobs = savedJobs.map((item) => {
          if (item.job?.title) return of(item);
          return this.jobsApi.getById(item.job_id).pipe(
            map((job) => ({ ...item, job })),
            catchError(() => of({ ...item, job: this.missingJobDetails(item.job_id) })),
          );
        });
        forkJoin(hydratedJobs).subscribe({
          next: (items) => this.savedJobsState.set({ status: 'loaded', value: items }),
          error: (error: ApiError) => this.savedJobsState.set({ status: 'error', error }),
        });
      },
      error: (error: ApiError) => this.savedJobsState.set({ status: 'error', error }),
    });
  }

  protected toggleSavedJob(job: JobListItem): void {
    if (this.savingJobId() !== null) return;
    this.savingJobId.set(job.id);
    this.jobActionErrorId.set(null);
    this.jobActionError.set(null);
    const isSaved = this.savedJobIds().has(job.id);
    if (isSaved) {
      this.jobsApi.unsaveJob(job.id).subscribe({
        next: () => {
          this.savingJobId.set(null);
          this.removeSavedJobLocally(job.id);
        },
        error: (error: ApiError) => this.handleFavoriteError(job.id, error, 'Could not remove this favorite.'),
      });
    } else {
      this.jobsApi.saveJob(job.id, 'saved').subscribe({
        next: () => {
          this.savingJobId.set(null);
          this.savedJobIds.update((ids) => new Set([...ids, job.id]));
          this.loadFavorites();
        },
        error: (error: ApiError) => this.handleFavoriteError(job.id, error, 'Could not save this job.'),
      });
    }
  }

  private removeSavedJobLocally(jobId: string): void {
    this.savedJobIds.update((ids) => {
      const next = new Set(ids);
      next.delete(jobId);
      return next;
    });
    this.savedJobsState.update((state) => {
      const items = state.status === 'loaded' ? state.value : [];
      return {
        status: 'loaded',
        value: items.filter((entry) => entry.job_id !== jobId),
      };
    });
  }

  private missingJobDetails(jobId: string): JobListItem {
    return {
      id: jobId,
      source_id: '',
      title: 'Job details unavailable',
      organization: null,
      job_url: '',
      description_text: null,
      allow_remote: null,
      location: null,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      salary_unit: null,
      date_posted: null,
      posted_at: null,
    };
  }

  private handleFavoriteError(jobId: string, error: ApiError, fallback: string): void {
    this.savingJobId.set(null);
    this.jobActionErrorId.set(jobId);
    this.jobActionError.set(error.message ?? fallback);
  }

  protected removeFavorite(jobId: string): void {
    if (this.savingJobId() !== null) return;
    this.savingJobId.set(jobId);
    this.jobActionErrorId.set(null);
    this.jobActionError.set(null);
    this.jobsApi.unsaveJob(jobId).subscribe({
      next: () => {
        this.savingJobId.set(null);
        this.removeSavedJobLocally(jobId);
      },
      error: (error: ApiError) => this.handleFavoriteError(jobId, error, 'Could not remove this favorite.'),
    });
  }

  protected applyFilters(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { organization, location, isRemote, salaryMin, salaryMax } = this.filterForm.getRawValue();
    const query: JobListQuery = {
      limit: this.currentQuery.limit,
    };
    const normalizedOrganization = organization.trim();
    if (normalizedOrganization) {
      query.organization = normalizedOrganization;
    }
    const normalizedLocation = location.trim();
    if (normalizedLocation) {
      query.location = normalizedLocation;
    }
    if (isRemote === true) {
      query.allow_remote = true;
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
    this.filterForm.reset({ organization: '', location: '', isRemote: null, salaryMin: null, salaryMax: null });
    this.applyFilters();
  }

  protected loadJobs(query: JobListQuery = this.currentQuery): void {
    const currentSorts = this.currentQuery.sorts ?? [];
    const newSorts = query.sorts ?? [];
    if (Object.keys(this.currentQuery).length > 0 &&
        this.currentQuery.limit === query.limit &&
        this.currentQuery.offset === query.offset &&
        this.currentQuery.organization === query.organization &&
        this.currentQuery.location === query.location &&
        this.currentQuery.allow_remote === query.allow_remote &&
        this.currentQuery.salary_min === query.salary_min &&
        this.currentQuery.salary_max === query.salary_max &&
        JSON.stringify(currentSorts) === JSON.stringify(newSorts)) {
      return;
    }
    this.currentQuery = query;
    this.state.set({ status: 'loading' });
    this.jobsApi.list(query).subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: ApiError) => this.state.set({ status: 'error', error }),
    });
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const query: JobListQuery = {
      ...this.currentQuery,
      limit: event.rows ?? this.currentQuery.limit ?? 20,
      offset: event.first ?? 0,
    };

    if (event.multiSortMeta && event.multiSortMeta.length > 0) {
      const sorts: SortCriterion[] = event.multiSortMeta.map((m) => ({
        field: m.field as JobSortField,
        dir: m.order === 1 ? 'asc' : 'desc',
      }));
      query.sorts = sorts;
      query.sort = sorts[0].field;
      query.sortDir = sorts[0].dir;
    }

    this._sortChangeNavigating = true;
    this.loadJobs(query);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.toUrlParams(query),
    }).then(() => {
      this._sortChangeNavigating = false;
    });
  }

  protected onSort(event: { multisortmeta?: { field: string; order: number }[] }): void {
    if (!event.multisortmeta || event.multisortmeta.length === 0) {
      return;
    }

    const sorts: SortCriterion[] = event.multisortmeta.map((m) => ({
      field: m.field as JobSortField,
      dir: m.order === 1 ? 'asc' : 'desc',
    }));

    const query: JobListQuery = {
      ...this.currentQuery,
      sorts,
      sort: sorts[0].field,
      sortDir: sorts[0].dir,
    };

    this._sortChangeNavigating = true;
    this.loadJobs(query);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.toUrlParams(query),
    }).then(() => {
      this._sortChangeNavigating = false;
    });
  }

  private queryFromParams(params: ParamMap): JobListQuery {
    const query: JobListQuery = {};
    const limit = this.integerParam(params.get('limit'), 1, 100);
    const offset = this.integerParam(params.get('offset'), 0);
    const salaryMinimum = this.numberParam(params.get('salary_min'));
    const salaryMaximum = this.numberParam(params.get('salary_max'));
    const organization = params.get('organization')?.trim();
    const location = params.get('location')?.trim();
    const allowRemoteRaw = params.get('allow_remote');
    const sortFields = params.getAll('sort').map((v) => v.trim()).filter((v) => v.length > 0);
    const sortDirs = params.getAll('sortDir').map((v) => v.trim());

    if (limit !== undefined) query.limit = limit;
    if (offset !== undefined) query.offset = offset;
    if (salaryMinimum !== undefined) query.salary_min = salaryMinimum;
    if (salaryMaximum !== undefined) query.salary_max = salaryMaximum;
    if (organization) query.organization = organization;
    if (location) query.location = location;
    if (allowRemoteRaw === 'true') query.allow_remote = true;

    const sorts: SortCriterion[] = [];
    for (let i = 0; i < sortFields.length; i++) {
      const field = sortFields[i];
      const dir: SortDirection = i < sortDirs.length && (sortDirs[i] === 'asc' || sortDirs[i] === 'desc')
        ? (sortDirs[i] as SortDirection)
        : 'desc';
      if (isJobSortField(field)) {
        sorts.push({ field, dir });
      }
    }
    if (sorts.length > 0) {
      query.sorts = sorts;
    } else {
      const sort = params.get('sort');
      const sortDir = params.get('sortDir');
      if (isJobSortField(sort)) query.sort = sort;
      if (sortDir === 'asc' || sortDir === 'desc') query.sortDir = sortDir;
    }

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
    const params: Params = {
      organization: query.organization ?? null,
      location: query.location ?? null,
      salary_min: query.salary_min ?? null,
      salary_max: query.salary_max ?? null,
      limit: query.limit ?? null,
      offset: query.offset ?? null,
    };

    if (query.allow_remote === true) {
      params['allow_remote'] = 'true';
    }

    if (query.sorts && query.sorts.length > 0) {
      params['sort'] = query.sorts.map((c) => c.field);
      params['sortDir'] = query.sorts.map((c) => c.dir);
    } else if (query.sort) {
      params['sort'] = query.sort;
      if (query.sortDir) {
        params['sortDir'] = query.sortDir;
      }
    }

    return params;
  }
}
