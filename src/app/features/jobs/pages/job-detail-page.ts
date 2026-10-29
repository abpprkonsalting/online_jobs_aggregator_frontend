import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { JobDetail } from '../../../core/models/api.models';
import { JobsApiService } from '../data-access/jobs-api.service';

@Component({
  selector: 'app-job-detail-page',
  imports: [RouterLink],
  template: `
    <section class="detail-page" aria-labelledby="job-title">
      <a class="back-link" routerLink="/jobs">← Back to job search</a>
      @let currentState = state();
      @switch (currentState.status) {
        @case ('loading') {
          <div class="message-state" role="status" aria-live="polite">
            <span class="loading-indicator" aria-hidden="true"></span>
            <h1 id="job-title">Loading job details</h1>
          </div>
        }
        @case ('error') {
          @if (currentState.error.status === 404) {
            <div class="message-state" role="status">
              <p class="error-code">404</p>
              <h1 id="job-title">Job not found</h1>
              <p>This job may have been removed or its link may be out of date.</p>
            </div>
          } @else {
            <div class="message-state" role="alert">
              <h1 id="job-title">We couldn’t load this job</h1>
              <p>{{ currentState.error.message }}</p>
              <button type="button" class="retry-button" (click)="retry()">Try again</button>
            </div>
          }
        }
        @case ('loaded') {
          <article class="job-detail">
            <header class="detail-header">
              <p class="eyebrow">Job details</p>
              <h1 id="job-title">{{ currentState.value.title }}</h1>
              <p class="organization">{{ currentState.value.organization ?? 'Organization not listed' }}</p>
              <ul class="job-facts" aria-label="Job summary">
                @if (currentState.value.allow_remote === 1) {
                  <li>Remote</li>
                } @else if (currentState.value.allow_remote === 0) {
                  <li>On-site</li>
                }
                @if (postedDateLabel(); as postedDate) {
                  <li><time [attr.datetime]="currentState.value.posted_at ?? currentState.value.date_posted">{{ postedDate }}</time></li>
                }
                @if (daysWaitingLabel(); as waiting) {
                  <li>{{ waiting }}</li>
                }
              </ul>
              <a
                class="original-link"
                [href]="currentState.value.job_url"
                target="_blank"
                rel="noopener noreferrer"
              >
                View original posting
              </a>

              @if (!isSaved()) {
                <button
                  type="button"
                  class="save-button"
                  (click)="toggleSave()"
                >
                  Save job
                </button>
              } @else {
                <button
                  type="button"
                  class="save-button saved"
                  (click)="toggleSave()"
                >
                  Saved — {{ savedStatus() }}
                </button>
              }

              @if (saveError(); as error) {
                <p class="save-error" role="alert">{{ error }}</p>
              }
            </header>

            <div class="detail-content">
              <section class="detail-section" aria-labelledby="description-title">
                <h2 id="description-title">Description</h2>
                @if (currentState.value.description_text) {
                  <div class="description">{{ currentState.value.description_text }}</div>
                } @else {
                  <p class="unavailable">No description was provided.</p>
                }
              </section>

              <div class="detail-grid">
                <section class="detail-section" aria-labelledby="salary-title">
                  <h2 id="salary-title">Salary</h2>
                  @if (salaryLabel(); as salary) {
                    <p>{{ salary }}</p>
                  } @else {
                    <p class="unavailable">Salary information is not available.</p>
                  }
                </section>

                <section class="detail-section" aria-labelledby="location-title">
                  <h2 id="location-title">Location</h2>
                  @if (locationLabels().length > 0) {
                    <ul>
                      @for (location of locationLabels(); track location) {
                        <li>{{ location }}</li>
                      }
                    </ul>
                  } @else {
                    <p class="unavailable">Location information is not available.</p>
                  }
                </section>

                <section class="detail-section" aria-labelledby="categories-title">
                  <h2 id="categories-title">Categories</h2>
                  @if (currentState.value.categories.length > 0) {
                    <ul class="tag-list">
                      @for (category of currentState.value.categories; track category.id) {
                        <li>{{ category.name }}</li>
                      }
                    </ul>
                  } @else {
                    <p class="unavailable">No categories are listed.</p>
                  }
                </section>

                <section class="detail-section" aria-labelledby="skills-title">
                  <h2 id="skills-title">Skills</h2>
                  @if (currentState.value.skills.length > 0) {
                    <ul class="tag-list">
                      @for (skill of currentState.value.skills; track skill.id) {
                        <li>{{ skill.name }}</li>
                      }
                    </ul>
                  } @else {
                    <p class="unavailable">No skills are listed.</p>
                  }
                </section>
              </div>
            </div>
          </article>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .detail-page {
      max-width: 70rem;
      min-width: 0;
      margin: 0 auto;
    }

    .back-link {
      display: inline-flex;
      min-height: 2.5rem;
      align-items: center;
      margin-bottom: 1.5rem;
      color: var(--color-accent-dark);
      font-weight: 650;
      text-decoration: none;
    }

    .back-link:hover {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    .detail-header {
      padding: clamp(1.25rem, 4vw, 2.5rem);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
    }

    .eyebrow,
    .error-code {
      margin: 0 0 0.65rem;
      color: var(--color-accent-dark);
      font-size: 0.75rem;
      font-weight: 750;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: clamp(2rem, 5vw, 3.5rem);
      letter-spacing: -0.06em;
      line-height: 1.08;
      overflow-wrap: anywhere;
    }

    .organization {
      margin: 0.65rem 0 0;
      color: var(--color-muted);
      font-size: 1.1rem;
    }

    .job-facts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 1.25rem;
      margin: 1rem 0 0;
      padding: 0;
      color: var(--color-muted);
      list-style: none;
    }

    .original-link,
    .retry-button {
      display: inline-flex;
      min-height: 2.75rem;
      align-items: center;
      justify-content: center;
      margin-top: 1.25rem;
      padding: 0.6rem 1rem;
      border: 0;
      border-radius: 0.6rem;
      background: var(--color-ink);
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 650;
      text-decoration: none;
    }

    .save-button {
      display: inline-flex;
      min-height: 2.75rem;
      align-items: center;
      justify-content: center;
      margin-top: 1.25rem;
      padding: 0.6rem 1rem;
      border: 0;
      border-radius: 0.6rem;
      background: var(--color-subtle);
      color: var(--color-ink);
      cursor: pointer;
      font: inherit;
      font-weight: 650;
    }

    .save-button:hover {
      background: var(--color-border);
    }

    .save-button.saved {
      background: var(--color-accent-dark);
      color: #fff;
    }

    .save-button.saved:hover {
      background: #1e5a43;
    }

    .save-error {
      margin-top: 0.5rem;
      color: #9b321d;
      font-size: 0.8rem;
    }

    .original-link:hover,
    .retry-button:hover {
      background: var(--color-accent-dark);
    }

    .detail-content {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .detail-section {
      min-width: 0;
      padding: 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      background: var(--color-surface);
    }

    .detail-section h2 {
      margin: 0 0 0.8rem;
      font-size: 1.05rem;
    }

    .detail-section p,
    .detail-section ul {
      margin: 0;
      color: var(--color-muted);
      line-height: 1.65;
    }

    .description {
      color: var(--color-ink);
      line-height: 1.7;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .detail-section ul {
      padding-left: 1.25rem;
    }

    .detail-section .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0;
      list-style: none;
    }

    .tag-list li {
      padding: 0.3rem 0.6rem;
      border-radius: 999px;
      background: #eef6f0;
      color: #386445;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .unavailable {
      color: var(--color-muted);
    }

    .message-state {
      max-width: 42rem;
      padding: clamp(1.5rem, 5vw, 3rem);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
    }

    .message-state > p:not(.error-code) {
      color: var(--color-muted);
      line-height: 1.6;
    }

    .loading-indicator {
      display: block;
      width: 2rem;
      aspect-ratio: 1;
      margin-bottom: 1rem;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 800ms linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .detail-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .loading-indicator { animation-duration: 2s; }
    }
  `,
})
export class JobDetailPage implements OnInit {
  private readonly jobsApi = inject(JobsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly state = signal<AsyncState<JobDetail>>({ status: 'loading' });
  private currentJobId: string | null = null;
  protected readonly isSaved = signal<boolean>(false);
  protected readonly savedStatus = signal<'saved' | 'applied'>('saved');
  protected readonly saveError = signal<string | null>(null);

  protected readonly salaryLabel = computed(() => {
    const current = this.state();
    if (current.status !== 'loaded') return null;

    const job = current.value;
    const minimum = this.formatAmount(job.salary_min);
    const maximum = this.formatAmount(job.salary_max);
    if (!minimum && !maximum) return null;

    const range = minimum && maximum
      ? `${minimum}–${maximum}`
      : minimum
        ? `From ${minimum}`
        : `Up to ${maximum}`;
    const currency = job.salary_currency ? ` ${job.salary_currency}` : '';
    const unit = job.salary_unit ? ` per ${job.salary_unit.toLowerCase()}` : '';
    return `${range}${currency}${unit}`;
  });

  protected readonly locationLabels = computed(() => {
    const current = this.state();
    if (current.status !== 'loaded') return [];

    return current.value.locations
      .map((location) => location.raw_text?.trim()
        || [location.city_name, location.country_name].filter((part): part is string => Boolean(part)).join(', '))
      .filter((location) => location.length > 0);
  });

  protected readonly postedDateLabel = computed(() => {
    const current = this.state();
    if (current.status !== 'loaded') return null;

    const value = current.value.posted_at ?? current.value.date_posted;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : `Posted ${date.toLocaleDateString()}`;
  });

  protected readonly daysWaitingLabel = computed(() => {
    const current = this.state();
    if (current.status !== 'loaded' || current.value.days_waiting === null) return null;

    const days = current.value.days_waiting;
    return days <= 0 ? 'Posted today' : `Waiting ${days} ${days === 1 ? 'day' : 'days'}`;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (id === null) {
          this.currentJobId = null;
          this.state.set({
            status: 'error',
            error: new ApiError('Job not found.', 'not-found', 404),
          });
          return;
        }
        this.currentJobId = id;
        this.loadJob(id);
      });
  }

