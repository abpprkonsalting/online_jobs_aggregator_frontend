import { Component, computed, input, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobListItem } from '../../../core/models/api.models';
import { JobsApiService } from '../data-access/jobs-api.service';
import { ApiError } from '../../../core/http/api-error';

@Component({
  selector: 'app-job-result-card',
  imports: [RouterLink],
  template: `
    <article class="job-card">
      <div class="card-content">
        <div class="card-heading">
          <h2>
            <a [routerLink]="['/jobs', job().id]">
              {{ job().title }}
            </a>
          </h2>
          <button
            type="button"
            class="save-button"
            [class.saved]="isSaved()"
            [attr.aria-pressed]="isSaved()"
            (click)="toggleSave()"
          >
            {{ isSaved() ? 'Saved' : 'Save job' }}
          </button>
          @if (job().allow_remote === 1) {
            <span class="work-style">Remote</span>
          } @else if (job().allow_remote === 0) {
            <span class="work-style">On-site</span>
          }
        </div>

        <ul class="job-meta" aria-label="Job details">
          @if (job().organization) {
            <li>{{ job().organization }}</li>
          }
          @if (location()) {
            <li>{{ location() }}</li>
          }
          @if (salaryLabel(); as salary) {
            <li>{{ salary }}</li>
          }
          @if (postedDateLabel(); as postedDate) {
            <li><time [attr.datetime]="job().posted_at ?? job().date_posted">{{ postedDate }}</time></li>
          }
        </ul>

        @if (saveError(); as error) {
          <p class="save-error" role="alert">{{ error }}</p>
        }
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .job-card {
      min-width: 0;
      padding: 1.25rem 1.4rem;
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      background: var(--color-surface);
      transition:
        border-color 140ms ease,
        box-shadow 140ms ease;
    }

    .job-card:hover {
      border-color: #d5ddd7;
      box-shadow: 0 0.5rem 1.5rem rgb(25 37 31 / 5%);
    }

    .card-content {
      min-width: 0;
    }

    .card-heading {
      display: flex;
      min-width: 0;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    h2 {
      min-width: 0;
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    h2 a {
      color: var(--color-ink);
      text-decoration: none;
    }

    h2 a:hover {
      color: var(--color-accent-dark);
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    .save-button {
      flex: 0 0 auto;
      min-height: 2.65rem;
      padding: 0.55rem 0.85rem;
      border-radius: 0.55rem;
      border: 0;
      background: var(--color-subtle);
      color: var(--color-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
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

    .work-style {
      flex: 0 0 auto;
      padding: 0.3rem 0.55rem;
      border-radius: 999px;
      background: #eef6f0;
      color: #386445;
      font-size: 0.72rem;
      font-weight: 650;
    }

    .job-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1.15rem;
      margin: 0.65rem 0 0;
      padding: 0;
      color: var(--color-muted);
      font-size: 0.85rem;
      line-height: 1.5;
      list-style: none;
    }

    .job-meta li {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .job-meta li + li::before {
      margin-right: 1.15rem;
      color: #a4aea7;
      content: "·";
    }

    .save-error {
      margin: 0.5rem 0 0;
      color: #9b321d;
      font-size: 0.8rem;
    }

    @media (max-width: 420px) {
      .job-card {
        padding: 1rem;
      }

      .card-heading {
        flex-direction: column-reverse;
        align-items: flex-start;
        gap: 0.5rem;
      }
    }
  `,
})
export class JobResultCard {
  readonly job = input.required<JobListItem>();
  readonly location = input<string | null>(null);
  readonly isSaved = input<boolean>(false);
  readonly savedStatus = input<'saved' | 'applied'>('saved');

  private readonly jobsApi = inject(JobsApiService);
  protected readonly saveError = signal<string | null>(null);

  protected readonly salaryLabel = computed(() => {
    const job = this.job();
    const minimum = this.formatAmount(job.salary_min);
    const maximum = this.formatAmount(job.salary_max);

    if (!minimum && !maximum) {
      return null;
    }

    const range = minimum && maximum
      ? `${minimum}–${maximum}`
      : minimum
        ? `From ${minimum}`
        : `Up to ${maximum}`;
    const currency = job.salary_currency ? ` ${job.salary_currency}` : '';
    const unit = job.salary_unit ? ` per ${job.salary_unit}` : '';

    return `${range}${currency}${unit}`;
  });

  protected readonly postedDateLabel = computed(() => {
    const value = this.job().posted_at ?? this.job().date_posted;
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? null
      : `Posted ${date.toLocaleDateString()}`;
  });

  protected toggleSave(): void {
    this.saveError.set(null);
    if (this.isSaved()) {
      this.jobsApi.unsaveJob(this.job().id).subscribe({
        next: () => {
          // Intentionally empty — card state is managed by parent
        },
        error: (error: ApiError) => {
          this.saveError.set(error.message ?? 'Failed to unsave job.');
        },
      });
    } else {
      this.jobsApi.saveJob(this.job().id, this.savedStatus()).subscribe({
        next: () => {
          // Intentionally empty — card state is managed by parent
        },
        error: (error: ApiError) => {
          this.saveError.set(error.message ?? 'Failed to save job.');
        },
      });
    }
  }

  private formatAmount(value: string | null): string | null {
    if (value === null || value.trim() === '') {
      return null;
    }

    const amount = Number(value);
    return Number.isFinite(amount)
      ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : null;
  }
}
