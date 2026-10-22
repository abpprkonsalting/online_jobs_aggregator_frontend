import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { AsyncState } from '../../../core/models/async-state';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminUser } from '../models/admin.models';

@Component({
  selector: 'app-admin-users-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="admin-page" aria-labelledby="page-title">
      <header class="page-header">
        <p class="eyebrow">Administration</p>
        <h1 id="page-title">User management</h1>
        <p>Review user accounts and create new accounts for the application.</p>
      </header>

      <nav class="admin-navigation" aria-label="Administrator sections">
        <a routerLink="/admin" aria-current="page">Users</a>
        <a routerLink="/admin/sources">Sources</a>
        <a routerLink="/admin/geographic-areas">Geographic areas</a>
        <a routerLink="/admin/assignments">Assignments</a>
        <a routerLink="/admin/fetch-runs">Fetch history</a>
        <a routerLink="/admin/master-data">Master data</a>
      </nav>

      <section class="admin-panel" aria-labelledby="create-user-title">
        <h2 id="create-user-title">Create a user</h2>
        @if (createError(); as error) {
          <p class="error-message" role="alert">{{ error }}</p>
        }
        @if (successMessage(); as message) {
          <p class="success-message" role="status" aria-live="polite">{{ message }}</p>
        }
        @if (mutationError(); as error) {
          <p class="error-message" role="alert">{{ error }}</p>
        }
        @if (mutationMessage(); as message) {
          <p class="success-message" role="status" aria-live="polite">{{ message }}</p>
        }
        <form [formGroup]="userForm" (ngSubmit)="createUser()">
          <div class="form-grid">
            <div class="field">
              <label for="user-email">Email</label>
              <input id="user-email" type="email" formControlName="email" autocomplete="email" />
              @if (userForm.controls.email.touched && userForm.controls.email.hasError('required')) {
                <p class="field-error">Enter an email address.</p>
              } @else if (userForm.controls.email.touched && userForm.controls.email.hasError('email')) {
                <p class="field-error">Enter a valid email address.</p>
              }
            </div>
            <div class="field">
              <label for="user-password">Password</label>
              <input
                id="user-password"
                type="password"
                formControlName="password"
                autocomplete="new-password"
              />
              @if (userForm.controls.password.touched && userForm.controls.password.hasError('required')) {
                <p class="field-error">Enter a password.</p>
              } @else if (userForm.controls.password.touched && userForm.controls.password.hasError('minlength')) {
                <p class="field-error">Password must be at least 6 characters.</p>
              }
            </div>
            <div class="field">
              <label for="user-role">Role</label>
              <select id="user-role" formControlName="role">
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          <button type="submit" class="primary-button" [disabled]="creating()">
            {{ creating() ? 'Creating…' : 'Create user' }}
          </button>
        </form>
      </section>

      <section class="admin-panel users-panel" aria-labelledby="users-title">
        <div class="section-heading">
          <h2 id="users-title">Users</h2>
          <button type="button" class="secondary-button" (click)="loadUsers()">Refresh</button>
        </div>
        @let users = usersState();
        @switch (users.status) {
          @case ('loading') {
            <p role="status" aria-live="polite">Loading users…</p>
          }
          @case ('error') {
            <div role="alert">
              <p>{{ users.error.message }}</p>
              <button type="button" class="secondary-button" (click)="loadUsers()">Try again</button>
            </div>
          }
          @case ('loaded') {
            @if (users.value.length === 0) {
              <p class="empty-message">No users found.</p>
            } @else {
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Email</th>
                      <th scope="col">Role</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last sign-in</th>
                      <th scope="col">Created</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (user of users.value; track user.id) {
                      <tr>
                        <td>{{ user.email }}</td>
                        <td>{{ user.role === 'admin' ? 'Administrator' : 'User' }}</td>
                        <td>{{ user.is_active ? 'Active' : 'Inactive' }}</td>
                        <td>{{ user.last_login_at ?? 'Never' }}</td>
                        <td>{{ user.created_at }}</td>
                        <td>
                          <div class="row-actions">
                            <button
                              type="button"
                              class="secondary-button role-action"
                              [disabled]="mutatingUserId() !== null"
                              (click)="toggleUserRole(user)"
                            >
                              {{ user.role === 'admin' ? 'Set as user' : 'Make admin' }}
                            </button>
                            <button
                              type="button"
                              class="secondary-button deactivate-button"
                              [disabled]="!user.is_active || mutatingUserId() !== null"
                              (click)="deactivateUser(user)"
                            >
                              {{ mutatingUserId() === user.id ? 'Saving…' : 'Deactivate' }}
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('idle') {
            <p>User list is not loaded.</p>
          }
        }
      </section>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .admin-page {
      display: grid;
      min-width: 0;
      gap: 1.25rem;
    }

    .page-header {
      max-width: 44rem;
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
      font-size: clamp(2.25rem, 6vw, 3.75rem);
      letter-spacing: -0.06em;
      line-height: 1.05;
    }

    .page-header > p:last-child {
      margin: 0.9rem 0 0;
      color: var(--color-muted);
      line-height: 1.6;
    }

    .admin-panel {
      min-width: 0;
      padding: 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      background: var(--color-surface);
    }

    .admin-navigation {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .admin-navigation a {
      padding: 0.55rem 0.8rem;
      border-radius: 0.55rem;
      background: var(--color-subtle);
      color: var(--color-ink);
      font-size: 0.9rem;
      font-weight: 650;
      text-decoration: none;
    }

    .admin-navigation a[aria-current='page'] {
      background: var(--color-ink);
      color: #fff;
    }

    h2 {
      margin: 0;
      font-size: 1.1rem;
    }

    form {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .field {
      display: grid;
      align-content: start;
      gap: 0.45rem;
    }

    label,
    th {
      font-size: 0.85rem;
      font-weight: 650;
    }

    input,
    select {
      width: 100%;
      min-height: 2.75rem;
      padding: 0.6rem 0.7rem;
      border: 1px solid var(--color-border);
      border-radius: 0.55rem;
      background: var(--color-surface);
      color: var(--color-ink);
      font: inherit;
    }

    .primary-button,
    .secondary-button {
      min-height: 2.65rem;
      padding: 0.55rem 0.85rem;
      border-radius: 0.55rem;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 650;
    }

    .primary-button {
      justify-self: start;
      border: 0;
      background: var(--color-ink);
      color: #fff;
    }

    .primary-button:disabled {
      cursor: wait;
      opacity: 0.65;
    }

    .secondary-button {
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
    }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .row-actions {
      display: flex;
      gap: 0.5rem;
    }

    .table-scroll {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th,
    td {
      padding: 0.8rem 0.65rem;
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }

    .field-error,
    .error-message {
      margin: 0;
      color: #9b321d;
      font-size: 0.85rem;
    }

    .success-message {
      color: #22623f;
    }

    .empty-message {
      color: var(--color-muted);
    }

    @media (max-width: 720px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminUsersPage implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  protected readonly usersState = signal<AsyncState<AdminUser[]>>({ status: 'loading' });
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly mutationError = signal<string | null>(null);
  protected readonly mutationMessage = signal<string | null>(null);
  protected readonly mutatingUserId = signal<string | null>(null);
  protected readonly userForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    role: new FormControl<'admin' | 'user'>('user', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  protected loadUsers(): void {
    this.usersState.set({ status: 'loading' });
    this.adminApi.listUsers().subscribe({
      next: (users) => this.usersState.set({ status: 'loaded', value: users }),
      error: (error: ApiError) => this.usersState.set({ status: 'error', error }),
    });
  }

  protected createUser(): void {
    if (this.creating()) {
      return;
    }
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    this.createError.set(null);
    this.successMessage.set(null);
    this.adminApi.createUser(this.userForm.getRawValue()).subscribe({
      next: (user) => {
        this.creating.set(false);
        this.userForm.reset({ email: '', password: '', role: 'user' });
        this.successMessage.set(`Created account for ${user.email}.`);
        this.loadUsers();
      },
      error: (error: unknown) => {
        this.creating.set(false);
        this.createError.set(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while creating the user.',
        );
      },
    });
  }

  protected toggleUserRole(user: AdminUser): void {
    if (this.mutatingUserId() !== null) {
      return;
    }

    const role = user.role === 'admin' ? 'user' : 'admin';
    this.startMutation(user.id);
    this.adminApi.updateUserRole(user.id, role).subscribe({
      next: (updatedUser) => {
        this.updateUser(user.id, { role: updatedUser.role });
        this.mutationMessage.set(`Updated ${user.email} to ${role === 'admin' ? 'administrator' : 'user'}.`);
        this.finishMutation();
      },
      error: (error: unknown) => this.failMutation(error),
    });
  }

  protected deactivateUser(user: AdminUser): void {
    if (!user.is_active || this.mutatingUserId() !== null) {
      return;
    }
    if (!window.confirm(`Deactivate ${user.email}? They will no longer be able to sign in.`)) {
      return;
    }

    this.startMutation(user.id);
    this.adminApi.deactivateUser(user.id).subscribe({
      next: (response) => {
        if (!response.success) {
          this.mutationError.set(`The server did not confirm deactivation for ${user.email}.`);
          this.finishMutation();
          return;
        }
        this.updateUser(user.id, { is_active: 0 });
        this.mutationMessage.set(`Deactivated ${user.email}.`);
        this.finishMutation();
      },
      error: (error: unknown) => this.failMutation(error),
    });
  }

  private startMutation(userId: string | null = null): void {
    this.mutatingUserId.set(userId);
    this.mutationError.set(null);
    this.mutationMessage.set(null);
  }

  private finishMutation(): void {
    this.mutatingUserId.set(null);
  }

  private failMutation(error: unknown): void {
    this.mutationError.set(
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred while updating the user.',
    );
    this.finishMutation();
  }

  private updateUser(userId: string, update: Partial<AdminUser>): void {
    const current = this.usersState();
    if (current.status !== 'loaded') {
      return;
    }

    this.usersState.set({
      status: 'loaded',
      value: current.value.map((user) => user.id === userId ? { ...user, ...update } : user),
    });
  }
}
