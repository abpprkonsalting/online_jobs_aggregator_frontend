import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { Category } from '../../../core/models/api.models';
import { ReferenceDataApiService } from '../../jobs/data-access/reference-data-api.service';
import { AuthSessionService } from '../data-access/auth-session.service';
import { UserInterestsApiService } from '../data-access/user-interests-api.service';
import { UserCategoryInterest } from '../models/auth.models';

@Component({
  selector: 'app-category-interests-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="interests-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Your account</p>
        <h1 id="page-title">Category interests</h1>
        <p>Follow categories to keep track of the areas that matter to you.</p>
      </header>

      @if (mutationError(); as error) {
        <p class="mutation-error" role="alert">{{ error }}</p>
      }
      @if (successMessage(); as message) {
        <p class="success-message" role="status" aria-live="polite">{{ message }}</p>
      }

      <div class="interest-layout">
        <section class="interest-panel" aria-labelledby="available-title">
          <h2 id="available-title">Available categories</h2>
          @let categories = categoriesState();
          @switch (categories.status) {
            @case ('loading') {
              <p role="status" aria-live="polite">Loading categories…</p>
            }
            @case ('error') {
              <div role="alert">
                <p>{{ categories.error.message }}</p>
                <button type="button" class="secondary-button retry-categories" (click)="loadCategories()">
                  Try again
                </button>
              </div>
            }
            @case ('loaded') {
              @if (categories.value.length === 0) {
                <p class="empty-message">No categories are available yet.</p>
              } @else {
                <form [formGroup]="categoryForm" (ngSubmit)="addInterest()">
                  <label for="category">Choose a category</label>
                  <select id="category" formControlName="categoryId">
                    <option value="">Select a category</option>
                    @for (category of categories.value; track category.id) {
                      <option [value]="category.id" [disabled]="isFollowed(category.id)">
                        {{ category.name }}{{ isFollowed(category.id) ? ' (following)' : '' }}
                      </option>
                    }
                  </select>
                  @if (categoryForm.controls.categoryId.invalid && categoryForm.controls.categoryId.touched) {
                    <p class="field-error">Choose a category to follow.</p>
                  }
                  <button
                    type="submit"
                    class="primary-button"
                    [disabled]="saving() || categoryForm.invalid"
                  >
                    {{ saving() ? 'Saving…' : 'Follow category' }}
                  </button>
                </form>
              }
            }
            @case ('idle') {
              <p>Categories have not been loaded.</p>
            }
          }
        </section>

        <section class="interest-panel" aria-labelledby="followed-title">
          <h2 id="followed-title">Your followed categories</h2>
          @let interests = interestsState();
          @switch (interests.status) {
            @case ('loading') {
              <p role="status" aria-live="polite">Loading your categories…</p>
            }
            @case ('error') {
              <div role="alert">
                <p>{{ interests.error.message }}</p>
                <button type="button" class="secondary-button retry-interests" (click)="loadInterests()">
                  Try again
                </button>
              </div>
            }
            @case ('loaded') {
              @if (interests.value.length === 0) {
                <p class="empty-message">You are not following any categories yet.</p>
              } @else {
                <ul class="interest-list">
                  @for (interest of interests.value; track interest.id) {
                    <li>
                      <div>
                        <h3>{{ interest.name }}</h3>
                        @if (interest.description) {
                          <p>{{ interest.description }}</p>
                        }
                      </div>
                      <button
                        type="button"
                        class="secondary-button remove-button"
                        [disabled]="saving()"
                        [attr.aria-label]="'Remove ' + interest.name + ' from followed categories'"
                        (click)="removeInterest(interest.id)"
                      >
                        Remove
                      </button>
                    </li>
                  }
                </ul>
              }
            }
            @case ('idle') {
              <p>Your followed categories have not been loaded.</p>
            }
          }
        </section>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .interests-page {
      min-width: 0;
    }

    .page-header {
      max-width: 44rem;
      margin-bottom: 2rem;
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

    .interest-layout {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
      gap: 1rem;
    }

    .interest-panel {
      min-width: 0;
      padding: 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      background: var(--color-surface);
    }

    .interest-panel h2 {
      margin: 0 0 1rem;
      font-size: 1.1rem;
    }

    .interest-panel form {
      display: grid;
      gap: 0.65rem;
    }

    label {
      font-size: 0.85rem;
      font-weight: 650;
    }

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

    .secondary-button {
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
    }

    .primary-button:disabled,
    .secondary-button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .interest-list {
      display: grid;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .interest-list li {
      display: flex;
      min-width: 0;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 0;
      border-bottom: 1px solid var(--color-border);
    }

    .interest-list li:last-child {
      border-bottom: 0;
    }

    .interest-list h3 {
      margin: 0;
      font-size: 0.95rem;
    }

    .interest-list p,
    .empty-message {
      margin: 0.4rem 0 0;
      color: var(--color-muted);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .field-error,
    .mutation-error {
      margin: 0;
      color: #a43d25;
      font-size: 0.85rem;
    }

    .success-message {
      color: #386445;
    }

    @media (max-width: 680px) {
      .interest-layout {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (max-width: 420px) {
      .interest-list li {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class CategoryInterestsPage implements OnInit {
  private readonly referenceDataApi = inject(ReferenceDataApiService);
  private readonly interestsApi = inject(UserInterestsApiService);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categoriesState = signal<AsyncState<Category[]>>({ status: 'loading' });
  protected readonly interestsState = signal<AsyncState<UserCategoryInterest[]>>({ status: 'loading' });
  protected readonly saving = signal(false);
  protected readonly mutationError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly categoryForm = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadInterests();
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

  protected loadInterests(): void {
    const userId = this.session.currentUser()?.id;
    if (!userId) {
      this.interestsState.set({
        status: 'error',
        error: new ApiError('Your session is no longer available. Sign in again to manage interests.', 'unauthorized', 401),
      });
      return;
    }

    this.interestsState.set({ status: 'loading' });
    this.interestsApi.listCategoryInterests(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (interests) => this.interestsState.set({ status: 'loaded', value: interests }),
        error: (error: ApiError) => this.interestsState.set({ status: 'error', error }),
      });
  }

  protected isFollowed(categoryId: string): boolean {
    const current = this.interestsState();
    return current.status === 'loaded' && current.value.some((interest) => interest.id === categoryId);
  }

  protected addInterest(): void {
    if (this.categoryForm.invalid || this.saving()) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const userId = this.session.currentUser()?.id;
    if (!userId) {
      this.mutationError.set('Your session is no longer available. Sign in again to manage interests.');
      return;
    }

    const categoryId = this.categoryForm.controls.categoryId.value;
    this.beginMutation();
    this.interestsApi.addCategoryInterest(userId, categoryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.categoryForm.reset({ categoryId: '' });
          this.successMessage.set('Category added to your interests.');
          this.loadInterests();
        },
        error: (error: ApiError) => this.finishMutationWithError(error),
      });
  }

  protected removeInterest(categoryId: string): void {
    if (this.saving()) {
      return;
    }

    const userId = this.session.currentUser()?.id;
    if (!userId) {
      this.mutationError.set('Your session is no longer available. Sign in again to manage interests.');
      return;
    }

    this.beginMutation();
    this.interestsApi.removeCategoryInterest(userId, categoryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set('Category removed from your interests.');
          this.loadInterests();
        },
        error: (error: ApiError) => this.finishMutationWithError(error),
      });
  }

  private beginMutation(): void {
    this.saving.set(true);
    this.mutationError.set(null);
    this.successMessage.set(null);
  }

  private finishMutationWithError(error: ApiError): void {
    this.saving.set(false);
    this.mutationError.set(error.message);
  }
}
