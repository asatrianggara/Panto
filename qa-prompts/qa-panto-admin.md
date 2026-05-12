# QA Automation Prompt — `panto-admin` (Web Admin Panel)

You are a **web QA automation engineer**. Your mission is to **build and run an automated test suite** for the Panto Admin dashboard. You have no memory of prior conversations — everything you need is below.

## Context
`panto-admin` is the operator dashboard for Panto — a React SPA that admins use to view users, wallets, and transactions from the Panto API. MVP scope; backend data is simulated.

Read [PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md), [panto-admin/README.md](../panto-admin/README.md), [panto-admin/ADMIN_API_CONTRACT.md](../panto-admin/ADMIN_API_CONTRACT.md), and [panto-admin/WBS.md](../panto-admin/WBS.md) first.

## Target
- **Path:** [panto-admin/](../panto-admin/) — React 18 + Vite 5 + React Router v7 + Zustand + React Hook Form + Zod + Tailwind
- **Dev server:** `cd panto-admin && npm run dev` (Vite default port, usually `5173` — confirm from terminal output)
- **Pages** under [panto-admin/src/pages/](../panto-admin/src/pages/): `LoginPage`, `DashboardPage`, `UsersListPage`, `UserDetailPage`, `WalletsPage`, `TransactionsListPage`, `TransactionDetailPage`, `NotFoundPage`
- **Current state:** no tests, no test runner configured. You are building from zero.

## Deliverable
Two complementary layers:

### Layer 1 — Unit / component tests (Vitest + React Testing Library)
- Add: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `msw` as devDependencies.
- Configure `vite.config.ts` test block + `src/test/setup.ts`.
- Coverage target ≥70% on [src/pages/](../panto-admin/src/pages/), [src/components/](../panto-admin/src/components/), [src/store/](../panto-admin/src/store/), [src/lib/](../panto-admin/src/lib/).
- Use **MSW** to mock the Panto API per `ADMIN_API_CONTRACT.md` — do **not** hit a real backend in unit tests.

### Layer 2 — End-to-end tests (Playwright)
- Add: `@playwright/test`, install browsers (`npx playwright install --with-deps chromium`).
- `playwright.config.ts` with `webServer` auto-starting `npm run dev` and pointing to `http://localhost:5173`.
- Smoke + critical flows against the **real** Panto API running locally (assume it's available at `http://localhost:3000`; skip with clear message if not).
- Put specs under `panto-admin/e2e/`.

### npm scripts
Add to `panto-admin/package.json`:
- `test` — unit (vitest run)
- `test:watch`, `test:ui`, `test:cov`
- `e2e`, `e2e:headed`, `e2e:ui`

Whole thing must pass on a clean clone after `npm install`.

## Test matrix

### Auth / routing
- Unauthenticated visit to any `/admin/**` route redirects to `/login`.
- Login with valid admin creds → lands on `/dashboard`, token persisted in Zustand/localStorage.
- Login errors surface inline (use MSW to mock 401).
- Logout clears store + redirects.
- Expired token → next API call triggers logout + redirect.
- 404 page renders for unknown routes.

### DashboardPage
- Loading skeleton, error state, empty state, populated state (mock each via MSW).
- KPI numbers match the mocked response exactly.

### UsersListPage
- Pagination (page/next/prev, boundary conditions).
- Search / filter debounce (fake timers).
- Row click navigates to `UserDetailPage/:id`.
- Sort headers toggle and fire the expected query.

### UserDetailPage
- Renders user + linked wallets + recent transactions.
- Handles 404 (unknown id) and 403 (unauthorized).
- Action buttons (if any — suspend, reset PIN) call the correct endpoint and show confirmation.

### WalletsPage
- Filter by provider.
- Totals row sums visible page vs all rows — assert which (document spec).

### TransactionsListPage / TransactionDetailPage
- Date range filter.
- CSV export triggers download (Playwright download assertion).
- Detail page shows splits that sum to transaction total.

### Forms (React Hook Form + Zod)
- Every form: submit empty → zod errors visible; submit invalid → field-level errors; submit valid → correct request body + success UI.

### Accessibility smoke
- One Playwright spec per page runs `@axe-core/playwright` — zero critical violations.

### Visual sanity (optional, nice-to-have)
- Playwright screenshot of each page; commit baseline; fail on diff.

## Rules of the road
- **Do not modify production code** to make tests pass. Blocked by a bug? `test.skip` with `// TODO(bug): file.tsx:line`.
- Mock API in unit tests via MSW — never import axios instances and stub them ad-hoc.
- E2E tests must be hermetic: seed data through the real API's register + link endpoints in a `beforeAll`, clean up in `afterAll`. Never depend on manual DB state.
- No flaky `waitFor(timeout)` — prefer role queries + `findBy*`.
- Use `data-testid` sparingly — prefer accessible roles/names.

## Report format (end of run)
1. `npm test` + `npm run e2e` output (pass/fail, coverage %).
2. Bug table: Severity | Area | Spec path:test | Expected vs actual | Source pointer (`file.tsx:line`)
3. `test.skip` log with reasons.
4. Assumptions made where the API contract was ambiguous.

## Out of scope
Backend fixes, mobile app, load/perf testing, cross-browser matrix beyond Chromium (note: add Firefox/WebKit as a follow-up ticket if time permits).
