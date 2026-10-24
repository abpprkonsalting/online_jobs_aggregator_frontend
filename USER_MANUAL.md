# User Manual: Online Jobs Aggregator Frontend

## 1. Project Overview

The Online Jobs Aggregator Frontend is an Angular 22 single-page application (SPA) that provides the user interface for the Map Rezi job aggregation platform. It enables users to browse, search, filter, sort, and inspect job listings; manage their personal accounts and category interests; and—administrators to manage users, sources, geographic areas, and master data.

The frontend is a static TypeScript application that consumes the backend REST API. It does not connect to MySQL directly and does not own job ingestion or normalization. Categories, skills, cities, countries, and keywords are managed through the backend's master-data API.

**Target audience:** job seekers, employers, platform administrators, and frontend developers.

**Deployment target:** Debian 13 VPS running Apache, serving static files with `/api` proxying to the backend Node.js API.

---

## 2. System Architecture (Simplified)

```
Browser
    │
    ▼
   Apache (static file server + reverse proxy)
    │
    ├──▶  dist/online-jobs-aggregator/browser/   (Angular SPA assets)
    │       ├── index.html
    │       ├── main-*.js
    │       ├── styles-*.css
    │       └── assets/
    │
    └──▶  /api ────────────────────────────────▶  Node.js API (port 3000)
                                                    │
                                                    ▼
                                               MySQL (map_rezi)
```

### Components

| Component | Responsibility |
|---|---|
| **Angular Application** | Client-side SPA with routing, state management, and UI components |
| **API Client Services** | Typed HTTP services in `core/` that call backend endpoints |
| **Authentication State** | In-memory access token + httpOnly refresh cookie |
| **Apache** | Serves static files and proxies `/api` to the backend on the same origin |

### Data Flow

1. User navigates to the application in a browser.
2. Apache serves `index.html` and the Angular application bootstraps.
3. The Angular app makes API requests to relative `/api` paths.
4. Apache proxies `/api` requests to `http://127.0.0.1:3000/api` where the backend API runs.
5. For authenticated requests, the frontend includes the `Authorization: Bearer <token>` header and sends the httpOnly refresh cookie automatically.
6. The backend responds with JSON; the Angular app renders the updated UI.

---

## 3. Features

### 3.1 Job Discovery (MVP)

| Feature | Description |
|---|---|
| Job listing | Browse jobs with loading, empty, error, and retry states |
| Job detail | View full job information: title, organization, location, salary, posted date, description, skills, categories |
| Filters | Category, skill, city/country, source, remote availability, salary range, organization |
| Sorting | Sort by backend-supported fields (e.g., posted date) |
| Pagination | Paginate using `limit`, `offset`, `total`, and `hasMore` from the API |
| URL state | Filter and pagination state serialized in route query parameters (bookmarkable, browser back/forward works) |
| Responsive | Mobile-first layout, keyboard-accessible forms and controls |

### 3.2 User Accounts & Authentication

| Feature | Description |
|---|---|
| Sign in | `POST /api/auth/login` with email and password |
| Sign out | `POST /api/auth/logout`, clears session |
| Session restoration | `POST /api/auth/refresh` via httpOnly refresh cookie |
| Current user | `GET /api/auth/me` returns authenticated user info |
| Protected routes | Unauthenticated visitors are redirected to the public home page; sign-in returns them to their requested route |
| Public access | The home and sign-in pages are public; job, category, account, and admin pages require authentication |
| Access token | Short-lived JWT held in application memory, sent in `Authorization` header |
| Refresh token | httpOnly cookie, not accessible by frontend JavaScript |

### 3.3 User Interests (Signed-In Users)

| Feature | Description |
|---|---|
| Followed categories | View and manage categories the user follows via `GET/POST/DELETE /api/users/:id/categories` |
| Personalized search | Signed-in job searches show jobs in followed categories; when no categories are followed, the full catalogue is shown |
| Job search access | Job searches require authentication; anonymous visitors cannot access the job catalogue |

### 3.4 Administration (Admin Role Only)

| Feature | Description |
|---|---|
| User management | List, create, change role, deactivate users |
| Source management | List, create, edit, enable/disable, delete sources (`working_mode`: `passive`, `proactive`, `both`) |
| Geographic area management | List, create, edit, enable/disable, delete areas |
| Source/area assignment | Link and unlink sources and geographic areas |
| Fetch history | View recent fetch runs with status, counts, warnings, and errors |
| Master data tools | Seed categories, skills, cities, countries; manage keywords |

---

