import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client';
import {
  UserCategoryInterest,
  UserCategoryInterestDeleteResponse,
  UserCategoryInterestMutation,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class UserInterestsApiService {
  private readonly api = inject(ApiClient);

  listCategoryInterests(userId: string): Observable<UserCategoryInterest[]> {
    return this.api.get<UserCategoryInterest[]>(
      `/users/${encodeURIComponent(userId)}/categories`,
    );
  }

  addCategoryInterest(userId: string, categoryId: string): Observable<UserCategoryInterestMutation> {
    return this.api.post<UserCategoryInterestMutation>(
      `/users/${encodeURIComponent(userId)}/categories`,
      { category_id: categoryId },
    );
  }

  removeCategoryInterest(
    userId: string,
    categoryId: string,
  ): Observable<UserCategoryInterestDeleteResponse> {
    return this.api.delete<UserCategoryInterestDeleteResponse>(
      `/users/${encodeURIComponent(userId)}/categories/${encodeURIComponent(categoryId)}`,
    );
  }
}
