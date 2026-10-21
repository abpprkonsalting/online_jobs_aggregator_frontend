import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobListItem } from '../../../core/models/api.models';

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
