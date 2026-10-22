# Frontend Development Plan

## Purpose and scope

Build the first web client for the online jobs aggregator as an Angular application. The client will let users browse, search, filter, sort, and inspect jobs; manage their own job interests; and, for administrators, manage users and the data-fetching configuration.

The frontend consumes the backend REST API. It does not connect to MySQL directly and does not own job ingestion or normalization. Categories, skills, cities, countries, and keywords are managed through the documented master-data API rather than by the fetch pipeline.

## Source documentation and decisions

This plan follows:

- `backend/PLAN.md`: Angular is the first-version frontend; the primary user experience is job browsing and filtering, with authentication and administrator workflows.
- `backend/README.txt`: API routes, authentication flow, job query parameters, master data, and source/area administration.
- `backend/DATA_MODEL.md`: normalized job, location, skill, category, user, source, and fetch-run data.
- `backend/two_fetch_approachs_design.md`: jobs are shared in storage and users' interests are applied at query/display time; the frontend should support category and keyword interests.
- `backend/WORK_REPORT_2026-10-20.md`: the backend supports passive and proactive fetching, with category/keyword interest data and endpoints.

Angular is the documented frontend choice. The existing docs do not settle a component library, CSS framework, or visual design system; choose those during initial scaffolding and keep the UI accessible and responsive.

## Product areas

### Job discovery (MVP)

- Job listing with loading, empty, error, and retry states.
- Job detail view with title, organization, location, remote status, salary, posted date, waiting time, description, skills, categories, and a link to the original posting when present.
- Filters for category, skill, city/country, source, remote availability, salary range, and organization.
- Sort controls for supported backend sort fields; show the selected order clearly.
- Pagination using the API's `limit`, `offset`, `total`, and `hasMore` response.
- Preserve filter and pagination state in the URL so searches can be bookmarked and browser navigation works.
- Responsive layout and keyboard-accessible forms and controls.

### Sign-in and user interests

- Sign-in form using `POST /api/auth/login`; expose validation and authentication errors clearly.
- Keep the short-lived access token in application memory where practical, and include it in the Authorization header for protected endpoints.
- Use the backend's httpOnly refresh cookie with credentialed requests to `POST /api/auth/refresh`; do not attempt to read or persist the refresh token in frontend code.
- Load the current identity with `GET /api/auth/me`, and provide logout through `POST /api/auth/logout`.
- Let a signed-in user view and change their followed categories through `GET/POST/DELETE /api/users/:id/categories`.
- For signed-in job searches, show jobs assigned to any category the user follows; when they follow no categories, show the full job catalogue. Anonymous searches remain unfiltered.
- Provide category and keyword browsing using the master endpoints. Treat the interest-selection experience as user-specific: the shared job catalogue must not imply that another user's interests are visible.

### Administration

Restrict administrator navigation and actions to users whose authenticated role is `admin`; the backend remains the authority and must enforce authorization on every protected operation.

- User management: list, create, change role, and deactivate users.
- Source management: list, create, edit, enable/disable, and delete sources; expose the documented `working_mode` choices (`passive`, `proactive`, `both`) when supported.
- Geographic area management: list, create, edit, enable/disable, and delete areas with the documented bounding-box and zoom definition.
- Source/area assignment: link and unlink sources and areas.
- Fetch operations: trigger a fetch and show recent fetch runs, status, counts, warnings, and errors where returned by the API.
- Master-data tools: inspect and seed categories, skills, cities, and countries; manage keywords and category-keyword links where supported.
- Confirm destructive actions and show the result or failure of each mutation.

## Frontend structure

Use Angular's established project conventions and keep responsibilities separated:

- `core/`: API client configuration, authentication/session state, guards, and shared error handling.
- `features/jobs/`: job search, filters, listing, and detail.
- `features/account/`: sign-in and category interests.
- `features/admin/`: user, source, area, fetch-run, and master-data screens.
- `shared/`: reusable form controls, pagination, loading/error/empty states, and display components.

Define TypeScript interfaces for API request/response shapes from the backend contract. Centralize HTTP calls in typed services rather than making requests directly from components. Keep filtering and pagination state in one feature-level state model and serialize supported state into route query parameters.

## Implementation phases

Work items are intentionally small enough to review and commit independently. Use the suggested commit scope as a guide; a single work item may take more than one commit, but avoid combining unrelated items. Check an item off only after its acceptance check passes.

### Phase 0 — Contract and scaffold

