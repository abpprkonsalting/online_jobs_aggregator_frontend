import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client';
import {
  AuthUser,
  LoginCredentials,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly api = inject(ApiClient);

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/auth/login', credentials, { withCredentials: true });
  }

  refresh(): Observable<RefreshResponse> {
    return this.api.post<RefreshResponse>('/auth/refresh', null, { withCredentials: true });
  }

  getCurrentUser(): Observable<AuthUser> {
    return this.api.get<AuthUser>('/auth/me');
  }

  logout(): Observable<LogoutResponse> {
    return this.api.post<LogoutResponse>('/auth/logout', null, { withCredentials: true });
  }
}
