import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { AuthApiService } from '../data-access/auth-api.service';
import { AuthSessionService } from '../data-access/auth-session.service';

@Component({
  selector: 'app-sign-in-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="sign-in-page" aria-labelledby="sign-in-title">
      <div class="sign-in-card">
        <p class="eyebrow">Your next opportunity</p>
        <h1 id="sign-in-title">Welcome back</h1>
        <p class="intro">Sign in to continue to your account.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" (input)="clearError()">
          <div class="field">
            <label for="email">Email address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              required
              [attr.aria-invalid]="form.controls.email.invalid && submitted()"
              [attr.aria-describedby]="form.controls.email.invalid && submitted() ? 'email-error' : null"
            />
            @if (form.controls.email.hasError('required') && submitted()) {
              <p id="email-error" class="field-error" role="alert">Enter your email address.</p>
            } @else if (form.controls.email.hasError('email') && submitted()) {
              <p id="email-error" class="field-error" role="alert">Enter a valid email address.</p>
            }
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              required
              [attr.aria-invalid]="form.controls.password.invalid && submitted()"
              [attr.aria-describedby]="form.controls.password.invalid && submitted() ? 'password-error' : null"
            />
            @if (form.controls.password.hasError('required') && submitted()) {
              <p id="password-error" class="field-error" role="alert">Enter your password.</p>
            }
          </div>

          @if (errorMessage(); as message) {
            <p class="form-error" role="alert" aria-live="polite">{{ message }}</p>
          }

          <button type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .sign-in-page {
      display: grid;
      min-height: min(36rem, calc(100vh - 12rem));
      place-items: center;
      padding: 1rem 0;
    }

    .sign-in-card {
      width: min(100%, 28rem);
      padding: clamp(1.5rem, 5vw, 2.5rem);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      background: var(--color-surface);
    }

    .eyebrow {
      margin: 0 0 0.7rem;
      color: var(--color-accent-dark);
      font-size: 0.75rem;
      font-weight: 750;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: clamp(2rem, 6vw, 2.75rem);
      letter-spacing: -0.06em;
    }

    .intro {
      margin: 0.75rem 0 1.75rem;
      color: var(--color-muted);
      line-height: 1.6;
    }

    form,
    .field {
      display: grid;
      gap: 0.6rem;
    }

    form {
      gap: 1.1rem;
    }

    label {
      font-size: 0.85rem;
      font-weight: 650;
    }

    input {
      width: 100%;
      min-height: 2.8rem;
      padding: 0.65rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 0.55rem;
      background: var(--color-surface);
      color: var(--color-ink);
      font: inherit;
    }

    input:focus-visible {
      outline: 3px solid rgb(216 102 54 / 25%);
      border-color: var(--color-accent);
    }

    input[aria-invalid="true"] {
      border-color: #a43d25;
    }

    .field-error,
    .form-error {
      margin: 0;
      color: #a43d25;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    form > button {
      min-height: 2.85rem;
      border: 0;
      border-radius: 0.6rem;
      background: var(--color-ink);
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 650;
    }

    form > button:hover:not(:disabled) {
      background: var(--color-accent-dark);
    }

    form > button:disabled {
      cursor: wait;
      opacity: 0.7;
    }
  `,
})
export class SignInPage {
  private readonly authApi = inject(AuthApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected submit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const credentials = this.form.getRawValue();
    this.submitting.set(true);
    this.authApi.login(credentials).subscribe({
      next: (response) => {
        this.session.setSession(response.access_token, response.user);
        void this.router.navigateByUrl('/jobs');
      },
      error: (error: ApiError) => {
        this.submitting.set(false);
        this.errorMessage.set(error.message);
      },
    });
  }

  protected clearError(): void {
    this.errorMessage.set(null);
  }
}
