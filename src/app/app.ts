import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiClient } from './core/http/api-client';
import { AuthApiService } from './features/auth/data-access/auth-api.service';
import { AuthSessionService } from './features/auth/data-access/auth-session.service';

interface BackendVersionMetadata {
  releaseTag: string | null;
  buildStatus: 'release' | 'untagged' | 'development';
}

function isBackendVersionMetadata(value: unknown): value is BackendVersionMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const metadata = value as Record<string, unknown>;
  const { buildStatus, releaseTag } = metadata;
  if (
    typeof buildStatus !== 'string'
    || !['release', 'untagged', 'development'].includes(buildStatus)
  ) return false;
  if (releaseTag === null) return buildStatus !== 'release';
  return (
    typeof releaseTag === 'string'
    && buildStatus === 'release'
    && /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(releaseTag)
  );
}

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly authSession = inject(AuthSessionService);
  protected readonly signingOut = signal(false);
  protected readonly signOutMessage = signal<string | null>(null);
  protected readonly backendVersion = signal('Backend version loading...');
  private readonly api = inject(ApiClient);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  constructor() {
    this.api.get<unknown>('version').subscribe({
      next: (response) => {
        if (!isBackendVersionMetadata(response)) {
          this.backendVersion.set('Backend version unavailable');
          return;
        }
        const version = response.releaseTag ?? response.buildStatus;
        this.backendVersion.set(`Backend ${version} (API + Fetcher)`);
      },
      error: () => this.backendVersion.set('Backend version unavailable'),
    });
  }

  protected signOut(): void {
    if (this.signingOut()) {
      return;
    }

    this.signingOut.set(true);
    this.signOutMessage.set(null);
    this.authApi.logout().subscribe({
      next: (response) => {
        if (!response.success) {
          this.signOutMessage.set(
            'You are signed out on this device, but the server did not confirm session revocation.',
          );
        }
        this.finishSignOut();
      },
      error: (error: unknown) => {
        const detail = error instanceof Error ? ` ${error.message}` : '';
        this.signOutMessage.set(
          `You are signed out on this device, but the server may not have revoked your session.${detail}`,
        );
        this.finishSignOut();
      },
    });
  }

  private finishSignOut(): void {
    this.authSession.clear();
    this.signingOut.set(false);
    void this.router.navigateByUrl('/');
  }
}
