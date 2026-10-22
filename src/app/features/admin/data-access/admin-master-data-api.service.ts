import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client';
import { Category } from '../../../core/models/api.models';
import {
  AdminKeyword,
  AdminMasterSchema,
  CreateAdminCategoryKeywordRequest,
  CreateAdminCategoryKeywordResponse,
  CreateAdminCategoryRequest,
  CreateAdminKeywordRequest,
  CreateAdminKeywordResponse,
  SeedAdminCitiesRequest,
  SeedAdminCountriesRequest,
  SeedAdminDataResponse,
  SeedAdminSkillsRequest,
} from '../models/admin-master-data.models';

@Injectable({ providedIn: 'root' })
export class AdminMasterDataApiService {
  private readonly api = inject(ApiClient);

  getSchema(): Observable<AdminMasterSchema> {
    return this.api.get<AdminMasterSchema>('/master/schema');
  }

  getKeywords(): Observable<AdminKeyword[]> {
    return this.api.get<AdminKeyword[]>('/master/keywords');
  }

  createCategory(request: CreateAdminCategoryRequest): Observable<Category> {
    return this.api.post<Category>('/master/categories', request);
  }

  createKeyword(request: CreateAdminKeywordRequest): Observable<CreateAdminKeywordResponse> {
    return this.api.post<CreateAdminKeywordResponse>('/master/keywords', request);
  }

  seedSkills(request: SeedAdminSkillsRequest): Observable<SeedAdminDataResponse> {
    return this.api.post<SeedAdminDataResponse>('/master/seed-skills', request);
  }

  seedCountries(request: SeedAdminCountriesRequest): Observable<SeedAdminDataResponse> {
    return this.api.post<SeedAdminDataResponse>('/master/seed-countries', request);
  }

  seedCities(request: SeedAdminCitiesRequest): Observable<SeedAdminDataResponse> {
    return this.api.post<SeedAdminDataResponse>('/master/seed-cities', request);
  }

  createCategoryKeyword(
    request: CreateAdminCategoryKeywordRequest,
  ): Observable<CreateAdminCategoryKeywordResponse> {
    return this.api.post<CreateAdminCategoryKeywordResponse>('/master/category-keywords', request);
  }
}
