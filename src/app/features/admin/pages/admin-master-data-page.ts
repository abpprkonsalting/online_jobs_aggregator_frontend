import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { AdminMasterDataApiService } from '../data-access/admin-master-data-api.service';
import {
  AdminKeyword,
  AdminMasterSchema,
  CreateAdminCategoryKeywordResponse,
} from '../models/admin-master-data.models';

const slugValidator = Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

@Component({
  selector: 'app-admin-master-data-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="admin-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Administration</p>
        <h1 id="page-title">Master data</h1>
        <p>Manage the supported categories, skills, locations, keywords, and category-keyword links.</p>
      </header>

      <nav class="admin-navigation" aria-label="Administrator sections">
        <a routerLink="/admin">Users</a>
        <a routerLink="/admin/sources">Sources</a>
        <a routerLink="/admin/geographic-areas">Geographic areas</a>
        <a routerLink="/admin/assignments">Assignments</a>
        <a routerLink="/admin/fetch-runs">Fetch history</a>
        <a routerLink="/admin/master-data" aria-current="page">Master data</a>
      </nav>

      @if (mutationError(); as error) {
        <p class="error-message" role="alert">{{ error }}</p>
      }
      @if (mutationMessage(); as message) {
        <p class="success-message" role="status" aria-live="polite">{{ message }}</p>
      }

      <section class="admin-panel" aria-labelledby="categories-title">
        <h2 id="categories-title">Categories</h2>
        <form [formGroup]="categoryForm" (ngSubmit)="createCategory()">
          <div class="form-grid">
            <div class="field">
              <label for="category-name">Name</label>
              <input id="category-name" type="text" formControlName="name" />
              @if (categoryForm.controls.name.touched && categoryForm.controls.name.hasError('required')) {
                <p class="field-error">Enter a category name.</p>
              }
            </div>
            <div class="field">
              <label for="category-slug">Slug</label>
              <input id="category-slug" type="text" formControlName="slug" />
              @if (categoryForm.controls.slug.touched && categoryForm.controls.slug.invalid) {
                <p class="field-error">Use lowercase letters, numbers, and hyphens.</p>
              }
            </div>
            <div class="field">
              <label for="category-description">Description (optional)</label>
              <input id="category-description" type="text" formControlName="description" />
            </div>
          </div>
          <button type="submit" class="primary-button" [disabled]="saving()">Add category</button>
        </form>
      </section>

      <section class="admin-panel" aria-labelledby="skills-title">
        <h2 id="skills-title">Skills</h2>
        <form [formGroup]="skillForm" (ngSubmit)="seedSkill()">
          <div class="form-grid">
            <div class="field">
              <label for="skill-name">Name</label>
              <input id="skill-name" type="text" formControlName="name" />
              @if (skillForm.controls.name.touched && skillForm.controls.name.hasError('required')) {
                <p class="field-error">Enter a skill name.</p>
              }
            </div>
            <div class="field">
              <label for="skill-slug">Slug</label>
              <input id="skill-slug" type="text" formControlName="slug" />
              @if (skillForm.controls.slug.touched && skillForm.controls.slug.invalid) {
                <p class="field-error">Use lowercase letters, numbers, and hyphens.</p>
              }
            </div>
          </div>
          <button type="submit" class="primary-button" [disabled]="saving()">Add skill</button>
        </form>
      </section>

      <section class="admin-panel" aria-labelledby="countries-title">
        <h2 id="countries-title">Countries</h2>
        <form [formGroup]="countryForm" (ngSubmit)="seedCountry()">
          <div class="form-grid">
            <div class="field">
              <label for="country-name">Name</label>
              <input id="country-name" type="text" formControlName="name" />
              @if (countryForm.controls.name.touched && countryForm.controls.name.hasError('required')) {
                <p class="field-error">Enter a country name.</p>
              }
            </div>
            <div class="field">
              <label for="country-code">Code (optional)</label>
              <input id="country-code" type="text" formControlName="code" maxlength="10" />
            </div>
          </div>
          <button type="submit" class="primary-button" [disabled]="saving()">Add country</button>
        </form>
      </section>

      <section class="admin-panel" aria-labelledby="cities-title">
        <h2 id="cities-title">Cities</h2>
        @let schema = schemaState();
        @if (schema.status === 'loaded' && schema.value.countries.length === 0) {
          <p class="empty-message">Add a country before adding a city.</p>
        } @else {
          <form [formGroup]="cityForm" (ngSubmit)="seedCity()">
            <div class="form-grid">
              <div class="field">
                <label for="city-name">Name</label>
                <input id="city-name" type="text" formControlName="name" />
                @if (cityForm.controls.name.touched && cityForm.controls.name.hasError('required')) {
                  <p class="field-error">Enter a city name.</p>
                }
              </div>
              <div class="field">
                <label for="city-country">Country</label>
                <select id="city-country" formControlName="countryId">
                  <option value="">Select a country</option>
                  @if (schema.status === 'loaded') {
                    @for (country of schema.value.countries; track country.id) {
                      <option [value]="country.id">{{ country.name }}</option>
                    }
                  }
                </select>
                @if (cityForm.controls.countryId.touched && cityForm.controls.countryId.hasError('required')) {
                  <p class="field-error">Select a country.</p>
                }
              </div>
            </div>
            <button type="submit" class="primary-button" [disabled]="saving()">Add city</button>
          </form>
        }
      </section>

      <section class="admin-panel" aria-labelledby="keywords-title">
        <h2 id="keywords-title">Keywords</h2>
        <form [formGroup]="keywordForm" (ngSubmit)="createKeyword()">
          <div class="form-grid">
            <div class="field">
              <label for="keyword-name">Name</label>
              <input id="keyword-name" type="text" formControlName="name" />
              @if (keywordForm.controls.name.touched && keywordForm.controls.name.hasError('required')) {
                <p class="field-error">Enter a keyword name.</p>
              }
            </div>
            <div class="field">
              <label for="keyword-slug">Slug</label>
              <input id="keyword-slug" type="text" formControlName="slug" />
              @if (keywordForm.controls.slug.touched && keywordForm.controls.slug.invalid) {
                <p class="field-error">Use lowercase letters, numbers, and hyphens.</p>
              }
            </div>
            <div class="field">
              <label for="keyword-category">Optional default category</label>
              <select id="keyword-category" formControlName="categoryId">
                <option value="">No default category</option>
                @if (schema.status === 'loaded') {
                  @for (category of schema.value.categories; track category.id) {
                    <option [value]="category.id">{{ category.name }}</option>
                  }
                }
                </select>
            </div>
          </div>
          <button type="submit" class="primary-button" [disabled]="saving()">Add keyword</button>
        </form>
      </section>

      <section class="admin-panel" aria-labelledby="category-keywords-title">
        <h2 id="category-keywords-title">Category-keyword links</h2>
        <p class="panel-note">
          The backend accepts link writes but does not currently provide a link-list endpoint. Successful writes are confirmed by the API response.
        </p>
        @let keywords = keywordsState();
        @if (schema.status === 'loading' || keywords.status === 'loading') {
          <p role="status">Loading categories and keywords…</p>
        } @else if (schema.status === 'error' || keywords.status === 'error') {
          @if (schema.status === 'error') {
            <p role="alert">{{ schema.error.message }}</p>
          }
          @if (keywords.status === 'error') {
            <p role="alert">{{ keywords.error.message }}</p>
          }
          <button type="button" class="secondary-button" (click)="loadData()">Try again</button>
        } @else if (
          schema.status === 'loaded' && schema.value.categories.length > 0
          && keywords.status === 'loaded' && keywords.value.length > 0
        ) {
          <form [formGroup]="categoryKeywordForm" (ngSubmit)="createCategoryKeyword()">
            <div class="form-grid">
              <div class="field">
                <label for="link-category">Category</label>
                <select id="link-category" formControlName="categoryId">
                  <option value="">Select a category</option>
                  @for (category of schema.value.categories; track category.id) {
                    <option [value]="category.id">{{ category.name }}</option>
                  }
                </select>
                @if (categoryKeywordForm.controls.categoryId.touched && categoryKeywordForm.controls.categoryId.hasError('required')) {
                  <p class="field-error">Select a category.</p>
                }
              </div>
              <div class="field">
                <label for="link-keyword">Keyword</label>
                <select id="link-keyword" formControlName="keywordId">
                  <option value="">Select a keyword</option>
                  @for (keyword of keywords.value; track keyword.id) {
                    <option [value]="keyword.id">{{ keyword.name }}</option>
                  }
                </select>
                @if (categoryKeywordForm.controls.keywordId.touched && categoryKeywordForm.controls.keywordId.hasError('required')) {
                  <p class="field-error">Select a keyword.</p>
                }
              </div>
              <div class="field">
                <label for="link-weight">Weight (optional)</label>
                <input id="link-weight" type="number" min="0" max="1" step="0.01" formControlName="weight" />
                @if (categoryKeywordForm.controls.weight.touched && categoryKeywordForm.controls.weight.invalid) {
                  <p class="field-error">Weight must be between 0 and 1.</p>
                }
              </div>
            </div>
            <button type="submit" class="primary-button" [disabled]="saving()">Link keyword</button>
          </form>
        } @else {
          <p class="empty-message">Add at least one category and one keyword before creating a link.</p>
        }
      </section>

      <section class="admin-panel" aria-labelledby="catalog-title">
        <div class="section-heading">
          <h2 id="catalog-title">Current master data</h2>
          <button type="button" class="secondary-button" (click)="loadData()">Refresh</button>
        </div>
        @switch (schema.status) {
          @case ('loading') {
            <p role="status" aria-live="polite">Loading master data…</p>
          }
          @case ('error') {
            <p role="alert">{{ schema.error.message }}</p>
          }
          @case ('loaded') {
            <div class="catalog-grid">
              <section>
                <h3>Categories ({{ schema.value.categories.length }})</h3>
                <ul>@for (item of schema.value.categories; track item.id) { <li>{{ item.name }} <span>({{ item.slug }})</span></li> }</ul>
              </section>
              <section>
                <h3>Skills ({{ schema.value.skills.length }})</h3>
                <ul>@for (item of schema.value.skills; track item.id) { <li>{{ item.name }} <span>({{ item.slug }})</span></li> }</ul>
              </section>
              <section>
                <h3>Countries ({{ schema.value.countries.length }})</h3>
                <ul>@for (item of schema.value.countries; track item.id) { <li>{{ item.name }}@if (item.code) { <span> ({{ item.code }})</span> }</li> }</ul>
              </section>
              <section>
                <h3>Cities ({{ schema.value.cities.length }})</h3>
                <ul>@for (item of schema.value.cities; track item.id) { <li>{{ item.name }}</li> }</ul>
              </section>
              @if (keywords.status === 'loaded') {
                <section>
                  <h3>Keywords ({{ keywords.value.length }})</h3>
                  <ul>@for (item of keywords.value; track item.id) { <li>{{ item.name }} <span>({{ item.slug }})</span></li> }</ul>
                </section>
              } @else if (keywords.status === 'error') {
                <section role="alert">
                  <h3>Keywords could not be loaded</h3>
                  <p>{{ keywords.error.message }}</p>
                </section>
              }
            </div>
          }
          @case ('idle') {
            <p>Master data is not loaded.</p>
          }
        }
      </section>
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .admin-page { display: grid; min-width: 0; gap: 1.25rem; }
    .page-header { max-width: 48rem; }
    .eyebrow {
      margin: 0 0 0.7rem;
      color: var(--color-accent-dark);
      font-size: 0.75rem;
      font-weight: 750;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    h1 { margin: 0; font-size: clamp(2.25rem, 6vw, 3.75rem); letter-spacing: -0.06em; line-height: 1.05; }
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
    h3 { margin: 0; font-size: 0.95rem; }
    form { display: grid; gap: 1rem; margin-top: 1rem; }
    .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; }
    .field { display: grid; align-content: start; gap: 0.45rem; }
    label { font-size: 0.85rem; font-weight: 650; }
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
    .primary-button { justify-self: start; border: 0; background: var(--color-ink); color: #fff; }
    .secondary-button { border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-ink); }
    .primary-button:disabled { cursor: wait; opacity: 0.65; }
    .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .catalog-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; }
    .catalog-grid section { min-width: 0; }
    .catalog-grid ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
    .catalog-grid li { overflow-wrap: anywhere; }
    .catalog-grid span, .panel-note, .empty-message { color: var(--color-muted); }
    .panel-note { line-height: 1.5; }
    .field-error, .error-message { margin: 0; color: #9b321d; font-size: 0.85rem; }
    .success-message { color: #22623f; }
    @media (max-width: 760px) { .form-grid, .catalog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 520px) { .form-grid, .catalog-grid { grid-template-columns: 1fr; } }
  `,
})
export class AdminMasterDataPage implements OnInit {
  private readonly adminMasterApi = inject(AdminMasterDataApiService);
  protected readonly schemaState = signal<AsyncState<AdminMasterSchema>>({ status: 'loading' });
  protected readonly keywordsState = signal<AsyncState<AdminKeyword[]>>({ status: 'loading' });
  protected readonly saving = signal(false);
  protected readonly mutationError = signal<string | null>(null);
  protected readonly mutationMessage = signal<string | null>(null);

  protected readonly categoryForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required, slugValidator] }),
    description: new FormControl('', { nonNullable: true }),
  });
  protected readonly skillForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required, slugValidator] }),
  });
  protected readonly countryForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    code: new FormControl('', { nonNullable: true }),
  });
  protected readonly cityForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    countryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly keywordForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required, slugValidator] }),
    categoryId: new FormControl('', { nonNullable: true }),
  });
  protected readonly categoryKeywordForm = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    keywordId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    weight: new FormControl<number | null>(null, [Validators.min(0), Validators.max(1)]),
  });

  ngOnInit(): void {
    this.loadData();
  }

  protected loadData(): void {
    this.schemaState.set({ status: 'loading' });
    this.keywordsState.set({ status: 'loading' });
    this.adminMasterApi.getSchema().subscribe({
      next: (schema) => this.schemaState.set({ status: 'loaded', value: schema }),
      error: (error: ApiError) => this.schemaState.set({ status: 'error', error }),
    });
    this.adminMasterApi.getKeywords().subscribe({
      next: (keywords) => this.keywordsState.set({ status: 'loaded', value: keywords }),
      error: (error: ApiError) => this.keywordsState.set({ status: 'error', error }),
    });
  }

  protected createCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    const { name, slug, description } = this.categoryForm.getRawValue();
    this.commit(
      this.adminMasterApi.createCategory({ name, slug, ...(description ? { description } : {}) }),
      (category) => `Created category ${category.name}.`,
      () => this.categoryForm.reset({ name: '', slug: '', description: '' }),
    );
  }

  protected seedSkill(): void {
    if (this.skillForm.invalid) {
      this.skillForm.markAllAsTouched();
      return;
    }
    const { name, slug } = this.skillForm.getRawValue();
    this.commit(
      this.adminMasterApi.seedSkills({ skills: [{ name, slug }] }),
      (response) => `Seeded ${response.seeded} skill.`,
      () => this.skillForm.reset({ name: '', slug: '' }),
    );
  }

  protected seedCountry(): void {
    if (this.countryForm.invalid) {
      this.countryForm.markAllAsTouched();
      return;
    }
    const { name, code } = this.countryForm.getRawValue();
    this.commit(
      this.adminMasterApi.seedCountries({ countries: [{ name, ...(code ? { code } : {}) }] }),
      (response) => `Seeded ${response.seeded} country.`,
      () => this.countryForm.reset({ name: '', code: '' }),
    );
  }

  protected seedCity(): void {
    if (this.cityForm.invalid) {
      this.cityForm.markAllAsTouched();
      return;
    }
    const { name, countryId } = this.cityForm.getRawValue();
    this.commit(
      this.adminMasterApi.seedCities({ cities: [{ name, country_id: countryId }] }),
      (response) => `Seeded ${response.seeded} city.`,
      () => this.cityForm.reset({ name: '', countryId: '' }),
    );
  }

  protected createKeyword(): void {
    if (this.keywordForm.invalid) {
      this.keywordForm.markAllAsTouched();
      return;
    }
    const { name, slug, categoryId } = this.keywordForm.getRawValue();
    this.commit(
      this.adminMasterApi.createKeyword({
        name,
        slug,
        ...(categoryId ? { category_id: categoryId } : {}),
      }),
      (keyword) => `Created keyword ${keyword.name}.`,
      () => this.keywordForm.reset({ name: '', slug: '', categoryId: '' }),
    );
  }

  protected createCategoryKeyword(): void {
    if (this.categoryKeywordForm.invalid) {
      this.categoryKeywordForm.markAllAsTouched();
      return;
    }
    const { categoryId, keywordId, weight } = this.categoryKeywordForm.getRawValue();
    this.commit(
      this.adminMasterApi.createCategoryKeyword({
        category_id: categoryId,
        keyword_id: keywordId,
        ...(weight !== null ? { weight } : {}),
      }),
      (link: CreateAdminCategoryKeywordResponse) =>
        `API confirmed the category-keyword link (${link.category_id} → ${link.keyword_id}).`,
      () => this.categoryKeywordForm.reset({ categoryId: '', keywordId: '', weight: null }),
      false,
    );
  }

  private commit<T>(
    request: Observable<T>,
    successMessage: (response: T) => string,
    resetForm: () => void,
    refresh = true,
  ): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
    request.subscribe({
      next: (response) => {
        this.saving.set(false);
        resetForm();
        this.mutationMessage.set(successMessage(response));
        if (refresh) {
          this.loadData();
        }
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.mutationError.set(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while saving master data.',
        );
      },
    });
  }
}
