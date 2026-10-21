import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client';
import { JobDetail, JobListQuery, JobListResponse } from '../../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class JobsApiService {
  private readonly api = inject(ApiClient);

  list(query: JobListQuery = {}): Observable<JobListResponse> {
    let params = new HttpParams();
    if (query.limit !== undefined) {
      params = params.set('limit', query.limit);
    }
    if (query.offset !== undefined) {
      params = params.set('offset', query.offset);
    }
    if (query.sort !== undefined) {
      params = params.set('sort', query.sort);
    }
    if (query.sortDir !== undefined) {
      params = params.set('sortDir', query.sortDir);
    }
    if (query.salary_min !== undefined) {
      params = params.set('salary_min', query.salary_min);
    }
    if (query.salary_max !== undefined) {
      params = params.set('salary_max', query.salary_max);
    }
    if (query.organization !== undefined) {
      params = params.set('organization', query.organization);
    }

    return this.api.get<JobListResponse>('/jobs', { params });
  }

  getById(id: string): Observable<JobDetail> {
    return this.api.get<JobDetail>(`/jobs/${encodeURIComponent(id)}`);
  }
}
