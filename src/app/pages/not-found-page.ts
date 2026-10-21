import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="not-found" aria-labelledby="not-found-title">
      <p class="error-code">404</p>
      <h1 id="not-found-title">We couldn’t find that page</h1>
      <p>The link may be out of date, or the page may have moved.</p>
      <a routerLink="/jobs">Back to jobs</a>
    </section>
  `,
  styles: `
    .not-found {
      max-width: 38rem;
    }

    .error-code {
      margin: 0 0 0.75rem;
      color: var(--color-accent-dark);
      font-size: 0.85rem;
      font-weight: 750;
      letter-spacing: 0.12em;
    }

    h1 {
      margin: 0;
      font-size: clamp(2.25rem, 6vw, 3.75rem);
      letter-spacing: -0.06em;
      line-height: 1.05;
    }

    .not-found > p:not(.error-code) {
      margin: 1rem 0 1.5rem;
      color: var(--color-muted);
      line-height: 1.6;
    }

    a {
      display: inline-flex;
      min-height: 2.75rem;
      align-items: center;
      padding: 0.6rem 1rem;
      border-radius: 0.6rem;
      background: var(--color-ink);
      color: #fff;
      font-weight: 650;
      text-decoration: none;
    }

    a:hover {
      background: var(--color-accent-dark);
    }
  `,
})
export class NotFoundPage {}
