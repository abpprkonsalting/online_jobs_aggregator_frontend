import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthApiService } from './features/auth/data-access/auth-api.service';
import { AuthSessionService } from './features/auth/data-access/auth-session.service';

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
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

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
