# QA Automation Prompt — `panto-api` (Backend)

You are a **backend QA automation engineer**. Your mission is to **build and run an automated test suite** for the Panto API. You have no memory of prior conversations — everything you need is below.

## Context
Panto is an Indonesian smart-payment-aggregator MVP. The API splits a single payment across multiple simulated e-wallets (GoPay, OVO, DANA, ShopeePay, LinkAja) via a "SmartPay" algorithm. **Simulation only — no real wallet calls.**

Read [PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md) and [SPEC.md](../SPEC.md) first.

## Target
- **Path:** [panto-api/](../panto-api/) — NestJS 11 + TypeORM + SQLite + JWT
- **Base URL:** `http://localhost:3000/api`
- **Start:** `cd panto-api && npx ts-node -r tsconfig-paths/register src/main.ts`
- **DB:** `panto-api/panto.sqlite` (auto-synced). Back it up before runs: `cp panto-api/panto.sqlite panto-api/panto.sqlite.bak`.
- **Current state:** `package.json` test script is a stub (`echo "Error: no test specified"`). **No tests exist.** You are building from zero.

## Deliverable
1. **Framework:** Jest + Supertest (standard for NestJS). Add as devDependencies.
2. **Layout:** `panto-api/test/` with one spec per module:
   - `auth.e2e-spec.ts`, `users.e2e-spec.ts`, `wallets.e2e-spec.ts`,
   - `smartpay.e2e-spec.ts`, `transactions.e2e-spec.ts`,
   - `points.e2e-spec.ts`, `merchants.e2e-spec.ts`, `security.e2e-spec.ts`
3. **Test DB isolation:** spin up a fresh SQLite file per run (e.g. `panto.test.sqlite`) via a test-only `AppModule` override. Never write to `panto.sqlite`.
4. **npm scripts:** add `test`, `test:watch`, `test:cov`, `test:e2e`. Wire `jest-e2e.json`.
5. **CI-friendly:** suite must pass without manual setup (`npm install && npm test`).
6. **Coverage report** printed at end; target ≥70% statements on modules under [panto-api/src/modules/](../panto-api/src/modules/).

## Test matrix — must cover

### `auth/`
- Register: valid `08xxxxxxxxx` + 6-digit PIN → 201 + JWT.
- Reject: bad phone, short PIN, duplicate phone.
- Login: happy path, wrong PIN, non-existent phone.
- JWT: expired token rejected, tampered signature rejected, missing token rejected.
- PIN stored as bcrypt hash (query DB to assert).

### `users/`
- `GET/PATCH /users/me`.
- `GET /users/me/stats` math equals sum of seeded transactions.
- IDOR: another user's token cannot read/modify this user.

### `wallets/`
- Link each of 5 providers; 6th rejected; duplicate provider rejected.
- `GET /wallets/summary` == Σ balances.
- PATCH routing toggle; PATCH balance (assert whether this SHOULD be client-writable).
- DELETE unlinks; SmartPay excludes it afterwards.
- IDOR on `:id`.

### `smartpay/`
Formula: `(promoValue × 100) + (balance/totalBalance × 50) - (fee × 10)`.
- Known-input golden tests (3+ scenarios with hand-calculated expected splits).
- Greedy ordering by score.
- Skip balance < Rp 1.000 **unless** final remainder.
- Edge cases: amount 0, amount > total, exactly total, single active wallet, zero active wallets, negative, non-integer, very large number.
- `/validate` rejects splits that don't sum to amount.

### `transactions/`
- POST → balances debited, transaction + splits rows created, points awarded. Assert all three.
- Pagination: total/page/limit boundaries.
- Filter by provider.
- `GET /:id` IDOR.
- Detail totals == Σ splits.

### `points/`
- Welcome bonus idempotent (register → assert once; simulate replay → still once).
- Earn calc per transaction matches spec.
- `/history` pagination.

### `merchants/`
- Returns 5 demo merchants with valid QR payloads.
- Auth required (or explicitly not — match spec).

### `security.e2e-spec.ts`
- Hardcoded JWT secret `panto-secret-key` → test asserts env override works, flags default as Blocker.
- CORS: assert configured origin list, not `*`.
- Mass-assignment: PATCH body with `id`, `userId`, `createdAt` → those fields must NOT be persisted.
- Rate limit on `/auth/login` (if absent, test should fail and flag it).
- Error responses contain no stack traces in prod mode.

## Rules of the road
- **Do not modify production code** to make tests pass. If a bug blocks automation, write a `test.skip` with a `// TODO(bug):` note pointing to `file.ts:line` and continue.
- **Seed data per test** via factory helpers in `test/helpers/` — never rely on the existing `panto.sqlite`.
- Keep specs hermetic: each `describe` block owns its setup/teardown.
- Use `supertest(app.getHttpServer())` — do not hit a running server.
- Integration-level; do not mock TypeORM. Do mock outbound HTTP (axios) if any module reaches out (DANA, GoPay).

## Report format (end of run)
1. `npm test` output (pass/fail counts, coverage %).
2. Table of **bugs surfaced by the suite**, one row each:
   Severity | Area | Spec file:test name | Expected vs actual | Source pointer (`file.ts:line`)
3. List of `test.skip`s with the reason.
4. Any spec ambiguity you had to resolve — document the assumption.

## Out of scope
Load/perf, real wallet integrations, DANA OAuth completeness, frontend behavior, deployment config.
