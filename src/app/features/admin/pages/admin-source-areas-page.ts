import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminGeographicArea, AdminSource, AdminSourceArea } from '../models/admin.models';

@Component({
  selector: 'app-admin-source-areas-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="admin-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Administration</p>
        <h1 id="page-title">Source-area assignments</h1>
        <p>Choose which geographic areas each source should cover.</p>
      </header>

      <nav class="admin-navigation" aria-label="Administrator sections">
        <a routerLink="/admin">Users</a>
        <a routerLink="/admin/sources">Sources</a>
        <a routerLink="/admin/geographic-areas">Geographic areas</a>
        <a routerLink="/admin/assignments" aria-current="page">Assignments</a>
      </nav>

      <section class="admin-panel" aria-labelledby="link-form-title">
        <h2 id="link-form-title">Link a source to an area</h2>
        @if (mutationError(); as error) {
          <p class="error-message" role="alert">{{ error }}</p>
        }
        @if (mutationMessage(); as message) {
          <p class="success-message" role="status" aria-live="polite">{{ message }}</p>
        }
        @let sources = sourcesState();
        @let areas = areasState();
        @let currentAssignments = assignmentsState();
        @if (
          sources.status === 'loading'
          || areas.status === 'loading'
          || currentAssignments.status === 'loading'
        ) {
          <p role="status" aria-live="polite">Loading sources, areas, and assignments…</p>
        } @else if (
          sources.status === 'error'
          || areas.status === 'error'
          || currentAssignments.status === 'error'
        ) {
          <div role="alert">
            @if (sources.status === 'error') {
              <p>{{ sources.error.message }}</p>
            }
            @if (areas.status === 'error') {
              <p>{{ areas.error.message }}</p>
            }
            @if (currentAssignments.status === 'error') {
              <p>{{ currentAssignments.error.message }}</p>
            }
            <button type="button" class="secondary-button" (click)="retryData()">Try again</button>
          </div>
        } @else if (
          sources.status !== 'loaded'
          || areas.status !== 'loaded'
          || currentAssignments.status !== 'loaded'
        ) {
          <p>Current source, area, and assignment data is unavailable.</p>
        } @else if (sources.value.length === 0 || areas.value.length === 0) {
          <p class="empty-message">Add at least one source and one geographic area before linking them.</p>
        } @else {
          <form [formGroup]="linkForm" (ngSubmit)="createLink()">
            <div class="form-grid">
              <div class="field">
                <label for="assignment-source">Source</label>
                <select id="assignment-source" formControlName="sourceId">
                  <option value="">Select a source</option>
                  @for (source of sources.value; track source.id) {
                    <option [value]="source.id">{{ source.name }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label for="assignment-area">Geographic area</label>
                <select id="assignment-area" formControlName="areaId">
                  <option value="">Select an area</option>
                  @for (area of areas.value; track area.id) {
                    <option [value]="area.id">{{ area.name }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label for="assignment-enabled">Status</label>
                <select id="assignment-enabled" formControlName="enabled">
                  <option [ngValue]="true">Enabled</option>
                  <option [ngValue]="false">Disabled</option>
                </select>
              </div>
            </div>
            @if (linkForm.touched && linkForm.invalid) {
              <p class="field-error">Select both a source and a geographic area.</p>
            }
            @if (isDuplicate()) {
              <p class="field-error" role="alert">This source is already linked to that area.</p>
            }
            <button type="submit" class="primary-button" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Create link' }}
            </button>
          </form>
        }
      </section>

      <section class="admin-panel" aria-labelledby="assignments-title">
        <div class="section-heading">
          <h2 id="assignments-title">Current assignments</h2>
          <button type="button" class="secondary-button" (click)="loadAssignments()">Refresh</button>
        </div>
        @let assignments = assignmentsState();
        @switch (assignments.status) {
          @case ('loading') {
            <p role="status" aria-live="polite">Loading assignments…</p>
          }
          @case ('error') {
            <div role="alert">
              <p>{{ assignments.error.message }}</p>
              <button type="button" class="secondary-button" (click)="loadAssignments()">Try again</button>
            </div>
          }
          @case ('loaded') {
            @if (assignments.value.length === 0) {
              <p class="empty-message">No source-area assignments yet.</p>
            } @else {
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Source</th>
                      <th scope="col">Geographic area</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last run</th>
                      <th scope="col">Next run</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (assignment of assignments.value; track assignment.source_id + ':' + assignment.geographic_area_id) {
                      <tr>
                        <td>{{ assignment.source_name }}</td>
                        <td>{{ assignment.area_name }}</td>
                        <td>{{ assignment.enabled ? 'Enabled' : 'Disabled' }}</td>
                        <td>{{ assignment.last_run_at ?? 'Never' }}</td>
                        <td>{{ assignment.next_run_at ?? 'Not scheduled' }}</td>
                        <td>
                          <button
                            type="button"
                            class="secondary-button unlink-assignment"
                            [disabled]="saving()"
                            [attr.aria-label]="'Unlink ' + assignment.source_name + ' from ' + assignment.area_name"
                            (click)="deleteLink(assignment)"
                          >
                            Unlink
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
            <p>Assignment list is not loaded.</p>
          }
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
    form { display: grid; gap: 1rem; margin-top: 1rem; }
    .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; }
    .field { display: grid; align-content: start; gap: 0.45rem; }
    label, th { font-size: 0.85rem; font-weight: 650; }
    select {
      width: 100%;
      min-height: 2.75rem;
      padding: 0.6rem 0.7rem;
      border: 1px solid var(--color-border);
      border-radius: 0.55rem;
      background: var(--color-surface);
      color: var(--color-ink);
      font: inherit;
    }
    .primary-button, .secondary-button {
      min-height: 2.65rem;
      padding: 0.55rem 0.85rem;
      border-radius: 0.55rem;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 650;
    }
    .primary-button { justify-self: start; border: 0; background: var(--color-ink); color: #fff; }
    .secondary-button { border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-ink); }
    .primary-button:disabled, .secondary-button:disabled { cursor: wait; opacity: 0.65; }
    .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 0.8rem 0.65rem; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
    .field-error, .error-message { margin: 0; color: #9b321d; font-size: 0.85rem; }
    .empty-message { color: var(--color-muted); }
    .success-message { color: #22623f; }
    @media (max-width: 720px) { .form-grid { grid-template-columns: 1fr; } }
  `,
})
export class AdminSourceAreasPage implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  protected readonly sourcesState = signal<AsyncState<AdminSource[]>>({ status: 'loading' });
  protected readonly areasState = signal<AsyncState<AdminGeographicArea[]>>({ status: 'loading' });
  protected readonly assignmentsState = signal<AsyncState<AdminSourceArea[]>>({ status: 'loading' });
  protected readonly saving = signal(false);
  protected readonly mutationError = signal<string | null>(null);
  protected readonly mutationMessage = signal<string | null>(null);
  protected readonly linkForm = new FormGroup({
    sourceId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    areaId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    enabled: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadReferenceData();
    this.loadAssignments();
  }

  protected loadReferenceData(): void {
    this.sourcesState.set({ status: 'loading' });
    this.areasState.set({ status: 'loading' });
    this.adminApi.listSources().subscribe({
      next: (sources) => this.sourcesState.set({ status: 'loaded', value: sources }),
      error: (error: ApiError) => this.sourcesState.set({ status: 'error', error }),
    });
    this.adminApi.listGeographicAreas().subscribe({
      next: (areas) => this.areasState.set({ status: 'loaded', value: areas }),
      error: (error: ApiError) => this.areasState.set({ status: 'error', error }),
    });
  }

  protected loadAssignments(): void {
    this.assignmentsState.set({ status: 'loading' });
    this.adminApi.listSourceAreas().subscribe({
      next: (assignments) => this.assignmentsState.set({ status: 'loaded', value: assignments }),
      error: (error: ApiError) => this.assignmentsState.set({ status: 'error', error }),
    });
  }

  protected retryData(): void {
    this.loadReferenceData();
    this.loadAssignments();
  }

  protected isDuplicate(): boolean {
    const assignments = this.assignmentsState();
    if (assignments.status !== 'loaded') {
      return false;
    }
    const { sourceId, areaId } = this.linkForm.getRawValue();
    return assignments.value.some(
      (assignment) => assignment.source_id === sourceId
        && assignment.geographic_area_id === areaId,
    );
  }

  protected createLink(): void {
    if (this.saving()) {
      return;
    }
    if (this.linkForm.invalid) {
      this.linkForm.markAllAsTouched();
      return;
    }
    if (this.isDuplicate()) {
      this.mutationError.set('This source is already linked to that area.');
      return;
    }
    if (this.assignmentsState().status !== 'loaded') {
      this.mutationError.set('Load current assignments before creating a link.');
      return;
    }

    const { sourceId, areaId, enabled } = this.linkForm.getRawValue();
    this.saving.set(true);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
    this.adminApi.createSourceArea({
      source_id: sourceId,
      geographic_area_id: areaId,
      enabled,
    }).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.linkForm.reset({ sourceId: '', areaId: '', enabled: true });
        if (created.source_id !== sourceId || created.geographic_area_id !== areaId) {
          this.mutationError.set('The server returned a different source-area link than requested.');
          this.loadAssignments();
          return;
        }
        this.mutationMessage.set('Source-area link created.');
        this.loadAssignments();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.mutationError.set(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while creating the source-area link.',
        );
      },
    });
  }

  protected deleteLink(assignment: AdminSourceArea): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
    this.adminApi.deleteSourceArea(assignment.source_id, assignment.geographic_area_id).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (!response.success) {
          this.mutationError.set('The server did not confirm that the source-area link was removed.');
          return;
        }
        this.mutationMessage.set(`Unlinked ${assignment.source_name} from ${assignment.area_name}.`);
        this.loadAssignments();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.mutationError.set(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while removing the source-area link.',
        );
      },
    });
  }
}
