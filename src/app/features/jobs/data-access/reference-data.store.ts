import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';
import { AsyncState } from '../../../core/models/async-state';
import { ApiError } from '../../../core/http/api-error';
import { Category, City, Country, Skill, Source } from '../../../core/models/api.models';
import { ReferenceDataApiService } from './reference-data-api.service';

export type ResourceState<T> = AsyncState<T>;

@Injectable({ providedIn: 'root' })
export class ReferenceDataStore {
  private readonly api = inject(ReferenceDataApiService);

  readonly categories = signal<ResourceState<Category[]>>({ status: 'idle' });
  readonly skills = signal<ResourceState<Skill[]>>({ status: 'idle' });
  readonly cities = signal<ResourceState<City[]>>({ status: 'idle' });
  readonly countries = signal<ResourceState<Country[]>>({ status: 'idle' });
  readonly sources = signal<ResourceState<Source[]>>({ status: 'idle' });

  loadCategories(): void {
    this.load(this.categories, () => this.api.getCategories());
  }

  loadSkills(): void {
    this.load(this.skills, () => this.api.getSkills());
  }

  loadCities(): void {
    this.load(this.cities, () => this.api.getCities());
  }

  loadCountries(): void {
    this.load(this.countries, () => this.api.getCountries());
  }

  loadSources(): void {
    this.load(this.sources, () => this.api.getSources());
  }

  private load<T>(
    state: WritableSignal<ResourceState<T>>,
    request: () => Observable<T>,
  ): void {
    state.set({ status: 'loading' });
    request().subscribe({
      next: (value) => state.set({ status: 'loaded', value }),
      error: (error: ApiError) => state.set({ status: 'error', error }),
    });
  }
}
