# Online Jobs Aggregator

Angular frontend for browsing aggregated job listings and managing user interests and administrator data.

## Prerequisites

- Node.js `^22.22.3`, `^24.15.0`, or `>=26.0.0` (supported by the installed Angular CLI).
- npm `11.16.0` (the version declared by `package.json`).
- The backend API and its configured MySQL database. See the backend [environment example](../backend/.env.example) and [setup notes](../backend/README.txt). The development proxy expects the API at `http://127.0.0.1:3000`.

## Local development

Install frontend dependencies:

```bash
cd frontend
npm ci
```

Start the backend API in a separate terminal:

```bash
cd backend
npm ci
# Configure the backend .env and MySQL connection before starting.
npm run api
```

The API server initializes the database and seeds the configured administrator on startup. It is separate from the fetch daemon. Existing jobs can be browsed with the API alone; to run the configured background fetcher, start it in another terminal with `npm run dev` from `backend`.

Start the frontend:

```bash
cd frontend
npm start
```

Open <http://127.0.0.1:4200>. The Angular development server proxies `/api/**` to `http://127.0.0.1:3000` using [proxy.conf.json](./proxy.conf.json), so browser requests remain same-origin during development. The API base path is `/api` in both environment files.

## Quality checks

Run these commands from `frontend`:

```bash
npm run lint
npm test -- --watch=false
npm run build
```

The test command runs the Vitest suite once. The production build is written to `dist/online-jobs-aggregator/browser/`.

## Production deployment

Publish the contents of `dist/online-jobs-aggregator/browser/` to a static web server or hosting platform. Configure the server to:

1. Serve the Angular `index.html` for application routes such as `/jobs/:id`, `/account`, and `/admin/**` (history-API fallback).
2. Forward `/api/**` to the backend API without rewriting the API paths or dropping response headers such as `Set-Cookie`.
3. Keep the frontend and API same-origin where possible; the frontend uses the relative `/api` base path and does not set a production API hostname at runtime.

Authentication uses an httpOnly refresh-token cookie and an in-memory access token. Same-origin deployments must preserve the refresh cookie through the proxy. If deploying the frontend and API on different origins, configure explicit credentialed CORS and compatible cookie `SameSite`/`Secure` settings on the backend; the current backend does not provide that cross-origin configuration.

The home and sign-in pages are public; job, category, account, and administrator pages and their data APIs require authentication. Successful sign-in, interest changes, and administrator actions should be smoke-tested with an authorized test account in the target environment. The earlier live development smoke test did not have valid account credentials for those signed-in workflows.