## 4. Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/              # API client, auth, guards, shared error handling
│   │   ├── features/
│   │   │   ├── jobs/          # Job search, filters, listing, detail
│   │   │   ├── account/       # Sign-in, category interests
│   │   │   └── admin/         # Users, sources, areas, fetch runs, master data
│   │   └── shared/            # Reusable form controls, pagination, states
│   ├── environments/
│   │   ├── environment.ts              # Production (apiBaseUrl: '/api')
│   │   └── environment.development.ts  # Development
│   ├── styles.css
│   └── main.ts
├── angular.json                  # Angular CLI configuration
├── proxy.conf.json               # Development proxy: /api → http://127.0.0.1:3000
├── package.json
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.spec.json
```

---

## 5. Configuration

### Environment Files

| File | Purpose |
|---|---|
| `src/environments/environment.ts` | Production build. `apiBaseUrl: '/api'` (relative, same-origin via Apache proxy) |
| `src/environments/environment.development.ts` | Development build with source maps |

No runtime API hostname is configured. The frontend uses relative `/api` paths, and Apache handles proxying to the backend. This means frontend and backend must be deployed on the same origin (same domain via Apache virtual host).

### Development Proxy

`proxy.conf.json`:
```json
{
  "/api/**": {
    "target": "http://127.0.0.1:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

Used only during `npm start` (development). Not used in production.

---

## 6. Installation & Local Development

### Prerequisites

- Node.js ^22.22.3, ^24.15.0, or >=26.0.0 (supported by Angular CLI 22)
- npm 11.16.0
- Backend API running on `http://127.0.0.1:3000` (see backend manual)

### Steps

```bash
# 1. Enter the frontend directory
cd frontend

# 2. Install dependencies
npm ci

# 3. Start the backend API in a separate terminal (see backend manual)
#    cd backend && npm run build && node dist/api/server.js

# 4. Start the frontend development server
npm start

# 5. Open http://127.0.0.1:4200
```

The development server proxies `/api/**` to `http://127.0.0.1:3000` so browser requests remain same-origin during development.

### Quality Checks

```bash
# Run lint
npm run lint

# Run tests (single run)
npm test -- --watch=false

# Production build
npm run build

# Build output: dist/online-jobs-aggregator/browser/
```

### Scripts

| Script | Purpose |
|---|---|
| `npm start` | Start development server with proxy |
| `npm run build` | Production build to `dist/online-jobs-aggregator/browser/` |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest test suite |
| `npm run watch` | Build in watch mode (development) |

---

## 7. Production Deployment (Debian 13 + Apache)

### Prerequisites on the VPS

- Debian 13
- Apache 2 with `proxy`, `proxy_http`, `rewrite`, `headers` modules
- Backend API already deployed and running on `http://127.0.0.1:3000` (see backend manual)
- A `deploy` SSH user for GitHub Actions; the backend daemons run separately as non-login `map_rezi`
- Root or sudo access

### 1. System Preparation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Apache and required modules
sudo apt-get install -y apache2 libapache2-mod-proxy-html libxml2-dev
sudo a2enmod proxy proxy_http rewrite headers

# Create the deployment user and frontend directory only; do not change
# ownership of the backend directory or backend log directory here.
sudo useradd -m -s /bin/bash deploy || true
sudo mkdir -p /var/www/map_rezi/frontend
sudo chown -R deploy:deploy /var/www/map_rezi/frontend
```

### 2. Apache Virtual Host

Copy `systemd/apache-map-rezi.conf` to `/etc/apache2/sites-available/map_rezi.conf`, edit `<your-domain>`, and enable:

```bash
sudo cp systemd/apache-map-rezi.conf /etc/apache2/sites-available/map_rezi.conf
sudo nano /etc/apache2/sites-available/map_rezi.conf
sudo a2ensite map_rezi.conf
sudo a2dissite 000-default.conf 2>/dev/null || true
sudo apache2ctl configtest && sudo systemctl reload apache2
```

For HTTPS, install Certbot:

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d <your-domain>
```

### 3. GitHub Secrets

In the frontend repository (`online_jobs_aggregator_frontend`), go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|---|---|
| `VPS_HOST` | Your VPS IP address or domain |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private key of the `deploy` user on the VPS |
| `VPS_SSH_KNOWN_HOSTS` | Output of `ssh-keyscan -H <your-domain>` |

### 4. Deployment Flow

1. Push to `master` in the frontend repository.
2. GitHub Actions: `npm ci` → `npm run lint` → `npm test -- --watch=false` → `npm run build` → rsyncs `dist/online-jobs-aggregator/browser/` to `/var/www/map_rezi/frontend/` on VPS → `sudo systemctl reload apache2`.

### 5. Verification

```bash
# Check Apache is running
sudo systemctl status apache2

# Test frontend is served
curl -I http://<your-domain>/

# Test API proxy through Apache
curl http://<your-domain>/api/categories

# View Apache logs
sudo tail -f /var/log/apache2/map_rezi_error.log
sudo tail -f /var/log/apache2/map_rezi_access.log
```

---

## 8. Operations & Monitoring

### Checking Service Status

```bash
# Apache (frontend server)
sudo systemctl status apache2

# Backend API (separate systemd unit, see backend manual)
sudo systemctl status map-rezi-api
```

### Viewing Logs

```bash
# Apache error log
sudo tail -f /var/log/apache2/map_rezi_error.log

# Apache access log
sudo tail -f /var/log/apache2/map_rezi_access.log
```

### Reloading After Changes

```bash
# After frontend deployment (handled by GitHub Actions)
sudo systemctl reload apache2
```

---

## 9. Authentication & Cookies

### Access Token

- Held in application memory (not persisted to localStorage or sessionStorage)
- Sent in `Authorization: Bearer <token>` header on protected requests
- Short-lived (15 minutes by default)

### Refresh Token

- httpOnly cookie, not readable by frontend JavaScript
- Automatically sent by the browser on credentialed requests to `POST /api/auth/refresh`
- Long-lived (7 days by default)

### Cookie Domain

The backend sets `COOKIE_DOMAIN` in its `.env`. This must match the deployed domain for the refresh cookie to be accepted by the browser. For example:

```
COOKIE_DOMAIN=jobs.example.com
```

### Cross-Origin Considerations

- **Same origin (recommended):** Frontend and backend on the same domain via Apache proxy. No CORS configuration needed.
- **Different origins:** Requires explicit CORS headers and `SameSite=None; Secure` cookie settings on the backend, which are not yet implemented.

---

## 10. Troubleshooting

### Frontend won't load

| Symptom | Likely Cause | Fix |
|---|---|---|
| Blank page or 404 | Apache not serving `index.html` | Verify `DocumentRoot` and `RewriteRule ^ /index.html [L]` in virtual host |
| API requests fail | Backend not running or not on port 3000 | Check `map-rezi-api` status; verify Apache `/api` proxy config |
| CORS errors | Frontend and API on different origins | Deploy both on same origin via Apache, or configure backend CORS |
| 502 Bad Gateway | Backend not responding | Check `sudo systemctl status map-rezi-api` and port 3000 |

### Authentication issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| Sign-in fails | Wrong credentials or backend not running | Verify credentials and backend status |
| Session not restored after refresh | Refresh cookie not set or `COOKIE_DOMAIN` mismatch | Verify `COOKIE_DOMAIN` matches deployed domain; ensure HTTPS |
| Protected routes redirect to sign-in | Missing or expired access token | Sign in again; check `Authorization` header is being sent |

### Build / Deploy issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| `npm run build` fails | TypeScript errors or missing dependencies | Run `npm ci` first; check TypeScript version compatibility |
| GitHub Actions deploy fails | SSH key or VPS unreachable | Verify `VPS_SSH_KEY`, `VPS_HOST`, and `VPS_SSH_KNOWN_HOSTS` secrets |
| Apache won't start | Invalid virtual host config | Run `sudo apache2ctl configtest` to find syntax errors |

---

## 11. Safety & Limits

### Secrets Management

- No secrets are stored in the frontend repository. All sensitive configuration lives in the backend `.env`.
- The `VPS_SSH_KEY` GitHub secret grants access to the VPS; protect it accordingly.

### Authentication Security

- Access tokens are short-lived (15 minutes) and held in memory only.
- Refresh tokens are httpOnly cookies, inaccessible to JavaScript (XSS protection).
- Credentialed requests include cookies; ensure HTTPS in production to prevent cookie interception.

### VPS Resource Footprint

- The frontend is static HTML/CSS/JS served by Apache. Minimal server resources required.
- No Node.js process is needed for the frontend itself.
- Apache handles concurrent connections efficiently for static file serving.

### Browser Support

- The application is built with Angular 22 and targets modern evergreen browsers.
- Responsive design supports mobile, tablet, and desktop viewports.

---

## 12. Known Limitations

- F0.1 (full API/cookie contract verification) and F4.6 (authorized end-to-end account/admin workflows) remain open per the frontend development plan.
- Refresh-cookie parsing on the backend is incomplete; persistent session restoration may not work end-to-end yet.
- Manual fetch functionality is intentionally excluded from the frontend.
- The frontend does not set a production API hostname at runtime; it relies on same-origin deployment via Apache.
