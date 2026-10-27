import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthSessionService } from '../features/auth/data-access/auth-session.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <section class="home-page" aria-labelledby="home-title">
      <div class="home-copy">
        <p class="eyebrow">Online Jobs Aggregator</p>
        @if (authSession.isAuthenticated()) {
          <h1 id="home-title">Welcome back.</h1>
          <p class="intro">
            Your workspace is ready. Continue to your authorized job search and account tools.
          </p>
          <a class="primary-action" routerLink="/jobs">Continue to jobs</a>
          <a class="secondary-action" routerLink="/jobs/table-scratch">Preview jobs table</a>
        } @else {
          <h1 id="home-title">The right opportunity starts with the right access.</h1>
          <p class="intro">
            Online Jobs Aggregator brings job opportunities and account tools together for
            authorized members. Sign in to continue.
          </p>
          <a
            class="primary-action"
            routerLink="/sign-in"
            [queryParams]="signInQueryParams()"
          >
            Sign in to your account
          </a>
          <p class="access-note">Access is limited to authorized users.</p>
        }
      </div>
      <div class="home-aside" aria-hidden="true">
        <span class="orbit orbit-one"></span>
        <span class="orbit orbit-two"></span>
        <span class="home-mark">OJA</span>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .home-page {
      display: grid;
      min-height: min(38rem, calc(100vh - 15rem));
      grid-template-columns: minmax(0, 1.2fr) minmax(15rem, 0.8fr);
      align-items: center;
      gap: clamp(2rem, 8vw, 7rem);
      overflow: hidden;
    }

    .home-copy {
      max-width: 42rem;
    }

    .eyebrow {
      margin: 0 0 1rem;
      color: var(--color-accent-dark);
      font-size: 0.78rem;
      font-weight: 750;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 13ch;
      margin: 0;
      font-size: clamp(2.8rem, 7vw, 5.5rem);
      line-height: 0.99;
      letter-spacing: -0.075em;
    }

    .intro {
      max-width: 38rem;
      margin: 1.5rem 0 2rem;
      color: var(--color-muted);
      font-size: clamp(1rem, 2vw, 1.2rem);
      line-height: 1.7;
    }

    .primary-action {
      display: inline-flex;
      min-height: 3.2rem;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.25rem;
      border-radius: 0.7rem;
      background: var(--color-ink);
      color: #fff;
      font-weight: 700;
      text-decoration: none;
      transition: background-color 140ms ease, transform 140ms ease;
    }

    .primary-action:hover {
      transform: translateY(-1px);
      background: var(--color-accent-dark);
    }

    .primary-action:focus-visible {
      outline: 3px solid var(--color-accent);
      outline-offset: 3px;
    }

    .secondary-action {
      display: inline-flex;
      min-height: 3.2rem;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.25rem;
      margin-left: 0.75rem;
      border-radius: 0.7rem;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-ink);
      font-weight: 700;
      text-decoration: none;
    }

    .secondary-action:hover {
      background: var(--color-subtle);
    }

    .secondary-action:focus-visible {
      outline: 3px solid var(--color-accent);
      outline-offset: 3px;
    }

    .access-note {
      margin: 1rem 0 0;
      color: var(--color-muted);
      font-size: 0.88rem;
    }

    .home-aside {
      position: relative;
      display: grid;
      width: min(100%, 22rem);
      aspect-ratio: 1;
      place-items: center;
      justify-self: center;
      border-radius: 50%;
      background: radial-gradient(circle, var(--color-subtle) 0 39%, transparent 40%);
    }

    .orbit {
      position: absolute;
      inset: 9%;
      border: 1px solid var(--color-border);
      border-radius: 50%;
    }

    .orbit-two {
      inset: 0;
      transform: rotate(-34deg) scaleX(0.62);
      border-color: color-mix(in srgb, var(--color-accent) 55%, var(--color-border));
    }

    .home-mark {
      display: grid;
      width: 6rem;
      aspect-ratio: 1;
      place-items: center;
      border-radius: 1.8rem;
      background: var(--color-accent-dark);
      box-shadow: 0 1.5rem 4rem rgb(25 43 38 / 18%);
      color: #fff;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.08em;
      transform: rotate(-8deg);
    }

    @media (max-width: 700px) {
      .home-page {
        min-height: auto;
        grid-template-columns: 1fr;
        gap: 2.5rem;
      }

      .home-aside {
        width: min(70vw, 17rem);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .primary-action {
        transition: none;
      }
    }
  `,
})
export class HomePage {
  protected readonly authSession = inject(AuthSessionService);
  private readonly route = inject(ActivatedRoute);

  protected readonly signInQueryParams = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => {
        const returnUrl = params.get('returnUrl');
        return returnUrl
          && returnUrl.startsWith('/')
          && !returnUrl.startsWith('//')
          && !returnUrl.includes('\\')
          ? { returnUrl }
          : null;
      }),
    ),
    { initialValue: null },
  );
}
