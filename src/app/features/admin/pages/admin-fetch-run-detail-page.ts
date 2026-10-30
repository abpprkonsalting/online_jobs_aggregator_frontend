import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JsonPipe } from '@angular/common';
import { FormatDatePipe } from '../../../core/pipes/format-date.pipe';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminFetchRun } from '../models/admin.models';

@Component({
  selector: 'app-admin-fetch-run-detail-page',
  imports: [RouterLink, JsonPipe, FormatDatePipe],
  template: `
    <section class="admin-page" aria-labelledby="page-title">
      <header class="page-header">
        <a class="back-link" routerLink="/admin/fetch-runs">← Back to fetch history</a>
        <p class="eyebrow">Administration</p>
        <h1 id="page-title">Fetch run details</h1>
      </header>

      <nav class="admin-navigation" aria-label="Administrator sections">
        <a routerLink="/admin">Users</a>
        <a routerLink="/admin/sources">Sources</a>
        <a routerLink="/admin/geographic-areas">Geographic areas</a>
        <a routerLink="/admin/assignments">Assignments</a>
        <a routerLink="/admin/fetch-runs">Fetch history</a>
        <a routerLink="/admin/master-data">Master data</a>
      </nav>

      @let run = runState();
      @switch (run.status) {
        @case ('loading') {
          <div class="message-state" role="status" aria-live="polite">
            <span class="loading-indicator" aria-hidden="true"></span>
            <h1>Loading fetch run</h1>
          </div>
        }
        @case ('error') {
          <div class="message-state" role="alert">
            <h1>We couldn't load this fetch run</h1>
            <p>{{ run.error.message }}</p>
            <button type="button" class="retry-button" (click)="loadRun()">Try again</button>
          </div>
        }
        @case ('loaded') {
          <article class="run-detail">
            <header class="run-header">
              <h2>Run {{ run.value.id }}</h2>
              <span class="status-badge" [class.running]="run.value.status === 'running'"
                [class.success]="run.value.status === 'success'" [class.failed]="run.value.status === 'failed'">
                {{ run.value.status }}
              </span>
            </header>

            <dl class="run-meta">
              <div class="meta-row">
                <dt>Source</dt>
                <dd>{{ run.value.source_id ?? 'Not associated with a source' }}</dd>
              </div>
              <div class="meta-row">
                <dt>Started</dt>
                <dd>{{ (run.value.started_at | formatDate:true) }}</dd>
              </div>
              <div class="meta-row">
                <dt>Finished</dt>
                <dd>{{ (run.value.finished_at | formatDate:true) ?? 'In progress' }}</dd>
              </div>
              <div class="meta-row">
                <dt>Jobs found</dt>
                <dd>{{ run.value.jobs_found }}</dd>
              </div>
              <div class="meta-row">
                <dt>New jobs</dt>
                <dd>{{ run.value.jobs_saved_new }}</dd>
              </div>
              <div class="meta-row">
                <dt>Updated jobs</dt>
                <dd>{{ run.value.jobs_saved_updated }}</dd>
              </div>
            </dl>

            @if (run.value.error_message) {
              <section class="detail-section">
                <h2>Error</h2>
                <p class="run-error">{{ run.value.error_message }}</p>
              </section>
            }

            @if (run.value.warnings?.length) {
              <section class="detail-section">
                <h2>Warnings</h2>
                <ul class="warning-list">
                  @for (warning of run.value.warnings; track warning) {
                    <li>{{ warning }}</li>
                  }
                </ul>
              </section>
            }

            @if (run.value.metadata) {
              <section class="detail-section">
                <h2>Metadata</h2>
                <pre>{{ run.value.metadata | json }}</pre>
              </section>
            }

            @if (!run.value.error_message && !run.value.warnings?.length && !run.value.metadata) {
              <p class="empty-message">No additional details recorded for this run.</p>
            }
          </article>
        }
        @case ('idle') {
          <p>Fetch run details are not loaded.</p>
        }
      }
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .admin-page { display: grid; min-width: 0; gap: 1.25rem; }
    .page-header { max-width: 44rem; }
    .back-link {
      display: inline-flex;
      min-height: 2.5rem;
      align-items: center;
      margin-bottom: 1.5rem;
      color: var(--color-accent-dark);
      font-weight: 650;
      text-decoration: none;
    }
    .back-link:hover { text-decoration: underline; text-underline-offset: 0.2em; }
    .eyebrow {
      margin: 0 0 0.7rem;
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
    .admin-navigation { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .admin-navigation a {
      padding: 0.55rem 0.8rem;
      border-radius: 0.55rem;
      background: var(--color-subtle);
      color: var(--color-ink);
      font-size: 0.9rem;
      font-weight: 650;
      text-decoration: none;
    }
    .admin-navigation a[aria-current='page'] { background: var(--color-ink); color: #fff; }
    .admin-panel {
      min-width: 0;
      padding: 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      background: var(--color-surface);
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
    @keyframes spin { to { transform: rotate(360deg); } }
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
    }
    .retry-button:hover { background: var(--color-accent-dark); }
    .run-detail { max-width: 44rem; }
    .run-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
    }
    .run-header h2 {
      margin: 0;
      font-size: 1.5rem;
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
    .status-badge.running { background: #fff4d6; color: #745000; }
    .status-badge.success { background: #e3f4e9; color: #22623f; }
    .status-badge.failed { background: #fff0ec; color: #9b321d; }
    .run-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .meta-row { display: contents; }
    .meta-row dt {
      grid-column: 1;
      color: var(--color-muted);
      font-size: 0.85rem;
      font-weight: 650;
    }
    .meta-row dd {
      grid-column: 2;
      margin: 0;
      font-size: 0.95rem;
    }
    .detail-section {
      margin-bottom: 1.5rem;
    }
    .detail-section h2 {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
    }
    .run-error { color: #9b321d; }
    .warning-list {
      margin: 0.35rem 0 0;
      padding-left: 1.25rem;
      color: #745000;
    }
    .empty-message { color: var(--color-muted); }
    pre {
      margin: 0;
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 0.6rem;
      background: var(--color-subtle);
      overflow-x: auto;
      font-size: 0.85rem;
    }
    @media (max-width: 640px) {
      .run-meta { grid-template-columns: 1fr; }
    }
  `,
})
export class AdminFetchRunDetailPage implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly runState = signal<AsyncState<AdminFetchRun>>({ status: 'loading' });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadRun(id);
      }
    });
  }

  protected loadRun(id?: string): void {
    const runId = id ?? this.route.snapshot.paramMap.get('id');
    if (!runId) return;
    this.runState.set({ status: 'loading' });
    this.adminApi.getFetchRun(runId).subscribe({
      next: (run) => this.runState.set({ status: 'loaded', value: run }),
      error: (error: ApiError) => this.runState.set({ status: 'error', error }),
    });
  }
}
