# QA Automation Prompt — `panto-mobile` (Expo / React Native)

You are a **mobile QA automation engineer**. Your mission is to **build and run an automated test suite** for the Panto mobile app. You have no memory of prior conversations — everything you need is below.

## Context
`panto-mobile` is the end-user app for Panto — an Expo / React Native client that lets users link e-wallets, run the SmartPay split payment, scan QR, and view history. MVP is simulation-only (no real wallet APIs).

Read [PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md), [SPEC.md](../SPEC.md), and [panto-mobile/README.md](../panto-mobile/README.md) first.

## Target
- **Path:** [panto-mobile/](../panto-mobile/) — Expo ~54, React Native 0.81, React 19, React Navigation 7, Zustand, Axios, `expo-camera`, `react-native-qrcode-svg`
- **Screens** under [panto-mobile/src/screens/](../panto-mobile/src/screens/): `LoginScreen`, `HomeScreen`, `WalletsScreen`, `PayScreen`, `ScanScreen`, `HistoryScreen`, `ProfileScreen`
- **Start:** `cd panto-mobile && npx expo start` (backend expected at `http://localhost:3000` — confirm `api/` base URL in [src/api/](../panto-mobile/src/api/))
- **Current state:** no tests, no runner configured. You are building from zero.

## Deliverable — three layers

### Layer 1 — Unit / component tests (Jest + React Native Testing Library)
- Add devDeps: `jest`, `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`, `msw`, `react-test-renderer` matching React 19.
- `jest.config.js` using the `jest-expo` preset; `jest.setup.ts` with RNTL matchers + async-storage mock (`@react-native-async-storage/async-storage/jest/async-storage-mock`).
- Mock native modules: `expo-camera`, `react-native-qrcode-svg`, React Navigation, Zustand persistence.
- MSW (Node adapter) to mock the Panto API per the endpoints in [src/api/](../panto-mobile/src/api/).
- Coverage target ≥70% on [src/screens/](../panto-mobile/src/screens/), [src/components/](../panto-mobile/src/components/), [src/store/](../panto-mobile/src/store/), [src/utils/](../panto-mobile/src/utils/).

### Layer 2 — End-to-end tests (Maestro)
Maestro is the pragmatic choice for Expo; Detox adds significant iOS/Android build overhead.
- Add Maestro install instructions to the README (`curl -Ls "https://get.maestro.mobile.dev" | bash`).
- Flows under `panto-mobile/.maestro/` as `.yaml` files, one per critical user journey.
- Target the iOS simulator by default; document Android steps.
- E2E runs against the **real** Panto API at `http://localhost:3000` — skip cleanly with a clear message if the API isn't reachable.

### Layer 3 — Typecheck as a gate
- `npm run typecheck` → `tsc --noEmit`. Must pass.

### npm scripts
Add to `panto-mobile/package.json`:
- `test`, `test:watch`, `test:cov` — Jest
- `typecheck`
- `e2e:ios`, `e2e:android` — Maestro

Whole thing must pass after a clean `npm install` + Maestro CLI installed.

## Test matrix

### LoginScreen
- Phone input restricted to `08xxxxxxxxx`; PIN input masked, 6 digits.
- Submit valid → navigates to Home; token saved via AsyncStorage.
- Submit invalid → inline error, no navigation.
- Network failure → user-friendly error (no raw axios error string).

### HomeScreen
- Summary renders total balance from `/wallets/summary` mock.
- Empty state when no wallets linked.
- Pull-to-refresh fires the expected API calls.

### WalletsScreen
- Link each of 5 providers.
- 6th link attempt surfaces the limit error from the API.
- Toggle routing persists; DELETE unlinks and the row disappears.

### PayScreen (SmartPay)
- Enter amount → renders split preview matching `/smartpay/calculate` response.
- Amount > total balance → UI blocks confirm and shows insufficient-balance message.
- Confirm pay → success screen, wallets refresh, points awarded shown.
- Backend 409/500 → surfaces error, no partial state.

### ScanScreen
- Camera permission denied → fallback UI with "open settings" CTA.
- Camera permission granted → stub a scanned payload, assert navigation to Pay with the merchant + bill prefilled.
- Malformed QR → toast error, no navigation.

### HistoryScreen
- Pagination (infinite scroll boundary).
- Filter by provider.
- Tap row → detail view shows splits summing to total.

### ProfileScreen
- Edit name/email/avatar → PATCH `/users/me`; optimistic update rolled back on error.
- PantoPoints balance matches `/points` mock.
- Logout clears AsyncStorage + Zustand; navigates to Login.

### Cross-cutting
- Axios JWT interceptor attaches `Authorization` header when a token exists.
- 401 response triggers logout + redirect to Login.
- Deep link / cold start with stored token goes straight to Home.
- Dark/light theme switch (if present in [src/theme/](../panto-mobile/src/theme/)) — smoke render.

### Maestro flows (`.maestro/`)
At minimum, one yaml per flow:
1. `login.yaml` — launch → login with seed account → land on Home.
2. `link-wallet.yaml` — Home → Wallets → link OVO → assert appears.
3. `smartpay-pay.yaml` — Home → Pay → enter amount → confirm → assert success.
4. `scan-qr.yaml` — Scan → (mocked) QR → Pay preview → cancel.
5. `history.yaml` — open History → open most recent transaction → verify splits.
6. `logout.yaml` — Profile → logout → back on Login.

Seed account (from PROJECT_SUMMARY.md): phone `08123456789`, PIN `123456`.

## Rules of the road
- **Do not modify production code** to make tests pass. Bug in the way? `test.skip` + `// TODO(bug): file.tsx:line`.
- Mock native modules at the `jest.setup.ts` level, not per-test.
- Unit tests mock the API via MSW — don't stub axios directly.
- Maestro flows must be hermetic: register a fresh test user in a `beforeAll` step (or rely only on the seed account and its known starting state; document which).
- No `setTimeout` polling — use RNTL `findBy*` and Maestro's `waitForAnimationToEnd`.

## Report format (end of run)
1. `npm test` output (pass/fail counts, coverage %).
2. `maestro test .maestro/` summary.
3. Bug table: Severity | Platform (iOS/Android/both) | Screen | Spec/flow path | Expected vs actual | Source pointer (`file.tsx:line`)
4. `test.skip` / `maestro` flow skips with reasons.
5. Assumptions where spec or API contract was ambiguous.

## Out of scope
Backend fixes, admin panel, real wallet integration, App Store / Play Store release pipeline, perf profiling, cross-device matrix beyond one iOS simulator + one Android emulator.