- [ ] **F0.1 — Verify the development API contract.** Check the API base path, available routes, representative response/error shapes, CORS origin policy, and credentialed-cookie behavior against the running backend. Record confirmed behavior and unresolved gaps in the contract checks below.  
  **Accept when:** the frontend's local API origin/proxy and cookie requirements are known.  
  **Commit scope:** `docs(frontend): record verified API integration contract`
- [x] **F0.2 — Create the Angular application.** Scaffold the app in `frontend/` with the selected Angular version and project defaults; do not add a component library in this task.  
  **Accept when:** the generated development server starts and the initial app builds.  
  **Commit scope:** `build(frontend): scaffold Angular application`
- [x] **F0.3 — Add environment and local API configuration.** Configure development and production API base URLs, and add a development proxy if needed. Keep credentials and deployment secrets out of source control.
  **Accept when:** a local app request reaches the intended backend without hard-coded environment-specific URLs in feature code.  
  **Commit scope:** `build(frontend): configure API environments`
- [x] **F0.4 — Establish routing and application shell.** Add the root layout, primary navigation placeholders, page outlet, not-found route, and baseline responsive styles.
  **Accept when:** routes render inside a consistent shell at narrow and wide viewport sizes.  
  **Commit scope:** `feat(frontend): add application shell and routes`
- [x] **F0.5 — Define shared API types.** Add typed request/response models only for verified backend shapes needed by the initial job and master-data screens. Keep uncertain fields optional and document them in code through the types rather than guessing.
  **Accept when:** the API model layer type-checks and has no direct database-model assumptions.  
  **Commit scope:** `feat(frontend): define initial API contracts`
- [x] **F0.6 — Add shared HTTP and error handling.** Centralize API configuration and provide a consistent typed representation for network, validation, authorization, and server errors.
  **Accept when:** a small service test verifies successful response handling and representative backend error responses.  
  **Commit scope:** `feat(frontend): add API client and error handling`
- [x] **F0.7 — Set up frontend quality checks.** Configure the project's lint, build, and test commands and add a minimal passing test.
  **Accept when:** all three commands run locally from the frontend project.  
  **Commit scope:** `test(frontend): add baseline quality checks`

**Phase exit criteria:** the app builds and runs locally, has a verified API configuration, and can make a credentialed backend request where the backend permits it.

### Phase 1 — Job discovery

- [x] **F1.1 — Add the jobs API service.** Implement typed list and detail requests, including query parameter serialization for currently supported pagination and sort fields.
  **Accept when:** service tests verify URL/query construction and list/detail response handling.  
  **Commit scope:** `feat(frontend): add jobs API service`
- [x] **F1.2 — Load filter reference data.** Add typed services and loading states for categories, skills, cities, countries, and sources only where their read endpoints are confirmed.
  **Accept when:** reference data loads independently and failures do not block the job list.  
  **Commit scope:** `feat(frontend): load job filter reference data`
- [x] **F1.3 — Build the job-search page layout.** Add the job-search route, page heading, results region, and responsive space for filters.
  **Accept when:** the page works with a mocked or empty result set and has no horizontal overflow on mobile.  
  **Commit scope:** `feat(frontend): add job search page`
- [x] **F1.4 — Render job result cards.** Show available title, organization, location, remote, salary, and posted-date information; gracefully omit missing fields.
  **Accept when:** representative complete and partial job records render without errors.  
  **Commit scope:** `feat(frontend): render job result cards`
- [x] **F1.5 — Add loading, empty, and failure states.** Provide visible loading feedback, a no-results state, and an actionable retry state for failed list requests.
  **Accept when:** component tests cover success, empty, loading, and API failure states.  
  **Commit scope:** `feat(frontend): handle job search states`
- [x] **F1.6 — Add confirmed filters.** Implement filter controls for fields verified to work end-to-end. Keep unverified filters hidden or clearly unavailable until backend support is confirmed.
  **Accept when:** changing a filter updates the request and returned results reflect the selected value in a backend smoke test.  
  **Commit scope:** `feat(frontend): add verified job filters`
- [x] **F1.7 — Synchronize search state with the URL.** Serialize applied filters, sort, and page/offset into route query parameters and restore them on navigation or reload.
  **Accept when:** a copied URL restores the same supported search state and browser back/forward works.  
  **Commit scope:** `feat(frontend): persist job search in URL`
- [x] **F1.8 — Add sorting controls.** Expose only backend-supported sort keys and directions and make the active order apparent.
  **Accept when:** selecting a sort option changes the request and the result order matches backend behavior.  
  **Commit scope:** `feat(frontend): add job result sorting`
- [x] **F1.9 — Add pagination.** Use the verified response metadata to page through results and reset pagination when search criteria change.
  **Accept when:** next/previous controls respect the first/last page and totals or `hasMore` values returned by the API.  
  **Commit scope:** `feat(frontend): paginate job results`
