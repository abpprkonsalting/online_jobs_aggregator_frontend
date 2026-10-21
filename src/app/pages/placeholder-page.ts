import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder-page',
  imports: [AsyncPipe],
  template: `
    <section class="page-intro" aria-labelledby="page-title">
      <p class="eyebrow">Online Jobs Aggregator</p>
      <h1 id="page-title">{{ (route.data | async)?.['title'] }}</h1>
      <p class="page-description">{{ (route.data | async)?.['description'] }}</p>
    </section>
  `,
  styles: `
    .page-intro {
      max-width: 42rem;
    }

    .eyebrow {
      margin: 0 0 1rem;
      color: var(--color-accent-dark);
      font-size: 0.78rem;
      font-weight: 750;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 12ch;
      margin: 0;
      font-size: clamp(2.5rem, 7vw, 4.75rem);
      font-weight: 700;
      letter-spacing: -0.065em;
      line-height: 1.02;
    }

    .page-description {
      max-width: 38rem;
      margin: 1.5rem 0 0;
      color: var(--color-muted);
      font-size: clamp(1rem, 2vw, 1.2rem);
      line-height: 1.7;
    }
  `,
})
export class PlaceholderPage {
  protected readonly route = inject(ActivatedRoute);
}
