import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client';
import { JobDetail, JobListQuery, JobListResponse, SavedJob } from '../../../core/models/api.models';

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
    if (query.sorts && query.sorts.length > 0) {
      for (const criterion of query.sorts) {
        params = params.append('sort', criterion.field);
        params = params.append('sortDir', criterion.dir);
      }
    } else {
      if (query.sort !== undefined) {
        params = params.set('sort', query.sort);
      }
      if (query.sortDir !== undefined) {
        params = params.set('sortDir', query.sortDir);
      }
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
    if (query.location !== undefined) {
      params = params.set('location', query.location);
    }
    if (query.category !== undefined) {
      params = params.set('category', query.category);
    }
    if (query.allow_remote !== undefined) {
      params = params.set('allow_remote', query.allow_remote ? 'true' : 'false');
    }
    if (query.posted !== undefined) {
      params = params.set('posted', query.posted);
    }

    return this.api.get<JobListResponse>('/jobs', { params });
  }

  getById(id: string): Observable<JobDetail> {
    return this.api.get<JobDetail>(`/jobs/${encodeURIComponent(id)}`);
  }

  listSavedJobs(): Observable<SavedJob[]> {
    return this.api.get<SavedJob[]>('/users/me/saved-jobs');
  }

  saveJob(jobId: string, status: 'saved' | 'applied' = 'saved'): Observable<SavedJob> {
    return this.api.post<SavedJob>('/users/me/saved-jobs', { job_id: jobId, status });
  }

  updateSavedJobStatus(jobId: string, status: 'saved' | 'applied'): Observable<SavedJob> {
    return this.api.patch<SavedJob>(`/users/me/saved-jobs/${encodeURIComponent(jobId)}`, { status });
  }

  unsaveJob(jobId: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/users/me/saved-jobs/${encodeURIComponent(jobId)}`);
  }
}