- [x] **F1.10 — Build job detail view.** Add a detail route and render verified description, categories, skills, location, salary, posted/waiting time, and source link fields.
  **Accept when:** direct navigation to a valid job works, missing jobs show not-found, and missing optional data is handled.  
  **Commit scope:** `feat(frontend): add job detail view`

**Phase exit criteria:** users can browse and inspect jobs; filters, sorting, and pagination exposed by the UI have been verified against backend behavior.

### Phase 2 — Authentication and interests

- [x] **F2.1 — Add authentication API methods.** Implement login, refresh, current-user, and logout calls using the verified auth response contracts.
  **Accept when:** service tests cover success and common 401/error responses; refresh requests use credentials.  
  **Commit scope:** `feat(frontend): add authentication API service`
- [x] **F2.2 — Add in-memory session state.** Store the access token and current user in application memory, expose signed-in state, and attach the access token to protected requests.
  **Accept when:** protected calls include the expected Authorization header and the refresh token is never read by frontend code.  
  **Commit scope:** `feat(frontend): manage authenticated session`
- [x] **F2.3 — Build the sign-in page.** Add email/password inputs, client-side validation, submission feedback, and clear invalid-credential/error messages.
  **Accept when:** valid credentials establish a session and invalid credentials leave the user unauthenticated with an accessible error.  
  **Commit scope:** `feat(frontend): add sign-in page`
- [x] **F2.4 — Restore and refresh sessions.** On app startup, use the refresh cookie to obtain a new access token and then load the current identity; handle expired/revoked sessions cleanly.
  **Accept when:** reload restores a valid session without storing the refresh token and invalid sessions return to signed-out state.  
  **Commit scope:** `feat(frontend): restore sessions with refresh cookie`
- [x] **F2.5 — Add sign-out behavior.** Call logout, clear in-memory identity/token state, and return the user to a public route even if the API reports a recoverable logout error.
  **Accept when:** no protected UI remains available after sign-out.  
  **Commit scope:** `feat(frontend): add sign-out flow`
- [x] **F2.6 — Protect authenticated routes.** Add an authentication guard and signed-in navigation state without treating client-side guards as a security boundary.
  **Accept when:** signed-out users are redirected to sign-in and can return to their intended route after authentication.  
  **Commit scope:** `feat(frontend): protect authenticated routes`
- [x] **F2.7 — Add user-interest API methods.** Implement list/add/remove category-interest operations for the current user's ID.
  **Accept when:** request and authorization behavior is covered by service tests and a backend smoke test.  
  **Commit scope:** `feat(frontend): add category interest API`
- [x] **F2.8 — Build category-interest settings.** Let the signed-in user view, add, and remove followed categories with loading, empty, and error states.
  **Accept when:** changes persist after reloading the settings page and only the current user's interests are shown.  
  **Commit scope:** `feat(frontend): manage category interests`
- [x] **F2.9 — Agree and implement interest-to-feed behavior.** Signed-in job requests include the access token; the API filters to jobs assigned to any followed category and leaves the catalogue unfiltered when the user follows none. Anonymous job requests remain unfiltered.
  **Accept when:** the selected behavior is documented, token forwarding and user messaging are covered by frontend tests, and backend query logic builds successfully.
  **Commit scope:** `feat(frontend): apply verified user interests`

**Phase exit criteria:** a user can sign in, maintain their own interests, refresh a session securely, and sign out; personalized job results are only claimed if the backend contract supports them.

### Phase 3 — Administrator workflows

- [x] **F3.1 — Add administrator route protection.** Add an admin-role guard and admin navigation that is shown only for an authenticated admin.
  **Accept when:** non-admin users cannot enter admin routes through the UI and backend authorization remains authoritative.  
  **Commit scope:** `feat(frontend): protect administrator routes`
- [x] **F3.2 — Add admin API services and contracts.** Implement typed calls for user, source, geographic-area, source-area, and fetch-run endpoints with shapes verified against the API handlers and repository queries.
  **Accept when:** service tests cover request paths, payloads, and permission/error responses.  
  **Commit scope:** `feat(frontend): add administrator API services`
- [x] **F3.3 — Build user list and creation.** Show users and provide a validated create-user form.
  **Accept when:** successful creation refreshes the list and duplicate/validation failures are shown clearly.  
  **Commit scope:** `feat(frontend): list and create users`
- [x] **F3.4 — Add user role changes and deactivation.** Support role updates and account deactivation with confirmation for the destructive action.
  **Accept when:** each mutation updates the visible state and API failures do not appear as success.  
  **Commit scope:** `feat(frontend): manage user roles and status`
