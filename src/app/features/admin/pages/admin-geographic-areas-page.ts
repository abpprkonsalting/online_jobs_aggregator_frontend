import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminGeographicArea } from '../models/admin.models';
import { GeographicAreaMap } from '../components/geographic-area-map';
import type { Polygon as GeoJsonPolygon } from 'geojson';

const boundingBoxValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const minLongitude = control.get('minLongitude')?.value;
  const minLatitude = control.get('minLatitude')?.value;
  const maxLongitude = control.get('maxLongitude')?.value;
  const maxLatitude = control.get('maxLatitude')?.value;

  if (
    typeof minLongitude !== 'number' || typeof minLatitude !== 'number'
    || typeof maxLongitude !== 'number' || typeof maxLatitude !== 'number'
  ) {
    return null;
  }

  return minLongitude < maxLongitude && minLatitude < maxLatitude
    ? null
    : { boundingBox: true };
};

const integerZoomValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'number' && Number.isInteger(value) ? null : { integer: true };
};

@Component({
  selector: 'app-admin-geographic-areas-page',
  imports: [ReactiveFormsModule, RouterLink, GeographicAreaMap],
  template: `
    <section class="admin-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Administration</p>
        <h1 id="page-title">Geographic areas</h1>
        <p>Define the map regions that sources can use when collecting jobs.</p>
      </header>

      <nav class="admin-navigation" aria-label="Administrator sections">
        <a routerLink="/admin">Users</a>
        <a routerLink="/admin/sources">Sources</a>
        <a routerLink="/admin/geographic-areas" aria-current="page">Geographic areas</a>
        <a routerLink="/admin/assignments">Assignments</a>
        <a routerLink="/admin/fetch-runs">Fetch history</a>
        <a routerLink="/admin/master-data">Master data</a>
      </nav>

      <section class="admin-panel" aria-labelledby="area-form-title">
        <h2 id="area-form-title">{{ editingArea() ? 'Edit geographic area' : 'Add a geographic area' }}</h2>
        @if (mutationError(); as error) {
          <p class="error-message" role="alert">{{ error }}</p>
        }
        @if (mutationMessage(); as message) {
          <p class="success-message" role="status" aria-live="polite">{{ message }}</p>
        }
        <div class="map-tools">
          <div class="address-form">
            <label for="area-address">Find an address</label>
            <div class="address-row">
              <input id="area-address" type="text" [value]="address()" (input)="address.set($any($event.target).value)" placeholder="City, address, or landmark" />
              <button type="button" class="secondary-button" [disabled]="geocoding() || !address().trim()" (click)="resolveAddress()">{{ geocoding() ? 'Searching…' : 'Find address' }}</button>
            </div>
          </div>
          @if (geocodeError(); as error) { <p class="error-message" role="alert">{{ error }}</p> }
          @if (drawError(); as error) { <p class="error-message" role="alert">{{ error }}</p> }
          <app-geographic-area-map (polygonDrawn)="convertPolygon($event)" />
          <button type="button" class="secondary-button" [disabled]="converting()" (click)="finishDrawing()">{{ converting() ? 'Converting…' : 'Use polygon' }}</button>
          @if (convertedBounds(); as bounds) {
            <p class="bounds-result" role="status">Computed bbox: {{ bounds.bbox.join(', ') }} · Zoom {{ bounds.zoom }}. Save below to use this area.</p>
          }
        </div>
        <form [formGroup]="areaForm" (ngSubmit)="saveArea()">
          <div class="form-grid">
            <div class="field">
              <label for="area-name">Name</label>
              <input id="area-name" type="text" formControlName="name" />
              @if (areaForm.controls.name.touched && areaForm.controls.name.hasError('required')) {
                <p class="field-error">Enter an area name.</p>
              }
            </div>
            <div class="field">
              <label for="area-status">Status</label>
              <select id="area-status" formControlName="enabled">
                <option [ngValue]="true">Enabled</option>
                <option [ngValue]="false">Disabled</option>
              </select>
            </div>
            <div class="field">
              <label for="min-longitude">Minimum longitude</label>
              <input id="min-longitude" type="number" min="-180" max="180" step="any" formControlName="minLongitude" />
              @if (areaForm.controls.minLongitude.touched && areaForm.controls.minLongitude.invalid) {
                <p class="field-error">Longitude must be between -180 and 180.</p>
              }
            </div>
            <div class="field">
              <label for="min-latitude">Minimum latitude</label>
              <input id="min-latitude" type="number" min="-90" max="90" step="any" formControlName="minLatitude" />
              @if (areaForm.controls.minLatitude.touched && areaForm.controls.minLatitude.invalid) {
                <p class="field-error">Latitude must be between -90 and 90.</p>
              }
            </div>
            <div class="field">
              <label for="max-longitude">Maximum longitude</label>
              <input id="max-longitude" type="number" min="-180" max="180" step="any" formControlName="maxLongitude" />
              @if (areaForm.controls.maxLongitude.touched && areaForm.controls.maxLongitude.invalid) {
                <p class="field-error">Longitude must be between -180 and 180.</p>
              }
            </div>
            <div class="field">
              <label for="max-latitude">Maximum latitude</label>
              <input id="max-latitude" type="number" min="-90" max="90" step="any" formControlName="maxLatitude" />
              @if (areaForm.controls.maxLatitude.touched && areaForm.controls.maxLatitude.invalid) {
                <p class="field-error">Latitude must be between -90 and 90.</p>
              }
            </div>
            <div class="field">
              <label for="area-zoom">Zoom level</label>
              <input id="area-zoom" type="number" min="0" step="1" formControlName="zoom" />
              @if (areaForm.controls.zoom.touched && areaForm.controls.zoom.hasError('required')) {
                <p class="field-error">Enter a zoom level.</p>
              } @else if (areaForm.controls.zoom.touched && areaForm.controls.zoom.invalid) {
                <p class="field-error">Zoom must be a non-negative whole number.</p>
              }
            </div>
          </div>
          @if (areaForm.hasError('boundingBox') && areaForm.touched) {
            <p class="field-error" role="alert">
              Minimum longitude and latitude must be less than their maximum values.
            </p>
          }
          <div class="form-actions">
            <button type="submit" class="primary-button" [disabled]="saving()">
              {{ saving() ? 'Saving…' : editingArea() ? 'Save changes' : 'Create area' }}
            </button>
            @if (editingArea()) {
              <button type="button" class="secondary-button" [disabled]="saving()" (click)="cancelEdit()">
                Cancel
              </button>
            }
          </div>
        </form>
      </section>

      <section class="admin-panel" aria-labelledby="areas-title">
        <div class="section-heading">
          <h2 id="areas-title">Geographic areas</h2>
          <button type="button" class="secondary-button" (click)="loadAreas()">Refresh</button>
        </div>
        @let areas = areasState();
        @switch (areas.status) {
          @case ('loading') {
            <p role="status" aria-live="polite">Loading geographic areas…</p>
          }
          @case ('error') {
            <div role="alert">
              <p>{{ areas.error.message }}</p>
              <button type="button" class="secondary-button" (click)="loadAreas()">Try again</button>
            </div>
          }
          @case ('loaded') {
            @if (areas.value.length === 0) {
              <p class="empty-message">No geographic areas configured.</p>
            } @else {
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Bounding box</th>
                      <th scope="col">Zoom</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (area of areas.value; track area.id) {
                      <tr>
                        <td>{{ area.name }}</td>
                        <td>{{ area.definition.bbox.join(', ') }}</td>
                        <td>{{ area.definition.zoom }}</td>
                        <td>{{ area.enabled ? 'Enabled' : 'Disabled' }}</td>
                        <td>
                          <div class="row-actions">
                            <button
                              type="button"
                              class="secondary-button edit-area"
                              [disabled]="saving()"
                              (click)="beginEdit(area)"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              class="secondary-button delete-area"
                              [disabled]="saving()"
                              (click)="deleteArea(area)"
                            >
                              Delete
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
            <p>Geographic area list is not loaded.</p>
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
    .page-header > p:last-child {
      margin: 0.9rem 0 0;
      color: var(--color-muted);
      line-height: 1.6;
    }
    .admin-navigation,
    .form-actions {
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
    .map-tools { display: grid; gap: 0.75rem; margin: 1rem 0 1.5rem; }
    .address-form { display: grid; gap: 0.45rem; margin: 0; }
    .address-row { display: flex; gap: 0.5rem; }
    .address-row input { flex: 1; }
    .bounds-result { margin: 0; color: var(--color-accent-dark); font-weight: 650; }
    .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; }
    .field { display: grid; align-content: start; gap: 0.45rem; }
    label, th { font-size: 0.85rem; font-weight: 650; }
    input, select {
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
    .primary-button { border: 0; background: var(--color-ink); color: #fff; }
    .secondary-button { border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-ink); }
    .primary-button:disabled, .secondary-button:disabled { cursor: wait; opacity: 0.65; }
    .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .row-actions { display: flex; gap: 0.5rem; }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 0.8rem 0.65rem; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
    .field-error, .error-message { margin: 0; color: #9b321d; font-size: 0.85rem; }
    .empty-message { color: var(--color-muted); }
    .success-message { color: #22623f; }
    @media (max-width: 760px) { .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 500px) { .form-grid { grid-template-columns: 1fr; } }
  `,
})
export class AdminGeographicAreasPage implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  @ViewChild(GeographicAreaMap) private map?: GeographicAreaMap;
  protected readonly areasState = signal<AsyncState<AdminGeographicArea[]>>({ status: 'loading' });
  protected readonly editingArea = signal<AdminGeographicArea | null>(null);
  protected readonly saving = signal(false);
  protected readonly mutationError = signal<string | null>(null);
  protected readonly mutationMessage = signal<string | null>(null);
  protected readonly address = signal('');
  protected readonly geocoding = signal(false);
  protected readonly geocodeError = signal<string | null>(null);
  protected readonly converting = signal(false);
  protected readonly drawError = signal<string | null>(null);
  protected readonly convertedBounds = signal<{ bbox: [number, number, number, number]; zoom: number } | null>(null);
  protected readonly areaForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    minLongitude: new FormControl<number | null>(null, [Validators.required, Validators.min(-180), Validators.max(180)]),
    minLatitude: new FormControl<number | null>(null, [Validators.required, Validators.min(-90), Validators.max(90)]),
    maxLongitude: new FormControl<number | null>(null, [Validators.required, Validators.min(-180), Validators.max(180)]),
    maxLatitude: new FormControl<number | null>(null, [Validators.required, Validators.min(-90), Validators.max(90)]),
    zoom: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      integerZoomValidator,
    ]),
    enabled: new FormControl(true, { nonNullable: true }),
  }, { validators: boundingBoxValidator });

  ngOnInit(): void {
    this.loadAreas();
  }

  protected resolveAddress(): void {
    const address = this.address().trim();
    if (!address || this.geocoding()) return;
    this.geocoding.set(true);
    this.geocodeError.set(null);
    this.adminApi.geocode(address).subscribe({
      next: ({ lat, lng }) => {
        this.geocoding.set(false);
        this.map?.centerOn(lat, lng);
        this.areaForm.patchValue({ minLongitude: lng - 0.1, minLatitude: lat - 0.1, maxLongitude: lng + 0.1, maxLatitude: lat + 0.1 });
      },
      error: (error: unknown) => {
        this.geocoding.set(false);
        this.geocodeError.set(error instanceof Error ? error.message : 'Address could not be resolved.');
      },
    });
  }

  protected convertPolygon(geometry: GeoJsonPolygon): void {
    this.converting.set(true);
    this.drawError.set(null);
    this.adminApi.convertGeometry(geometry).subscribe({
      next: (bounds) => {
        this.converting.set(false);
        this.convertedBounds.set(bounds);
        const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bounds.bbox;
        this.areaForm.patchValue({ minLongitude, minLatitude, maxLongitude, maxLatitude, zoom: bounds.zoom });
      },
      error: (error: unknown) => {
        this.converting.set(false);
        this.drawError.set(error instanceof Error ? error.message : 'The polygon could not be converted.');
      },
    });
  }

  protected finishDrawing(): void {
    this.map?.finishDrawing();
  }

  protected loadAreas(): void {
    this.areasState.set({ status: 'loading' });
    this.adminApi.listGeographicAreas().subscribe({
      next: (areas) => this.areasState.set({ status: 'loaded', value: areas }),
      error: (error: ApiError) => this.areasState.set({ status: 'error', error }),
    });
  }

  protected beginEdit(area: AdminGeographicArea): void {
    this.editingArea.set(area);
    const [minLongitude, minLatitude, maxLongitude, maxLatitude] = area.definition.bbox;
    this.areaForm.setValue({
      name: area.name,
      minLongitude,
      minLatitude,
      maxLongitude,
      maxLatitude,
      zoom: area.definition.zoom,
      enabled: area.enabled === 1,
    });
    this.mutationError.set(null);
    this.mutationMessage.set(null);
  }

  protected cancelEdit(): void {
    this.editingArea.set(null);
    this.resetForm();
  }

  protected saveArea(): void {
    if (this.saving()) {
      return;
    }
    if (this.areaForm.invalid) {
      this.areaForm.markAllAsTouched();
      return;
    }

    const { name, minLongitude, minLatitude, maxLongitude, maxLatitude, zoom, enabled } =
      this.areaForm.getRawValue();
    if (
      minLongitude === null || minLatitude === null || maxLongitude === null
      || maxLatitude === null || zoom === null
    ) {
      this.areaForm.markAllAsTouched();
      return;
    }

    const bbox: [number, number, number, number] = [
      minLongitude,
      minLatitude,
      maxLongitude,
      maxLatitude,
    ];
    const definition = {
      bbox,
      zoom,
    };
    const editingArea = this.editingArea();
    this.saving.set(true);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
    const request = editingArea
      ? this.adminApi.updateGeographicArea(editingArea.id, { name, definition, enabled })
      : this.adminApi.createGeographicArea({ name, definition, enabled });
    request.subscribe({
      next: (savedArea) => {
        this.saving.set(false);
        this.editingArea.set(null);
        this.resetForm();
        this.mutationMessage.set(
          `${editingArea ? 'Updated' : 'Created'} ${savedArea.name}.`,
        );
        this.loadAreas();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.mutationError.set(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while saving the geographic area.',
        );
      },
    });
  }

  protected deleteArea(area: AdminGeographicArea): void {
    if (this.saving()) {
      return;
    }
    if (!window.confirm(`Delete ${area.name}? This action cannot be undone.`)) {
      return;
    }

    this.saving.set(true);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
    this.adminApi.deleteGeographicArea(area.id).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (!response.success) {
          this.mutationError.set(`The server did not confirm deletion of ${area.name}.`);
          return;
        }
        const current = this.areasState();
        if (current.status === 'loaded') {
          this.areasState.set({
            status: 'loaded',
            value: current.value.filter((item) => item.id !== area.id),
          });
        }
        if (this.editingArea()?.id === area.id) {
          this.cancelEdit();
        }
        this.mutationMessage.set(`Deleted ${area.name}.`);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.mutationError.set(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while deleting the geographic area.',
        );
      },
    });
  }

  private resetForm(): void {
    this.areaForm.reset({
      name: '',
      minLongitude: null,
      minLatitude: null,
      maxLongitude: null,
      maxLatitude: null,
      zoom: null,
      enabled: true,
    });
  }
}
