import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { SourceType, SourceWorkingMode } from '../../../core/models/api.models';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminSource } from '../models/admin.models';

function isConfigObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Component({
  selector: 'app-admin-sources-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="admin-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Administration</p>
        <h1 id="page-title">Job sources</h1>
        <p>Configure the sources used to collect job opportunities.</p>
      </header>

      <nav class="admin-navigation" aria-label="Administrator sections">
        <a routerLink="/admin">Users</a>
        <a routerLink="/admin/sources" aria-current="page">Sources</a>
        <a routerLink="/admin/geographic-areas">Geographic areas</a>
        <a routerLink="/admin/assignments">Assignments</a>
        <a routerLink="/admin/fetch-runs">Fetch history</a>
        <a routerLink="/admin/master-data">Master data</a>
      </nav>

      <section class="admin-panel" aria-labelledby="source-form-title">
        <h2 id="source-form-title">{{ editingSource() ? 'Edit source' : 'Add a source' }}</h2>
        @if (mutationError(); as error) {
          <p class="error-message" role="alert">{{ error }}</p>
        }
        @if (mutationMessage(); as message) {
          <p class="success-message" role="status" aria-live="polite">{{ message }}</p>
        }
        <form [formGroup]="sourceForm" (ngSubmit)="saveSource()">
          <div class="form-grid">
            <div class="field">
              <label for="source-name">Name</label>
              <input id="source-name" type="text" formControlName="name" />
              @if (sourceForm.controls.name.touched && sourceForm.controls.name.hasError('required')) {
                <p class="field-error">Enter a source name.</p>
              }
            </div>
            <div class="field">
              <label for="source-type">Type</label>
              <select id="source-type" formControlName="type">
                <option value="api">API</option>
                <option value="scrape">Scrape</option>
                <option value="hybrid">Hybrid</option>
              </select>
              @if (editingSource()) {
                <p class="field-hint">The current API does not support changing a saved source’s type.</p>
              }
            </div>
            <div class="field">
              <label for="working-mode">Working mode</label>
              <select id="working-mode" formControlName="workingMode">
                <option value="passive">Passive</option>
                <option value="proactive">Proactive</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div class="field">
              <label for="source-enabled">Status</label>
              <select id="source-enabled" formControlName="enabled">
                <option [ngValue]="true">Enabled</option>
                <option [ngValue]="false">Disabled</option>
              </select>
            </div>
            <div class="field config-field">
              <label for="source-config">Configuration (JSON)</label>
              <textarea id="source-config" rows="6" formControlName="config"></textarea>
              @if (configError(); as error) {
                <p class="field-error" role="alert">{{ error }}</p>
              }
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="primary-button" [disabled]="saving()">
              {{ saving() ? 'Saving…' : editingSource() ? 'Save changes' : 'Create source' }}
            </button>
            @if (editingSource()) {
              <button type="button" class="secondary-button" [disabled]="saving()" (click)="cancelEdit()">
                Cancel
              </button>
            }
          </div>
        </form>
      </section>

      <section class="admin-panel" aria-labelledby="sources-title">
        <div class="section-heading">
          <h2 id="sources-title">Sources</h2>
          <button type="button" class="secondary-button" (click)="loadSources()">Refresh</button>
        </div>
        @let sources = sourcesState();
        @switch (sources.status) {
          @case ('loading') {
            <p role="status" aria-live="polite">Loading sources…</p>
          }
          @case ('error') {
            <div role="alert">
              <p>{{ sources.error.message }}</p>
              <button type="button" class="secondary-button" (click)="loadSources()">Try again</button>
            </div>
          }
          @case ('loaded') {
            @if (sources.value.length === 0) {
              <p class="empty-message">No sources configured.</p>
            } @else {
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Type</th>
                      <th scope="col">Working mode</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last run</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (source of sources.value; track source.id) {
                      <tr>
                        <td>{{ source.name }}</td>
                        <td>{{ source.type }}</td>
                        <td>{{ source.working_mode }}</td>
                        <td>{{ source.enabled ? 'Enabled' : 'Disabled' }}</td>
                        <td>{{ source.last_run_at ?? 'Never' }}</td>
                        <td>
                          <div class="row-actions">
                            <button
                              type="button"
                              class="secondary-button edit-source"
                              [disabled]="saving()"
                              (click)="beginEdit(source)"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              class="secondary-button delete-source"
                              [disabled]="saving()"
                              (click)="deleteSource(source)"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              class="secondary-button trigger-source"
                              [disabled]="saving() || triggeringSourceId() === source.id"
                              (click)="triggerSource(source)"
                            >
                              {{ triggeringSourceId() === source.id ? 'Triggering…' : 'Trigger now' }}
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('idle') {
            <p>Source list is not loaded.</p>
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

    .admin-page {
      display: grid;
      min-width: 0;
      gap: 1.25rem;
    }

    .page-header {
      max-width: 44rem;
    }

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

    .page-header > p:last-child {
      margin: 0.9rem 0 0;
      color: var(--color-muted);
      line-height: 1.6;
    }

    .admin-navigation {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .admin-navigation a {
      padding: 0.55rem 0.8rem;
      border-radius: 0.55rem;
      background: var(--color-subtle);
      color: var(--color-ink);
      font-size: 0.9rem;
      font-weight: 650;
      text-decoration: none;
    }

    .admin-navigation a[aria-current='page'] {
      background: var(--color-ink);
      color: #fff;
    }

    .admin-panel {
      min-width: 0;
      padding: 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      background: var(--color-surface);
    }

    h2 {
      margin: 0;
      font-size: 1.1rem;
    }

    form {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .field {
      display: grid;
      align-content: start;
      gap: 0.45rem;
    }

    .config-field {
      grid-column: 1 / -1;
    }

    label,
    th {
      font-size: 0.85rem;
      font-weight: 650;
    }

    input,
    select,
    textarea {
      width: 100%;
      min-height: 2.75rem;
      padding: 0.6rem 0.7rem;
      border: 1px solid var(--color-border);
      border-radius: 0.55rem;
      background: var(--color-surface);
      color: var(--color-ink);
      font: inherit;
    }

    textarea {
      resize: vertical;
      font-family: ui-monospace, monospace;
    }

    .form-actions,
    .section-heading {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .row-actions {
      display: flex;
      gap: 0.5rem;
    }

    .section-heading {
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .primary-button,
    .secondary-button {
      min-height: 2.65rem;
      padding: 0.55rem 0.85rem;
      border-radius: 0.55rem;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 650;
    }

    .primary-button {
      border: 0;
      background: var(--color-ink);
      color: #fff;
    }

    .primary-button:disabled,
    .secondary-button:disabled {
      cursor: wait;
      opacity: 0.65;
    }

    .secondary-button {
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
    }

    .table-scroll {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th,
    td {
      padding: 0.8rem 0.65rem;
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }

    .field-error,
    .error-message {
      margin: 0;
      color: #9b321d;
      font-size: 0.85rem;
    }

    .field-hint,
    .empty-message {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.85rem;
      line-height: 1.5;
    }

    .success-message {
      color: #22623f;
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }

      .config-field {
        grid-column: auto;
      }
    }
  `,
})
export class AdminSourcesPage implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  protected readonly sourcesState = signal<AsyncState<AdminSource[]>>({ status: 'loading' });
  protected readonly editingSource = signal<AdminSource | null>(null);
  protected readonly saving = signal(false);
  protected readonly triggeringSourceId = signal<string | null>(null);
  protected readonly mutationError = signal<string | null>(null);
  protected readonly mutationMessage = signal<string | null>(null);
  protected readonly configError = signal<string | null>(null);
  protected readonly sourceForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<SourceType>('api', { nonNullable: true }),
    workingMode: new FormControl<SourceWorkingMode>('both', { nonNullable: true }),
    enabled: new FormControl(true, { nonNullable: true }),
    config: new FormControl('{}', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.loadSources();
  }

  protected loadSources(): void {
    this.sourcesState.set({ status: 'loading' });
    this.adminApi.listSources().subscribe({
      next: (sources) => this.sourcesState.set({ status: 'loaded', value: sources }),
      error: (error: ApiError) => this.sourcesState.set({ status: 'error', error }),
    });
  }

  protected beginEdit(source: AdminSource): void {
    this.editingSource.set(source);
    this.configError.set(null);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
    this.sourceForm.setValue({
      name: source.name,
      type: source.type,
      workingMode: source.working_mode,
      enabled: source.enabled === 1,
      config: JSON.stringify(source.config, null, 2),
    });
    this.sourceForm.controls.type.disable();
  }

  protected cancelEdit(): void {
    this.editingSource.set(null);
    this.resetForm();
  }

  protected saveSource(): void {
    if (this.saving()) {
      return;
    }
    if (this.sourceForm.invalid) {
      this.sourceForm.markAllAsTouched();
      return;
    }

    let config: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(this.sourceForm.controls.config.value);
      if (!isConfigObject(parsed)) {
        this.configError.set('Configuration must be a JSON object.');
        return;
      }
      config = parsed;
    } catch {
      this.configError.set('Enter valid JSON configuration.');
      return;
    }
    this.configError.set(null);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
    this.saving.set(true);

    const { name, type, workingMode, enabled } = this.sourceForm.getRawValue();
    const source = this.editingSource();
    const request = source
      ? this.adminApi.updateSource(source.id, {
          name,
          working_mode: workingMode,
          config,
          enabled,
        })
      : this.adminApi.createSource({
          name,
          type,
          working_mode: workingMode,
          config,
          enabled,
        });
    request.subscribe({
      next: (savedSource) => {
        this.saving.set(false);
        this.editingSource.set(null);
        this.resetForm();
        this.mutationMessage.set(source ? `Updated ${savedSource.name}.` : `Created ${savedSource.name}.`);
        this.loadSources();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.mutationError.set(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while saving the source.',
        );
      },
    });
  }

  protected deleteSource(source: AdminSource): void {
    if (this.saving()) {
      return;
    }
    if (!window.confirm(`Delete ${source.name}? This action cannot be undone.`)) {
      return;
    }

    this.saving.set(true);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
    this.adminApi.deleteSource(source.id).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (!response.success) {
          this.mutationError.set(`The server did not confirm deletion of ${source.name}.`);
          return;
        }
        const current = this.sourcesState();
        if (current.status === 'loaded') {
          this.sourcesState.set({
            status: 'loaded',
            value: current.value.filter((item) => item.id !== source.id),
          });
        }
        if (this.editingSource()?.id === source.id) {
          this.cancelEdit();
        }
        this.mutationMessage.set(`Deleted ${source.name}.`);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.mutationError.set(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while deleting the source.',
        );
      },
    });
  }

  protected triggerSource(source: AdminSource): void {
    if (this.triggeringSourceId() === source.id) {
      return;
    }
    this.triggeringSourceId.set(source.id);
    this.mutationError.set(null);
    this.adminApi.triggerSource(source.id).subscribe({
      next: () => {
        this.triggeringSourceId.set(null);
        this.mutationMessage.set(`Triggered fetch for ${source.name}.`);
        this.loadSources();
      },
      error: (error: unknown) => {
        this.triggeringSourceId.set(null);
        this.mutationError.set(
          error instanceof Error
            ? error.message
            : `An unexpected error occurred while triggering fetch for ${source.name}.`,
        );
      },
    });
  }

  private resetForm(): void {
    this.sourceForm.controls.type.enable();
    this.sourceForm.reset({
      name: '',
      type: 'api',
      workingMode: 'both',
      enabled: true,
      config: '{}',
    });
  }
}