- [x] **F3.5 — Build source list and source form.** List sources and add create/edit forms for name, type, configuration, enabled state, and supported working mode. The current API does not support changing a source’s type after creation, so the edit form keeps it immutable.
  **Accept when:** valid changes persist and unsupported/invalid values are reported.  
  **Commit scope:** `feat(frontend): manage job sources`
- [x] **F3.6 — Add source deletion.** Add a confirmation flow and handle backend constraints or failures.
  **Accept when:** the source is removed from the UI only after confirmed API success.  
  **Commit scope:** `feat(frontend): delete job sources`
- [x] **F3.7 — Build geographic-area management.** List and create/edit areas with validated bounding-box coordinates and zoom, using the documented `bbox: [min_lon, min_lat, max_lon, max_lat]` and integer `zoom` definition.
  **Accept when:** invalid coordinates/zoom are rejected before submission and valid areas display their saved definition.  
  **Commit scope:** `feat(frontend): manage geographic areas`
- [x] **F3.8 — Add geographic-area deletion.** Add deletion confirmation and update state only after API success.
  **Accept when:** cancellation makes no request and failed deletion preserves the area in the list.  
  **Commit scope:** `feat(frontend): delete geographic areas`
- [x] **F3.9 — Manage source-area assignments.** Display existing links and support linking/unlinking source-area pairs, prevent duplicate links in the form, and show API errors without optimistic list changes.
  **Accept when:** successful changes are reflected and duplicate/invalid assignment errors are visible.  
  **Commit scope:** `feat(frontend): manage source area assignments`
- [ ] **F3.10 — Trigger fetches.** Provide supported source/area selection and submit the trigger request with accepted/result feedback.  
  **Accept when:** the UI reports request acceptance distinctly from fetch completion.  
  **Commit scope:** `feat(frontend): trigger fetch runs`
- [x] **F3.11 — Display fetch-run history.** Show verified status, timing, counts, warnings, and errors. The current endpoint returns all runs and does not support a source filter.
  **Accept when:** an operator can distinguish running, successful, and failed runs from API data.  
  **Commit scope:** `feat(frontend): show fetch run history`
- [x] **F3.12 — Add master-data administration.** Provide the supported category, skill, city, country, keyword, and category-keyword tools, limiting actions to endpoints that exist.
  **Accept when:** create/seed actions validate inputs and confirm their results by refreshing catalogues; category-keyword links are confirmed by the API response because no list endpoint exists.
  **Commit scope:** `feat(frontend): manage supported master data`

**Phase exit criteria:** an administrator can complete each implemented user, source, area, assignment, fetch, and master-data workflow; authorization is still enforced by the backend.

### Phase 4 — Verification and release readiness

- [x] **F4.1 — Test API services.** Add focused tests for job, master-data, auth, interest, and admin API services, including query serialization and API errors.
  **Accept when:** tests cover the key request/response contracts and pass consistently.  
  **Commit scope:** `test(frontend): cover API services`
- [x] **F4.2 — Test search state and components.** Cover filter/URL synchronization, sorting, pagination, job cards, detail rendering, and loading/empty/error states.
  **Accept when:** tests demonstrate expected user-visible behavior for representative and incomplete data.  
  **Commit scope:** `test(frontend): cover job discovery flows`
- [x] **F4.3 — Test authentication and interests.** Cover login/logout, refresh, expired sessions, route guards, and category-interest changes.
  **Accept when:** tests verify the refresh token is not exposed and signed-out/unauthorized states behave correctly.  
  **Commit scope:** `test(frontend): cover account flows`
- [x] **F4.4 — Test administrator workflows.** Cover role restrictions, mutation confirmations, server validation errors, and API failures.
  **Accept when:** tests show non-admin access is blocked in the UI and failed mutations are never represented as successful.  
  **Commit scope:** `test(frontend): cover administrator flows`
- [ ] **F4.5 — Run quality checks and production build.** Run the established lint, test, and production-build commands; resolve issues introduced by frontend work.  
  **Accept when:** all required checks pass from a clean local run.  
  **Commit scope:** `chore(frontend): pass production quality checks`
- [ ] **F4.6 — Smoke-test against the backend.** Exercise public browsing, detail views, sign-in, interests, and admin tasks against representative backend data. Record any backend blockers in the contract checks.  
  **Accept when:** each implemented primary workflow has an observed end-to-end result or a clearly recorded backend dependency.  
  **Commit scope:** `test(frontend): verify backend integration`
