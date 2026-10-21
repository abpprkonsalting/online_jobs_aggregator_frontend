import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client';
import { Category, City, Country, Skill, Source } from '../../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class ReferenceDataApiService {
  private readonly api = inject(ApiClient);

  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories');
  }

  getSkills(): Observable<Skill[]> {
    return this.api.get<Skill[]>('/skills');
  }

  getCities(): Observable<City[]> {
    return this.api.get<City[]>('/cities');
  }

  getCountries(): Observable<Country[]> {
    return this.api.get<Country[]>('/countries');
  }

  getSources(): Observable<Source[]> {
    return this.api.get<Source[]>('/admin/sources');
  }
}
