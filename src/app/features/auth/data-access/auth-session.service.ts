import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { AuthApiService } from './auth-api.service';
import { AuthUser } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authApi = inject(AuthApiService);
  private readonly accessTokenState = signal<string | null>(null);
  private readonly userState = signal<AuthUser | null>(null);

  readonly currentUser = this.userState.asReadonly();
  readonly isInitialized = signal(false);
  readonly restoreError = signal<ApiError | null>(null);
  readonly isAuthenticated = computed(() =>
    Boolean(this.accessTokenState()) && this.userState() !== null,
  );

  getAccessToken(): string | null {
    return this.accessTokenState();
  }

  setSession(accessToken: string, user: AuthUser): void {
    this.accessTokenState.set(accessToken);
    this.userState.set(user);
    this.restoreError.set(null);
    this.isInitialized.set(true);
  }

  setAccessToken(accessToken: string): void {
    this.accessTokenState.set(accessToken);
  }

  clear(): void {
    this.accessTokenState.set(null);
    this.userState.set(null);
    this.restoreError.set(null);
  }

  restore(): Observable<void> {
    this.clear();
    this.isInitialized.set(false);
    return this.authApi.refresh().pipe(
      switchMap(({ access_token }) => {
        this.setAccessToken(access_token);
        return this.authApi.getCurrentUser().pipe(
          tap((user) => this.userState.set(user)),
        );
      }),
      map(() => undefined),
      catchError((error: unknown) => {
        this.clear();
        if (!(error instanceof ApiError)) {
          return throwError(() => error);
        }
        if (error.status !== 401) {
          this.restoreError.set(error);
        }
        return of(undefined);
      }),
      tap(() => this.isInitialized.set(true)),
    );
  }
}
