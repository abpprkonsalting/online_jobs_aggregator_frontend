import { computed, Injectable, signal } from '@angular/core';
import { AuthUser } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly accessTokenState = signal<string | null>(null);
  private readonly userState = signal<AuthUser | null>(null);

  readonly currentUser = this.userState.asReadonly();
  readonly isAuthenticated = computed(() =>
    Boolean(this.accessTokenState()) && this.userState() !== null,
  );

  getAccessToken(): string | null {
    return this.accessTokenState();
  }

  setSession(accessToken: string, user: AuthUser): void {
    this.accessTokenState.set(accessToken);
    this.userState.set(user);
  }

  setAccessToken(accessToken: string): void {
    this.accessTokenState.set(accessToken);
  }

  clear(): void {
    this.accessTokenState.set(null);
    this.userState.set(null);
  }
}
