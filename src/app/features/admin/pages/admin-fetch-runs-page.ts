import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormatDatePipe } from '../../../core/pipes/format-date.pipe';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminFetchRun } from '../models/admin.models';

@Component({
  selector: 'app-admin-fetch-runs-page',
  imports: [RouterLink, FormatDatePipe],
  template: `
    <section class="admin-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Administration</p>
        <h1 id="page-title">Fetch history</h1>
        <p>Review the latest source-fetch activity and its results.</p>
      </header>

      <nav class="admin-navigation" aria-label="Administrator sections">
        <a routerLink="/admin">Users</a>
        <a routerLink="/admin/sources">Sources</a>
        <a routerLink="/admin/geographic-areas">Geographic areas</a>
        <a routerLink="/admin/assignments">Assignments</a>
        <a routerLink="/admin/fetch-runs" aria-current="page">Fetch history</a>
        <a routerLink="/admin/master-data">Master data</a>
      </nav>

      <section class="admin-panel" aria-labelledby="runs-title">
        <div class="section-heading">
          <h2 id="runs-title">Fetch runs</h2>
          <div class="run-actions">
            <button type="button" class="secondary-button" (click)="startCycle()" [disabled]="starting()">
              {{ starting() ? 'Starting…' : 'Start cycle' }}
            </button>
            <button type="button" class="secondary-button" (click)="stopCycle()" [disabled]="stopping()">
              {{ stopping() ? 'Stopping…' : 'Stop cycle' }}
            </button>
            <button type="button" class="secondary-button" (click)="loadRuns()">Refresh</button>
          </div>
        </div>
        @let runs = runsState();
        @switch (runs.status) {
          @case ('loading') {
            <p role="status" aria-live="polite">Loading fetch history…</p>
          }
          @case ('error') {
            <div role="alert">
              <p>{{ runs.error.message }}</p>
              <button type="button" class="secondary-button" (click)="loadRuns()">Try again</button>
            </div>
          }
          @case ('loaded') {
            @if (runs.value.length === 0) {
              <p class="empty-message">No fetch runs have been recorded.</p>
            } @else {
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Run ID</th>
                      <th scope="col">Status</th>
                      <th scope="col">Source ID</th>
                      <th scope="col">Started</th>
                      <th scope="col">Finished</th>
                      <th scope="col">Jobs found</th>
                      <th scope="col">New</th>
                      <th scope="col">Updated</th>
                      <th scope="col">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (run of runs.value; track run.id) {
                      <tr>
                        <td>
                          <a [routerLink]="['/admin/fetch-runs', run.id]">{{ run.id }}</a>
                        </td>
                        <td>
                          <span class="status-badge" [class.running]="run.status === 'running'"
                            [class.success]="run.status === 'success'" [class.failed]="run.status === 'failed'">
                            {{ run.status }}
                          </span>
                        </td>
                        <td>{{ run.source_id ?? 'Not associated with a source' }}</td>
                        <td>{{ (run.started_at | formatDate:true) }}</td>
                        <td>{{ (run.finished_at | formatDate:true) ?? 'In progress' }}</td>
                        <td>{{ run.jobs_found }}</td>
                        <td>{{ run.jobs_saved_new }}</td>
                        <td>{{ run.jobs_saved_updated }}</td>
                        <td class="details-cell">
                          @if (run.error_message) {
                            <p class="run-error">{{ run.error_message }}</p>
                          }
                          @if (run.warnings?.length) {
                            <ul class="warning-list">
                              @for (warning of run.warnings; track $index) {
                                <li>{{ warning }}</li>
                              }
                            </ul>
                          }
                          @if (!run.error_message && !run.warnings?.length) {
                            <span>—</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('idle') {
            <p>Fetch history is not loaded.</p>
          }
        }
        @if (cycleError(); as error) {
          <p class="error-message" role="alert">{{ error }}</p>
        }
        @if (cycleMessage(); as message) {
          <p class="success-message" role="status" aria-live="polite">{{ message }}</p>
        }
      </section>
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .admin-page { display: grid; min-width: 0; gap: 1.25rem; }
    .page-header { max-width: 44rem; }
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
      font-size: clamp(2.25rem, 6vw, 3.75rem);
      letter-spacing: -0.06em;
      line-height: 1.05;
    }
    .page-header > p:last-child { margin: 0.9rem 0 0; color: var(--color-muted); line-height: 1.6; }
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
    h2 { margin: 0; font-size: 1.1rem; }
    .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .run-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .secondary-button {
      min-height: 2.65rem;
      padding: 0.55rem 0.85rem;
      border: 1px solid var(--color-border);
      border-radius: 0.55rem;
      background: var(--color-surface);
      color: var(--color-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 650;
    }
    .secondary-button:disabled { cursor: wait; opacity: 0.65; }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 0.8rem 0.65rem; border-bottom: 1px solid var(--color-border); vertical-align: top; }
    th { font-size: 0.85rem; font-weight: 650; white-space: nowrap; }
    .status-badge { display: inline-flex; padding: 0.25rem 0.55rem; border-radius: 99px; background: var(--color-subtle); text-transform: capitalize; }
    .status-badge.running { background: #fff4d6; color: #745000; }
    .status-badge.success { background: #e3f4e9; color: #22623f; }
    .status-badge.failed { background: #fff0ec; color: #9b321d; }
    .details-cell { min-width: 15rem; }
    .details-cell p { margin: 0; }
    .run-error { color: #9b321d; }
    .warning-list { margin: 0.35rem 0 0; padding-left: 1.25rem; color: #745000; }
    .empty-message { color: var(--color-muted); }
    .error-message { margin: 0; color: #9b321d; font-size: 0.85rem; }
    .success-message { color: #22623f; }
    @media (max-width: 600px) { .admin-panel { padding: 1rem; } }
  `,
})
export class AdminFetchRunsPage implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  protected readonly runsState = signal<AsyncState<AdminFetchRun[]>>({ status: 'loading' });
  protected readonly starting = signal(false);
  protected readonly stopping = signal(false);
  protected readonly cycleError = signal<string | null>(null);
  protected readonly cycleMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadRuns();
  }

  protected loadRuns(): void {
    this.runsState.set({ status: 'loading' });
    this.adminApi.listFetchRuns().subscribe({
      next: (runs) => this.runsState.set({ status: 'loaded', value: runs }),
      error: (error: ApiError) => this.runsState.set({ status: 'error', error }),
    });
  }

  protected startCycle(): void {
    this.starting.set(true);
    this.cycleError.set(null);
    this.cycleMessage.set(null);
    this.adminApi.startFetchCycle().subscribe({
      next: () => {
        this.starting.set(false);
        this.cycleMessage.set('Fetch cycle started.');
        this.loadRuns();
      },
      error: (error: ApiError) => {
        this.starting.set(false);
        this.cycleError.set(error.message ?? 'Failed to start fetch cycle.');
      },
    });
  }

  protected stopCycle(): void {
    this.stopping.set(true);
    this.cycleError.set(null);
    this.cycleMessage.set(null);
    this.adminApi.stopFetchCycle().subscribe({
      next: () => {
        this.stopping.set(false);
        this.cycleMessage.set('Fetch cycle stopped.');
        this.loadRuns();
      },
      error: (error: ApiError) => {
        this.stopping.set(false);
        this.cycleError.set(error.message ?? 'Failed to stop fetch cycle.');
      },
    });
  }
}
