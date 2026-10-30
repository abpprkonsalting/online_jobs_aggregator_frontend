import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client';

export interface NotificationSummary {
  id: string;
  job_count: number;
  jobs: unknown[];
  sent_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly api = inject(ApiClient);

  getPreferences(): Observable<{ opt_in: boolean }> {
    return this.api.get('/users/me/notification-preferences');
  }

  updatePreferences(optIn: boolean): Observable<{ opt_in: boolean }> {
    return this.api.patch('/users/me/notification-preferences', { opt_in: optIn });
  }

  listHistory(): Observable<NotificationSummary[]> {
    return this.api.get('/users/me/notifications');
  }
}