  protected retry(): void {
    if (this.currentJobId !== null) {
      this.loadJob(this.currentJobId);
    }
  }

  private loadJob(id: string): void {
    this.state.set({ status: 'loading' });
    this.jobsApi.getById(id).subscribe({
      next: (value) => {
        this.state.set({ status: 'loaded', value });
      },
      error: (error: ApiError) => this.state.set({ status: 'error', error }),
    });
  }

  protected toggleSave(): void {
    this.saveError.set(null);
    if (this.isSaved()) {
      this.jobsApi.unsaveJob(this.currentJobId!).subscribe({
        next: () => {
          this.isSaved.set(false);
          this.saveError.set(null);
        },
        error: (error: ApiError) => {
          this.saveError.set(error.message ?? 'Failed to unsave job.');
        },
      });
    } else {
      this.jobsApi.saveJob(this.currentJobId!, this.savedStatus()).subscribe({
        next: () => {
          this.isSaved.set(true);
          this.saveError.set(null);
        },
        error: (error: ApiError) => {
          this.saveError.set(error.message ?? 'Failed to save job.');
        },
      });
    }
  }

  private formatAmount(value: string | null): string | null {
    if (value === null || value.trim() === '') return null;
    const amount = Number(value);
    return Number.isFinite(amount)
      ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : null;
  }
}
