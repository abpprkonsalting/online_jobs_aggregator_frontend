# Online Jobs Aggregator

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

API requests use the `/api` base URL in both development and production. During local development, the Angular server forwards `/api/**` requests to `http://127.0.0.1:3000` using [proxy.conf.json](./proxy.conf.json). For production, configure the web server or deployment platform to route `/api` to the backend on the same origin.

Feature services should use the shared `ApiClient` from `src/app/core/http/api-client.ts`. HTTP failures are normalized to `ApiError` values, including network, validation, authentication, authorization, and server failures. Set `withCredentials: true` only for requests that need browser-managed cookies.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Linting

To lint TypeScript and Angular templates, run:

```bash
npm run lint
```

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
