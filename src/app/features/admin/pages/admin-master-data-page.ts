import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { AdminMasterDataApiService } from '../data-access/admin-master-data-api.service';
import {
  AdminKeyword,
  AdminMasterSchema,
  CategoryKeywordLink,
  CreateAdminCategoryKeywordResponse,
} from '../models/admin-master-data.models';

const slugValidator = Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

@Component({
  selector: 'app-admin-master-data-page',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <section class="admin-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Administration</p>
        <h1 id="page-title">Master data</h1>
        <p>Manage reference values used across job search and classification.</p>
      </header>

      <nav class="admin-navigation" aria-label="Administrator sections">
        <a routerLink="/admin">Users</a>
        <a routerLink="/admin/sources">Sources</a>
        <a routerLink="/admin/geographic-areas">Geographic areas</a>
        <a routerLink="/admin/assignments">Assignments</a>
        <a routerLink="/admin/fetch-runs">Fetch history</a>
        <a routerLink="/admin/master-data" aria-current="page">Master data</a>
      </nav>

      <nav class="data-tabs" aria-label="Master data sections">
        <button type="button" [attr.aria-pressed]="activeSection() === 'categories'" [class.selected]="activeSection() === 'categories'" (click)="setSection('categories')">Categories</button>
        <button type="button" [attr.aria-pressed]="activeSection() === 'skills'" [class.selected]="activeSection() === 'skills'" (click)="setSection('skills')">Skills</button>
        <button type="button" [attr.aria-pressed]="activeSection() === 'locations'" [class.selected]="activeSection() === 'locations'" (click)="setSection('locations')">Locations</button>
        <button type="button" [attr.aria-pressed]="activeSection() === 'keywords'" [class.selected]="activeSection() === 'keywords'" (click)="setSection('keywords')">Keywords</button>
        <button type="button" [attr.aria-pressed]="activeSection() === 'associations'" [class.selected]="activeSection() === 'associations'" (click)="setSection('associations')">Category-keyword links</button>
      </nav>

      @if (mutationError(); as error) {
        <p class="error-message" role="alert">{{ error }}</p>
      }
      @if (mutationMessage(); as message) {
        <p class="success-message" role="status" aria-live="polite">{{ message }}</p>
      }

      @let schema = schemaState();
      @let keywords = keywordsState();
      @let links = categoryKeywordLinksState();
      @if (schema.status === 'loading') {
        <section class="admin-panel" role="status" aria-live="polite">Loading master data…</section>
      } @else if (schema.status === 'error') {
        <section class="admin-panel" role="alert">
          <p>{{ schema.error.message }}</p>
          <button type="button" class="secondary-button" (click)="loadData()">Try again</button>
        </section>
      } @else if (schema.status === 'loaded') {
        @switch (activeSection()) {
          @case ('categories') {
            <div class="section-layout">
              <section class="admin-panel" aria-labelledby="categories-form-title">
                <h2 id="categories-form-title">Add category</h2>
                <form class="category-form" [formGroup]="categoryForm" (ngSubmit)="createCategory()">
                  <div class="form-grid">
                    <div class="field"><label for="category-name">Name</label><input id="category-name" type="text" formControlName="name" />
                      @if (categoryForm.controls.name.touched && categoryForm.controls.name.hasError('required')) { <p class="field-error">Enter a category name.</p> }
                    </div>
                    <div class="field"><label for="category-slug">Slug</label><input id="category-slug" type="text" formControlName="slug" />
                      @if (categoryForm.controls.slug.touched && categoryForm.controls.slug.invalid) { <p class="field-error">Use lowercase letters, numbers, and hyphens.</p> }
                    </div>
                    <div class="field"><label for="category-description">Description (optional)</label><input id="category-description" type="text" formControlName="description" /></div>
                  </div>
                  <button type="submit" class="primary-button" [disabled]="saving()">Add category</button>
                </form>
              </section>
              <section class="admin-panel" aria-labelledby="categories-title">
                <div class="section-heading"><div><h2 id="categories-title">Categories</h2><p class="panel-note">{{ schema.value.categories.length }} records</p></div><button type="button" class="secondary-button" (click)="loadData()">Refresh</button></div>
                @if (schema.value.categories.length === 0) { <p class="empty-message">No categories have been added.</p> } @else {
                  <table><thead><tr><th scope="col">Name</th><th scope="col">Slug</th><th scope="col">Description</th><th scope="col">Subscribers</th></tr></thead><tbody>
                    @for (item of schema.value.categories; track item.id) { <tr><td>{{ item.name }}</td><td><code>{{ item.slug }}</code></td><td>{{ item.description || '—' }}</td><td>{{ categorySubscribersState()[item.id] ?? '—' }}</td></tr> }
                  </tbody></table>
                }
              </section>
            </div>
          }
          @case ('skills') {
            <div class="section-layout">
              <section class="admin-panel" aria-labelledby="skills-form-title"><h2 id="skills-form-title">Add skill</h2>
                <form class="stacked-form" [formGroup]="skillForm" (ngSubmit)="seedSkill()"><div class="form-grid">
                  <div class="field"><label for="skill-name">Name</label><input id="skill-name" type="text" formControlName="name" />@if (skillForm.controls.name.touched && skillForm.controls.name.hasError('required')) { <p class="field-error">Enter a skill name.</p> }</div>
                  <div class="field"><label for="skill-slug">Slug</label><input id="skill-slug" type="text" formControlName="slug" />@if (skillForm.controls.slug.touched && skillForm.controls.slug.invalid) { <p class="field-error">Use lowercase letters, numbers, and hyphens.</p> }</div>
                </div><button type="submit" class="primary-button" [disabled]="saving()">Add skill</button></form>
              </section>
              <section class="admin-panel" aria-labelledby="skills-title"><div class="section-heading"><div><h2 id="skills-title">Skills</h2><p class="panel-note">{{ schema.value.skills.length }} records</p></div><button type="button" class="secondary-button" (click)="loadData()">Refresh</button></div>
                @if (schema.value.skills.length === 0) { <p class="empty-message">No skills have been added.</p> } @else { <table><thead><tr><th scope="col">Name</th><th scope="col">Slug</th></tr></thead><tbody>@for (item of schema.value.skills; track item.id) { <tr><td>{{ item.name }}</td><td><code>{{ item.slug }}</code></td></tr> }</tbody></table> }
              </section>
            </div>
          }
          @case ('locations') {
            <div class="section-layout location-layout">
              <section class="admin-panel" aria-labelledby="countries-form-title"><h2 id="countries-form-title">Add country</h2><form class="stacked-form" [formGroup]="countryForm" (ngSubmit)="seedCountry()"><div class="form-grid">
                <div class="field"><label for="country-name">Name</label><input id="country-name" type="text" formControlName="name" />@if (countryForm.controls.name.touched && countryForm.controls.name.hasError('required')) { <p class="field-error">Enter a country name.</p> }</div>
                <div class="field"><label for="country-code">Code (optional)</label><input id="country-code" type="text" formControlName="code" maxlength="10" /></div>
              </div><button type="submit" class="primary-button" [disabled]="saving()">Add country</button></form></section>
              <section class="admin-panel" aria-labelledby="countries-title"><div class="section-heading"><div><h2 id="countries-title">Countries</h2><p class="panel-note">{{ schema.value.countries.length }} records</p></div></div>
                @if (schema.value.countries.length === 0) { <p class="empty-message">No countries have been added.</p> } @else { <table><thead><tr><th scope="col">Name</th><th scope="col">Code</th></tr></thead><tbody>@for (item of schema.value.countries; track item.id) { <tr><td>{{ item.name }}</td><td>{{ item.code || '—' }}</td></tr> }</tbody></table> }
              </section>
              <section class="admin-panel" aria-labelledby="cities-form-title"><h2 id="cities-form-title">Add city</h2>
                @if (schema.value.countries.length === 0) { <p class="empty-message">Add a country before adding a city.</p> } @else {
                  <form class="stacked-form" [formGroup]="cityForm" (ngSubmit)="seedCity()"><div class="form-grid"><div class="field"><label for="city-name">Name</label><input id="city-name" type="text" formControlName="name" />@if (cityForm.controls.name.touched && cityForm.controls.name.hasError('required')) { <p class="field-error">Enter a city name.</p> }</div>
                    <div class="field"><label for="city-country">Country</label><select id="city-country" formControlName="countryId"><option value="">Select a country</option>@for (country of schema.value.countries; track country.id) { <option [value]="country.id">{{ country.name }}</option> }</select>@if (cityForm.controls.countryId.touched && cityForm.controls.countryId.hasError('required')) { <p class="field-error">Select a country.</p> }</div></div><button type="submit" class="primary-button" [disabled]="saving()">Add city</button></form>
                }
              </section>
              <section class="admin-panel" aria-labelledby="cities-title"><div class="section-heading"><div><h2 id="cities-title">Cities</h2><p class="panel-note">{{ schema.value.cities.length }} records</p></div></div>
                @if (schema.value.cities.length === 0) { <p class="empty-message">No cities have been added.</p> } @else { <table><thead><tr><th scope="col">City</th><th scope="col">Country</th></tr></thead><tbody>@for (item of schema.value.cities; track item.id) { <tr><td>{{ item.name }}</td><td>{{ countryName(schema.value.countries, item.country_id) }}</td></tr> }</tbody></table> }
              </section>
            </div>
          }
          @case ('keywords') {
            <div class="section-layout">
              <section class="admin-panel" aria-labelledby="keywords-form-title"><h2 id="keywords-form-title">Add keyword</h2><form class="stacked-form" [formGroup]="keywordForm" (ngSubmit)="createKeyword()"><div class="form-grid">
                <div class="field"><label for="keyword-name">Name</label><input id="keyword-name" type="text" formControlName="name" />@if (keywordForm.controls.name.touched && keywordForm.controls.name.hasError('required')) { <p class="field-error">Enter a keyword name.</p> }</div>
                <div class="field"><label for="keyword-slug">Slug</label><input id="keyword-slug" type="text" formControlName="slug" />@if (keywordForm.controls.slug.touched && keywordForm.controls.slug.invalid) { <p class="field-error">Use lowercase letters, numbers, and hyphens.</p> }</div>
                <div class="field"><label for="keyword-category">Optional default category</label><select id="keyword-category" formControlName="categoryId"><option value="">No default category</option>@for (category of schema.value.categories; track category.id) { <option [value]="category.id">{{ category.name }}</option> }</select></div>
              </div><button type="submit" class="primary-button" [disabled]="saving()">Add keyword</button></form></section>
              @if (keywords.status === 'loading') { <section class="admin-panel" role="status">Loading keywords…</section> }
              @else if (keywords.status === 'error') { <section class="admin-panel" role="alert"><p>{{ keywords.error.message }}</p><button type="button" class="secondary-button" (click)="loadData()">Try again</button></section> }
              @else if (keywords.status === 'loaded') { <section class="admin-panel" aria-labelledby="keywords-title"><div class="section-heading"><div><h2 id="keywords-title">Keywords</h2><p class="panel-note">{{ keywords.value.length }} records</p></div></div>
                @if (keywords.value.length === 0) { <p class="empty-message">No keywords have been added.</p> } @else { <table><thead><tr><th scope="col">Name</th><th scope="col">Slug</th><th scope="col">Default category</th><th scope="col">Status</th></tr></thead><tbody>@for (item of keywords.value; track item.id) { <tr><td>{{ item.name }}</td><td><code>{{ item.slug }}</code></td><td>{{ categoryName(schema.value.categories, item.category_id) }}</td><td>{{ item.enabled ? 'Enabled' : 'Disabled' }}</td></tr> }</tbody></table> }
              </section> }
            </div>
          }
          @case ('associations') {
            <section class="admin-panel" aria-labelledby="associations-title"><div class="section-heading"><div><h2 id="associations-title">Category-keyword links</h2><p class="panel-note">Connect keywords to the categories used to classify jobs.</p></div></div>
              @if (keywords.status === 'loading' || links.status === 'loading') { <p role="status">Loading keywords and links…</p> }
              @else if (keywords.status === 'error' || links.status === 'error') { @if (keywords.status === 'error') { <p role="alert">{{ keywords.error.message }}</p> } @if (links.status === 'error') { <p role="alert">{{ links.error.message }}</p> } <button type="button" class="secondary-button" (click)="loadData()">Try again</button> }
              @else if (keywords.status === 'loaded' && links.status === 'loaded') {
                <form class="association-form" [formGroup]="categoryKeywordForm" (ngSubmit)="createCategoryKeyword()"><div class="form-grid"><div class="field"><label for="link-category">Category</label><select id="link-category" formControlName="categoryId"><option value="">Select a category</option>@for (category of schema.value.categories; track category.id) { <option [value]="category.id">{{ category.name }}</option> }</select>@if (categoryKeywordForm.controls.categoryId.touched && categoryKeywordForm.controls.categoryId.hasError('required')) { <p class="field-error">Select a category.</p> }</div>
                  <div class="field"><label for="link-keyword">Keyword</label><select id="link-keyword" formControlName="keywordId"><option value="">Select a keyword</option>@for (keyword of keywords.value; track keyword.id) { <option [value]="keyword.id">{{ keyword.name }}</option> }</select>@if (categoryKeywordForm.controls.keywordId.touched && categoryKeywordForm.controls.keywordId.hasError('required')) { <p class="field-error">Select a keyword.</p> }</div>
                  <div class="field"><label for="link-weight">Weight (optional)</label><input id="link-weight" type="number" min="0" max="1" step="0.01" formControlName="weight" />@if (categoryKeywordForm.controls.weight.touched && categoryKeywordForm.controls.weight.invalid) { <p class="field-error">Weight must be between 0 and 1.</p> }</div></div><button type="submit" class="primary-button" [disabled]="saving()">Link keyword</button></form>
                <div class="section-heading association-filter"><label for="filter-category">Filter by category</label><select id="filter-category" [(ngModel)]="selectedFilterCategoryId"><option value="">All categories</option>@for (category of schema.value.categories; track category.id) { <option [value]="category.id">{{ category.name }}</option> }</select></div>
                @if (filteredLinks().length === 0) { <p class="empty-message">No category-keyword links match this view.</p> } @else { <table><thead><tr><th scope="col">Category</th><th scope="col">Keyword</th><th scope="col">Weight</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>@for (link of filteredLinks(); track link.category_id + link.keyword_id) { <tr><td>{{ link.category_name }}</td><td>{{ link.keyword_name }}</td><td>{{ link.weight ?? '—' }}</td><td>{{ link.enabled === 1 ? 'Enabled' : 'Disabled' }}</td><td><button type="button" class="remove-button" (click)="unlinkKeyword(link.category_id, link.keyword_id)">Unlink</button></td></tr> }</tbody></table> }
              }
            </section>
          }
        }
      }
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
    .category-form .form-grid, .stacked-form .form-grid { grid-template-columns: 1fr; }
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
    .panel-note, .empty-message { color: var(--color-muted); }
    .panel-note { line-height: 1.5; }
    .field-error, .error-message { margin: 0; color: #9b321d; font-size: 0.85rem; }
    .success-message { color: #22623f; }
    .remove-button {
      min-height: 2.65rem;
      padding: 0.55rem 0.85rem;
      border-radius: 0.55rem;
      border: 0;
      background: #fff0ec;
      color: #9b321d;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 650;
    }
    .remove-button:hover { background: #fee4df; }
    .data-tabs { display: flex; gap: 0.35rem; border-bottom: 1px solid var(--color-border); }
    .data-tabs button { min-height: 2.8rem; padding: 0.65rem 1rem; border: 0; border-bottom: 3px solid transparent; background: transparent; color: var(--color-muted); cursor: pointer; font: inherit; font-weight: 650; }
    .data-tabs button.selected { border-bottom-color: var(--color-accent); color: var(--color-ink); }
    .section-layout { display: grid; grid-template-columns: minmax(19rem, 0.8fr) minmax(38rem, 1.7fr); align-items: start; gap: 1.25rem; }
    .location-layout { grid-template-columns: repeat(2, minmax(28rem, 1fr)); }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 0.8rem 0.75rem; border-bottom: 1px solid var(--color-border); vertical-align: top; }
    th { color: var(--color-muted); font-size: 0.8rem; font-weight: 700; }
    td { font-size: 0.9rem; }
    code { color: var(--color-muted); font-size: 0.85rem; }
    .panel-note { margin: 0.35rem 0 0; color: var(--color-muted); font-size: 0.85rem; }
    .association-form { max-width: 70rem; margin-bottom: 1.5rem; }
    .association-filter { justify-content: flex-start; margin-block: 1.25rem 0.5rem; }
    .association-filter select { min-width: 18rem; min-height: 2.6rem; padding: 0.5rem 0.7rem; border: 1px solid var(--color-border); border-radius: 0.55rem; background: var(--color-surface); color: var(--color-ink); font: inherit; }
  `,
})
export class AdminMasterDataPage implements OnInit {
  private readonly adminMasterApi = inject(AdminMasterDataApiService);
  protected readonly schemaState = signal<AsyncState<AdminMasterSchema>>({ status: 'loading' });
  protected readonly keywordsState = signal<AsyncState<AdminKeyword[]>>({ status: 'loading' });
  protected readonly categoryKeywordLinksState = signal<AsyncState<CategoryKeywordLink[]>>({ status: 'loading' });
  protected readonly categorySubscribersState = signal<Record<string, number>>({});
  protected readonly selectedFilterCategoryId = signal<string>('');
  protected readonly activeSection = signal<'categories' | 'skills' | 'locations' | 'keywords' | 'associations'>('categories');
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

  protected setSection(section: 'categories' | 'skills' | 'locations' | 'keywords' | 'associations'): void {
    this.activeSection.set(section);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
  }

  protected countryName(countries: AdminMasterSchema['countries'], countryId: string): string {
    return countries.find((country) => country.id === countryId)?.name ?? 'Unknown country';
  }

  protected categoryName(categories: AdminMasterSchema['categories'], categoryId: string | null): string {
    if (!categoryId) return '—';
    return categories.find((category) => category.id === categoryId)?.name ?? 'Unknown category';
  }

  protected loadData(): void {
    this.schemaState.set({ status: 'loading' });
    this.keywordsState.set({ status: 'loading' });
    this.categoryKeywordLinksState.set({ status: 'loading' });
    this.adminMasterApi.getSchema().subscribe({
      next: (schema) => {
        this.schemaState.set({ status: 'loaded', value: schema });
        this.loadCategorySubscribers(schema.categories);
      },
      error: (error: ApiError) => this.schemaState.set({ status: 'error', error }),
    });
    this.adminMasterApi.getKeywords().subscribe({
      next: (keywords) => this.keywordsState.set({ status: 'loaded', value: keywords }),
      error: (error: ApiError) => this.keywordsState.set({ status: 'error', error }),
    });
    this.adminMasterApi.listCategoryKeywords().subscribe({
      next: (links) => this.categoryKeywordLinksState.set({ status: 'loaded', value: links }),
      error: (error: ApiError) => this.categoryKeywordLinksState.set({ status: 'error', error }),
    });
  }

  protected loadCategorySubscribers(categories: { id: string; name: string }[]): void {
    const counts: Record<string, number> = {};
    let pending = categories.length;
    if (pending === 0) {
      this.categorySubscribersState.set(counts);
      return;
    }
    for (const category of categories) {
      this.adminMasterApi.getCategorySubscribers(category.id).subscribe({
        next: (result) => {
          counts[result.category_id] = result.subscriber_count;
          pending -= 1;
          if (pending === 0) {
            this.categorySubscribersState.set(counts);
          }
        },
        error: () => {
          counts[category.id] = 0;
          pending -= 1;
          if (pending === 0) {
            this.categorySubscribersState.set(counts);
          }
        },
      });
    }
  }

  protected readonly filteredLinks = computed(() => {
    const links = this.categoryKeywordLinksState();
    if (links.status !== 'loaded') return [];
    const filterId = this.selectedFilterCategoryId();
    if (!filterId) return links.value;
    return links.value.filter((link) => link.category_id === filterId);
  });

  protected unlinkKeyword(categoryId: string, keywordId: string): void {
    this.adminMasterApi.deleteCategoryKeyword(categoryId, keywordId).subscribe({
      next: () => {
        this.categoryKeywordLinksState.update((state) => {
          if (state.status !== 'loaded') return state;
          return {
            status: 'loaded',
            value: state.value.filter((l) => !(l.category_id === categoryId && l.keyword_id === keywordId)),
          };
        });
        this.mutationMessage.set('Keyword unlinked from category.');
      },
      error: (error: ApiError) => {
        this.mutationError.set(error.message ?? 'Failed to unlink keyword.');
      },
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
