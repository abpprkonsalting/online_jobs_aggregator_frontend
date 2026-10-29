import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { SavedJob } from '../../../core/models/api.models';
import { JobsApiService } from '../data-access/jobs-api.service';

@Component({
  selector: 'app-saved-jobs-page',
  imports: [RouterLink, DatePipe],
  template: `
    <section class="saved-jobs-page" aria-labelledby="page-title">
      <header class="page-header">
        <a class="back-link" routerLink="/account">← Back to account</a>
        <p class="eyebrow">Saved jobs</p>
        <h1 id="page-title">Your saved jobs</h1>
        <p>Track jobs you want to apply to or have already applied for.</p>
      </header>

      @let saved = savedJobsState();
      @switch (saved.status) {
        @case ('loading') {
          <div class="message-state" role="status" aria-live="polite">
            <span class="loading-indicator" aria-hidden="true"></span>
            <h1>Loading saved jobs</h1>
          </div>
        }
        @case ('error') {
          <div class="message-state" role="alert">
            <h1>We couldn't load your saved jobs</h1>
            <p>{{ saved.error.message }}</p>
            <button type="button" class="retry-button" (click)="loadSavedJobs()">Try again</button>
          </div>
        }
        @case ('loaded') {
          @if (saved.value.length === 0) {
            <div class="message-state" role="status">
              <h1>No saved jobs yet</h1>
              <p>Save jobs from the search results to keep track of them here.</p>
              <a class="retry-button" routerLink="/jobs">Browse jobs</a>
            </div>
          } @else {
            <div class="saved-list">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Job</th>
                    <th scope="col">Organization</th>
                    <th scope="col">Status</th>
                    <th scope="col">Saved</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of saved.value; track item.id) {
                    <tr>
                      <td>
                        <a [routerLink]="['/jobs', item.job_id]">{{ item.job.title }}</a>
                      </td>
                      <td>{{ item.job.organization ?? 'Organization not listed' }}</td>
                      <td>
                        <span class="status-badge" [class.applied]="item.status === 'applied'">
                          {{ item.status }}
                        </span>
                      </td>
                      <td>{{ item.created_at | date:'mediumDate' }}</td>
                      <td class="actions-cell">
                        <button
                          type="button"
                          class="status-toggle"
                          (click)="toggleStatus(item)"
                        >
                          {{ item.status === 'saved' ? 'Mark applied' : 'Mark saved' }}
                        </button>
                        <button type="button" class="remove-button" (click)="removeJob(item.job_id)">
                          Remove
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
        @case ('idle') {
          <p>Saved jobs are not loaded.</p>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .saved-jobs-page {
      max-width: 70rem;
      margin: 0 auto;
      min-width: 0;
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

    .page-header {
      max-width: 44rem;
    }

    .eyebrow {
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
    }

    .page-header > p:last-child {
      margin: 0.65rem 0 0;
      color: var(--color-muted);
      line-height: 1.6;
    }

    .message-state {
      max-width: 42rem;
      padding: clamp(1.5rem, 5vw, 3rem);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
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

    .retry-button {
      display: inline-flex;
      min-height: 2.75rem;
      margin-top: 1.25rem;
      padding: 0.6rem 1rem;
      border: 0;
      border-radius: 0.6rem;
      background: var(--color-ink);
      color: #fff;
      cursor: pointer;
      font-weight: 650;
      text-decoration: none;
    }

    .retry-button:hover {
      background: var(--color-accent-dark);
    }

    .saved-list {
      margin-top: 1rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th, td {
      padding: 0.8rem 0.65rem;
      border-bottom: 1px solid var(--color-border);
      vertical-align: top;
    }

    th {
      font-size: 0.85rem;
      font-weight: 650;
      white-space: nowrap;
      color: var(--color-muted);
    }

    td a {
      color: var(--color-ink);
      font-weight: 650;
      text-decoration: none;
    }

    td a:hover {
      color: var(--color-accent-dark);
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    .status-badge {
      display: inline-flex;
      padding: 0.25rem 0.55rem;
      border-radius: 99px;
      background: var(--color-subtle);
      text-transform: capitalize;
      font-size: 0.8rem;
      font-weight: 650;
    }

    .status-badge.applied {
      background: #e3f4e9;
      color: #22623f;
    }

    .actions-cell {
      display: flex;
      gap: 0.5rem;
    }

    .status-toggle, .remove-button {
      min-height: 2.65rem;
      padding: 0.55rem 0.85rem;
      border-radius: 0.55rem;
      border: 0;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 650;
    }

    .status-toggle {
      background: var(--color-surface);
      color: var(--color-ink);
      border: 1px solid var(--color-border);
    }

    .status-toggle:hover {
      background: var(--color-border);
    }

    .remove-button {
      background: #fff0ec;
      color: #9b321d;
    }

    .remove-button:hover {
      background: #fee4df;
    }

    .save-error {
      margin-top: 0.5rem;
      color: #9b321d;
      font-size: 0.8rem;
    }

    @media (max-width: 640px) {
      table {
        font-size: 0.85rem;
      }
      th, td {
        padding: 0.6rem 0.4rem;
      }
      .actions-cell {
        flex-direction: column;
      }
    }
  `,
})
export class SavedJobsPage implements OnInit {
  private readonly jobsApi = inject(JobsApiService);
  protected readonly savedJobsState = signal<AsyncState<SavedJob[]>>({ status: 'loading' });

  ngOnInit(): void {
    this.loadSavedJobs();
  }

  protected loadSavedJobs(): void {
    this.savedJobsState.set({ status: 'loading' });
    this.jobsApi.listSavedJobs().subscribe({
      next: (saved) => this.savedJobsState.set({ status: 'loaded', value: saved }),
      error: (error: ApiError) => this.savedJobsState.set({ status: 'error', error }),
    });
  }

  protected toggleStatus(item: SavedJob): void {
    const newStatus: 'saved' | 'applied' = item.status === 'saved' ? 'applied' : 'saved';
    this.jobsApi.updateSavedJobStatus(item.job_id, newStatus).subscribe({
      next: () => {
        this.savedJobsState.update((state) => {
          if (state.status !== 'loaded') return state;
          return {
            status: 'loaded',
            value: state.value.map((i) =>
              i.id === item.id ? { ...i, status: newStatus } : i
            ),
          };
        });
      },
      error: (error: ApiError) => {
        this.savedJobsState.update((state) => {
          if (state.status !== 'loaded') return state;
          return { status: 'error', error };
        });
      },
    });
  }

  protected removeJob(jobId: string): void {
    this.jobsApi.unsaveJob(jobId).subscribe({
      next: () => {
        this.savedJobsState.update((state) => {
          if (state.status !== 'loaded') return state;
          return {
            status: 'loaded',
            value: state.value.filter((i) => i.job_id !== jobId),
          };
        });
      },
      error: (error: ApiError) => {
        this.savedJobsState.update((state) => {
          if (state.status !== 'loaded') return state;
          return { status: 'error', error };
        });
      },
    });
  }
}
