import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { Category } from '../../../core/models/api.models';
import { ReferenceDataApiService } from '../data-access/reference-data-api.service';

@Component({
  selector: 'app-categories-page',
  imports: [RouterLink],
  template: `
    <section class="page-intro" aria-labelledby="page-title">
      <p class="eyebrow">Online Jobs Aggregator</p>
      <h1 id="page-title">Job categories</h1>
      <p class="page-description">Browse opportunities grouped by category.</p>
    </section>

    <section class="categories-panel" aria-labelledby="categories-title">
      <h2 id="categories-title">Available categories</h2>
      @let categories = categoriesState();
      @switch (categories.status) {
        @case ('loading') {
          <p role="status" aria-live="polite">Loading categories…</p>
        }
        @case ('error') {
          <div class="error-state" role="alert">
            <p>{{ categories.error.message }}</p>
            <button type="button" class="retry-button" (click)="loadCategories()">Try again</button>
          </div>
        }
        @case ('loaded') {
          @if (categories.value.length === 0) {
            <p class="empty-message">No categories are available yet.</p>
          } @else {
            <ul class="category-list">
              @for (category of categories.value; track category.id) {
                <li>
                  <a
                    [routerLink]="['/jobs']"
                    [queryParams]="{ category: category.id }"
                    class="category-card"
                  >
                    <div class="category-card-header">
                      <h3>{{ category.name }}</h3>
                    </div>
                    @if (category.description) {
                      <p class="category-description">{{ category.description }}</p>
                    }
                    <span class="view-jobs">View jobs <span aria-hidden="true">→</span></span>
                  </a>
                </li>
              }
            </ul>
          }
        }
        @case ('idle') {
          <p>Categories have not been loaded.</p>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .page-intro {
      max-width: 42rem;
    }

    .eyebrow {
      margin: 0 0 1rem;
      color: var(--color-accent-dark);
      font-size: 0.78rem;
      font-weight: 750;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 12ch;
      margin: 0;
      font-size: clamp(2.5rem, 7vw, 4.75rem);
      font-weight: 700;
      letter-spacing: -0.065em;
      line-height: 1.02;
    }

    .page-description {
      max-width: 38rem;
      margin: 1.5rem 0 0;
      color: var(--color-muted);
      font-size: clamp(1rem, 2vw, 1.2rem);
      line-height: 1.7;
    }

    .categories-panel {
      max-width: 42rem;
    }

    .categories-panel h2 {
      margin: 0 0 1rem;
      font-size: 1.1rem;
    }

    .category-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .category-card {
      display: block;
      padding: 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      background: var(--color-surface);
      color: var(--color-ink);
      text-decoration: none;
      transition: border-color 140ms ease, transform 140ms ease;
    }

    .category-card:hover {
      border-color: var(--color-accent);
      transform: translateY(-2px);
    }

    .category-card:focus-visible {
      outline: 3px solid var(--color-accent);
      outline-offset: 2px;
    }

    .category-card-header {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin: 0 0 0.5rem;
    }

    .category-card h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
    }

    .category-description {
      margin: 0 0 1rem;
      color: var(--color-muted);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .view-jobs {
      font-size: 0.85rem;
      font-weight: 650;
      color: var(--color-accent-dark);
    }

    .error-state,
    .empty-message {
      text-align: center;
      padding: 2rem;
      color: var(--color-muted);
    }

    .error-state {
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      background: var(--color-surface);
    }

    .retry-button {
      margin-top: 1rem;
      min-height: 2.65rem;
      padding: 0.6rem 1rem;
      border: 0;
      border-radius: 0.55rem;
      background: var(--color-ink);
      color: #fff;
      cursor: pointer;
      font-weight: 650;
    }

    .retry-button:hover {
      background: var(--color-accent-dark);
    }

    @media (max-width: 480px) {
      .category-list {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class CategoriesPage implements OnInit {
  private readonly referenceDataApi = inject(ReferenceDataApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categoriesState = signal<AsyncState<Category[]>>({ status: 'loading' });

  ngOnInit(): void {
    this.loadCategories();
  }

  protected loadCategories(): void {
    this.categoriesState.set({ status: 'loading' });
    this.referenceDataApi.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categoriesState.set({ status: 'loaded', value: categories }),
        error: (error: ApiError) => this.categoriesState.set({ status: 'error', error }),
      });
  }
}
