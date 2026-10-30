import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { NotificationApiService, NotificationSummary } from '../data-access/notification-api.service';

@Component({
  selector: 'app-notifications-page',
  imports: [TableModule, DatePipe],
  template: `
    <section class="notifications-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Your account</p>
        <h1 id="page-title">Email notifications</h1>
        <p>Choose whether to receive email summaries when matching jobs are found.</p>
      </header>

      @if (error(); as message) { <p class="error-message" role="alert">{{ message }}</p> }
      @if (success(); as message) { <p class="success-message" role="status" aria-live="polite">{{ message }}</p> }
      <section class="panel preference-panel" aria-labelledby="preference-title">
        <div>
          <h2 id="preference-title">Job email summaries</h2>
          <p>Receive a summary when new jobs match your followed categories.</p>
        </div>
        <label class="toggle-label" for="notification-opt-in">
          <input id="notification-opt-in" type="checkbox" [checked]="optIn()" [disabled]="loading() || saving()" (change)="setOptIn($any($event.target).checked)" />
          <span>{{ optIn() ? 'On' : 'Off' }}</span>
        </label>
      </section>

      <section class="panel" aria-labelledby="history-title">
        <h2 id="history-title">Notification history</h2>
        @if (loading()) { <p role="status" aria-live="polite">Loading notification history…</p> }
        @else if (history().length === 0) { <p class="empty-message">No notification summaries have been sent yet.</p> }
        @else {
          <p-table [value]="history()" [tableStyle]="{ 'min-width': '32rem' }" ariaLabel="Notification history">
            <ng-template #header>
              <tr><th scope="col">Date sent</th><th scope="col">Matching jobs</th></tr>
            </ng-template>
            <ng-template #body let-notification>
              <tr><td>{{ notification.sent_at | date:'medium' }}</td><td>{{ notification.job_count }}</td></tr>
            </ng-template>
          </p-table>
        }
      </section>
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .notifications-page { display: grid; gap: 1rem; }
    .page-header { max-width: 44rem; }
    .eyebrow { margin: 0 0 0.7rem; color: var(--color-accent-dark); font-size: 0.75rem; font-weight: 750; letter-spacing: 0.12em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(2.25rem, 6vw, 3.75rem); letter-spacing: -0.06em; line-height: 1.05; }
    h2 { margin: 0; font-size: 1.1rem; }
    .page-header > p:last-child, .preference-panel p { margin: 0.65rem 0 0; color: var(--color-muted); line-height: 1.6; }
    .panel { min-width: 0; padding: 1.25rem; border: 1px solid var(--color-border); border-radius: 0.9rem; background: var(--color-surface); }
    .preference-panel { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .toggle-label { display: inline-flex; align-items: center; gap: 0.6rem; font-weight: 650; }
    .toggle-label input { width: 1.2rem; height: 1.2rem; accent-color: var(--color-accent-dark); }
    .error-message { color: #9b321d; }
    .success-message { color: #22623f; }
    .empty-message { color: var(--color-muted); }
    @media (max-width: 500px) { .preference-panel { align-items: flex-start; flex-direction: column; } }
  `,
})
export class NotificationsPage implements OnInit {
  private readonly api = inject(NotificationApiService);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly optIn = signal(false);
  protected readonly history = signal<NotificationSummary[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({ preferences: this.api.getPreferences(), history: this.api.listHistory() }).subscribe({
      next: ({ preferences, history }) => {
        this.optIn.set(preferences.opt_in);
        this.history.set(history);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.error.set(e instanceof ApiError ? e.message : 'Could not load notification settings.');
      },
    });
  }

  protected setOptIn(value: boolean): void {
    const previous = this.optIn();
    this.optIn.set(value);
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.api.updatePreferences(value).subscribe({
      next: ({ opt_in }) => {
        this.optIn.set(opt_in);
        this.saving.set(false);
        this.success.set(`Email notifications turned ${opt_in ? 'on' : 'off'}.`);
      },
      error: (e: unknown) => {
        this.optIn.set(previous);
        this.saving.set(false);
        this.error.set(e instanceof Error ? e.message : 'Could not save notification preference.');
      },
    });
  }
}