- [ ] **F4.7 — Complete accessibility and responsive review.** Check keyboard navigation, labels, focus visibility, contrast, screen-reader announcements, and narrow/wide layouts; fix issues found.  
  **Accept when:** the primary flows can be completed by keyboard and remain usable at supported viewport sizes.  
  **Commit scope:** `fix(frontend): address accessibility and responsive issues`
- [ ] **F4.8 — Document setup and deployment.** Document prerequisites, local startup, backend URL/proxy configuration, test/build commands, and production artifact/deployment assumptions.  
  **Accept when:** a new developer can run the app and produce its production build using only the documented steps.  
  **Commit scope:** `docs(frontend): document setup and deployment`

**Phase exit criteria:** quality checks pass and the implemented primary flows have been smoke-tested, reviewed for accessibility/responsiveness, and documented.

## Backend contract checks and dependencies

Treat the README and API implementation as separate evidence and verify behavior before relying on a route. The inspected implementation currently has these important differences or limitations:

- **F0.1 progress:** source inspection confirms the API defaults to port `3000`; public jobs are mounted at `/api/jobs`, auth at `/api/auth`, protected users/admin/master routes at `/api/users`, `/api/admin`, `/api/master`, and public master reads at `/api/categories`, `/api/skills`, `/api/cities`, and `/api/countries`. Jobs list returns `{ jobs, total, limit, offset, hasMore }`; validation errors return `{ errors }`, and auth errors return `{ error }`. The local runtime check to `127.0.0.1:3000/api/jobs?limit=1` could not connect, so live response, CORS, and cookie behavior remain unverified; do not mark F0.1 complete until verified against a running backend.
- **Cross-origin auth blockers confirmed in source:** the API server does not configure CORS or credential support, and does not install cookie-parsing middleware, although refresh reads `req.cookies.refresh_token`. Cross-origin frontend auth therefore needs backend configuration before it can work; keep the frontend proxy same-origin during development where possible and verify refresh-cookie parsing with the backend owner before relying on it.
- The server mounts `/api/master` behind strict authentication, even though its read/schema operations may be described as master-data reads; use the required access token unless the backend contract changes.
- `GET /api/jobs` accepts the documented filters, but category, skill, city, and country filtering are placeholders; verify or complete these backend behaviors before presenting them as working filters.
- The job list route applies filtering and pagination in memory, and its sort allowlist does not include `days_waiting`; verify expected scale and sort behavior before finalizing the UI.
- `GET /api/jobs/:id` response fields and the list response should be captured as stable TypeScript contracts; the frontend should not infer a shape from the database model.
- The auth login/refresh flow uses an httpOnly refresh cookie. Confirm CORS allows credentials and that the frontend and API cookie settings work in the intended deployment topology.
- `/api/master` currently has category/keyword reads and creation/linking endpoints plus seed endpoints, but not a complete edit/delete workflow for these entities.
- Signed-in `GET /api/jobs` requests are filtered to jobs assigned to any followed category; no followed categories and anonymous requests return the unfiltered catalogue. Category/skill/location query-parameter filters remain incomplete.
- The backend README documents `POST /api/admin/trigger`, but the API router does not implement it. The orchestrator runs as a separate process, so frontend triggering remains blocked until a working backend trigger contract is provided.
- Admin source/area/fetch-run routes exist, but confirm response shapes and permissions for each read route. The current fetch-runs list route does not visibly apply the documented `source_id` filter.
- The backend work report identifies unfinished Rezi location/category enrichment and a PMTiles decoder verification item; these affect data quality more than frontend implementation, but should be tracked during end-to-end validation.

These checks are integration dependencies, not reasons to block scaffolding or independent UI work. Where backend behavior is incomplete, show only verified functionality and track the missing behavior for backend completion rather than simulating success in the client.

## Cross-cutting quality requirements

- Use semantic HTML, labeled controls, visible focus states, sufficient contrast, and keyboard-accessible dialogs and menus.
- Keep forms validated on the client for usability while treating backend validation and authorization as authoritative.
- Handle expired sessions, network failures, empty datasets, and partial/missing job fields explicitly.
- Avoid storing secrets or the httpOnly refresh token in frontend storage; do not log credentials or authorization headers.
- Keep the UI useful on mobile and desktop, and avoid blocking the job list while unrelated admin/master data loads.
- Do not add frontend-owned data persistence for shared master records; use the backend endpoints and reflect returned state.

## Suggested first milestone

Deliver Phase 0 plus the core of Phase 1 first: a working Angular shell, typed API integration, browsable job list, a detail view, and only those filters confirmed to work end-to-end. Follow with authentication/interests and then administrator tooling once their contracts and authorization behavior are verified.
