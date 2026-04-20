# Panto Admin — Work Breakdown Structure (WBS)

> Progress tracker untuk `panto-admin`. Update status tiap selesai task. Sumber scope: [ADMIN_PANEL_ROADMAP.md](../ADMIN_PANEL_ROADMAP.md).

**Legend**
- `✅ Done` — merged & verified
- `🔄 In Progress` — currently being worked on
- `⏳ Queued` — ready to start, not yet picked up
- `⛔ Blocked` — waiting on dependency (note which)
- `📦 Backlog` — not scheduled yet

**Effort:** `S` = 0.5–1d · `M` = 1–3d · `L` = 3–5d · `XL` = 1–2w

---

## Summary

| Phase | Title | Status | Done | Total | Progress |
|---|---|---|---|---|---|
| 0 | Foundation | ✅ Done | 10 | 10 | 100% |
| 1 | User & Wallet Management | 🔄 In Progress | 7 | 12 | 58% |
| 2 | Transaction Management | 🔄 In Progress | 3 | 8 | 38% |
| 3 | Merchant & Content | ⏳ Queued | 0 | 10 | 0% |
| 4 | Points & Subscriptions | ⏳ Queued | 0 | 8 | 0% |
| 5 | Analytics Dashboard | ⏳ Queued | 0 | 10 | 0% |
| 6 | Operations & Compliance | ⏳ Queued | 0 | 11 | 0% |
| 7 | Advanced (Future) | 📦 Backlog | 0 | 8 | 0% |
| **Total** | | | **20** | **77** | **26%** |

**Backend prerequisites:** 1 / 6 done (AdminUser table + RBAC)

---

## Phase 0 — Foundation ✅

Setup fondasi. Wajib sebelum fitur apapun dibangun.

| # | Task | Effort | Status | Notes |
|---|---|---|---|---|
| 0.1 | Scaffold `panto-admin` React Vite project | S | ✅ Done | Vite 5 + React 18 + TS, port 5174 |
| 0.2 | Design system setup | S | ✅ Done | Tailwind + shadcn-style primitives (Button, Input, Label, Card, Badge, Table, Skeleton) |
| 0.3 | `AdminUser` entity di backend | S | ✅ Done | `admin_users` table, seeded on boot |
| 0.4 | Seed super admin account | S | ✅ Done | `admin@panto.id` / `panto123` as super_admin |
| 0.5 | Backend module `admin/auth` + `admin/rbac` | M | ✅ Done | `src/modules/admin/auth/` with JWT strategy + role guard |
| 0.6 | `POST /api/admin/auth/login` endpoint | S | ✅ Done | + `GET /auth/me` |
| 0.7 | `AdminJwtGuard` + `@RequireRole` decorator | M | ✅ Done | Separate JWT secret from user auth |
| 0.8 | Admin layout shell (sidebar, topbar, breadcrumbs) | M | ✅ Done | Responsive (mobile drawer) |
| 0.9 | Login page (email + password) | S | ✅ Done | Zod validation, real backend |
| 0.10 | Protected route wrapper + role check | S | ✅ Done | `routes/ProtectedRoute.tsx` |

**Deliverable:** Admin bisa login real backend, JWT protected routes. ✅

---

## Phase 1 — User & Wallet Management 🔄

| # | Task | Effort | Status | Notes |
|---|---|---|---|---|
| 1.1 | `GET /api/admin/users` — list + filter + pagination | M | ✅ Done | Filters: q, tier, isActive. Includes walletCount aggregation |
| 1.2 | `GET /api/admin/users/:id` — detail | S | ✅ Done | Includes stats (wallets, balance, tx count, total spent) |
| 1.3 | `PATCH /api/admin/users/:id` — update (suspend, tier, reset PIN) | M | ⏳ Queued | Deferred — needs audit log |
| 1.4 | `GET /api/admin/users/:id/activity` — timeline | M | ✅ Done | Merges transactions + wallet-linked events |
| 1.5 | **FE:** Users list page (table, search, filter, pagination) | L | ✅ Done | Debounced search, tier/status filters |
| 1.6 | **FE:** User detail page (tabs: Profile/Wallets/Tx/Points/Activity) | L | ✅ Done | 4 tabs (Points tab deferred to Phase 4) |
| 1.7 | Suspend/activate action + confirmation modal | S | ⏳ Queued | Deferred — needs audit log |
| 1.8 | Reset PIN action (display once) | S | ⏳ Queued | Deferred — needs audit log |
| 1.9 | `GET /api/admin/wallets` — overview | M | ✅ Done | + `/wallets/summary` for per-provider aggregates |
| 1.10 | `POST /api/admin/wallets/:id/force-sync` | S | ⏳ Queued | Deferred — needs audit log |
| 1.11 | **FE:** Wallets overview page | M | ✅ Done | Summary cards + per-provider table + filterable list |
| 1.12 | Wallet balance audit log | M | ⏳ Queued | Blocks destructive actions |

**Deliverable:** ✅ Read-only side done. Destructive actions (1.3, 1.7, 1.8, 1.10) deferred pending audit log infra.

---

## Phase 2 — Transaction Management 🔄

| # | Task | Effort | Status | Notes |
|---|---|---|---|---|
| 2.1 | `GET /api/admin/transactions` — list + filter | M | ✅ Done | Filters: q, status, userId, dateFrom/To, amount range |
| 2.2 | `GET /api/admin/transactions/:id` — detail + splits | S | ✅ Done | Includes user info + splits breakdown |
| 2.3 | `POST /api/admin/transactions/:id/retry` | M | ⏳ Queued | Deferred — needs audit log |
| 2.4 | `POST /api/admin/transactions/:id/refund` | L | ⏳ Queued | Deferred — needs audit log |
| 2.5 | Suspicious activity flag rule engine | L | ⏳ Queued | |
| 2.6 | **FE:** Transactions list + filter + export CSV | L | 🔄 Partial | List + filter done. CSV export deferred |
| 2.7 | **FE:** Transaction detail + action buttons | M | 🔄 Partial | Detail page done. Action buttons deferred |
| 2.8 | **FE:** Flagged transactions queue | M | ⛔ Blocked | Depends on 2.5 |

**Deliverable:** Read-only transaction inspection ✅. Actions (retry/refund/flag) deferred.

---

## Phase 3 — Merchant & Content Management ⏳

| # | Task | Effort | Status | Notes |
|---|---|---|---|---|
| 3.1 | `POST /api/admin/merchants` | S | ⏳ Queued | Backend |
| 3.2 | `PATCH /api/admin/merchants/:id` | S | ⏳ Queued | Backend |
| 3.3 | `DELETE /api/admin/merchants/:id` — soft delete | S | ⏳ Queued | Backend |
| 3.4 | Merchant categories CRUD | M | ⏳ Queued | Backend |
| 3.5 | **FE:** Merchants list + create/edit form | L | ⏳ Queued | |
| 3.6 | `WalletPromo` entity + config | M | ⏳ Queued | Backend (new entity) |
| 3.7 | Wallet promo CRUD endpoints | M | ⏳ Queued | Backend |
| 3.8 | **FE:** Wallet promos matrix view | L | ⏳ Queued | |
| 3.9 | `PromoBanner` entity + CRUD | M | ⏳ Queued | Backend (new entity) |
| 3.10 | **FE:** Promo banners management + upload | L | ⏳ Queued | |

**Deliverable:** Marketing team bisa manage merchants, promos, dan banners tanpa code change.

---

## Phase 4 — PantoPoints & Subscriptions ⏳

| # | Task | Effort | Status | Notes |
|---|---|---|---|---|
| 4.1 | `GET /api/admin/points/users/:userId` | S | ⏳ Queued | Backend |
| 4.2 | `POST /api/admin/points/credit` — manual adjust | M | ⏳ Queued | Backend |
| 4.3 | `POST /api/admin/points/campaign` — bulk credit | L | ⏳ Queued | Backend |
| 4.4 | **FE:** Points management page | M | ⏳ Queued | |
| 4.5 | **FE:** Campaign creation wizard | L | ⏳ Queued | |
| 4.6 | `Subscription` entity | M | ⏳ Queued | Backend (new entity) |
| 4.7 | Subscription CRUD + metrics (MRR, churn) | L | ⏳ Queued | Backend |
| 4.8 | **FE:** Subscriptions overview + MRR chart | L | ⏳ Queued | |

**Deliverable:** Product team bisa jalanin points campaign dan monitor subscription revenue.

---

## Phase 5 — Analytics Dashboard ⏳

| # | Task | Effort | Status | Notes |
|---|---|---|---|---|
| 5.1 | `GET /api/admin/analytics/overview` — DAU/WAU/MAU | M | ⏳ Queued | Backend |
| 5.2 | `GET /api/admin/analytics/smartpay` | M | ⏳ Queued | Backend |
| 5.3 | `GET /api/admin/analytics/wallets` | M | ⏳ Queued | Backend |
| 5.4 | `GET /api/admin/analytics/funnel` — D7/D30 retention | L | ⏳ Queued | Backend |
| 5.5 | `GET /api/admin/analytics/revenue` | M | ⏳ Queued | Backend |
| 5.6 | **FE:** Main dashboard KPI + time-series | L | ⏳ Queued | Pilih lib: Recharts/Chart.js |
| 5.7 | **FE:** SmartPay analytics page | L | ⏳ Queued | |
| 5.8 | **FE:** Retention cohort table | L | ⏳ Queued | |
| 5.9 | Custom date range filter (global) | M | ⏳ Queued | |
| 5.10 | Export dashboard to PDF | M | ⏳ Queued | |

**Deliverable:** Tim bisnis punya visibility real-time ke KPI.

---

## Phase 6 — Operations & Compliance ⏳

| # | Task | Effort | Status | Notes |
|---|---|---|---|---|
| 6.1 | Audit log system (who/what/when/before/after) | L | ⏳ Queued | Backend |
| 6.2 | **FE:** Audit log viewer + filter | M | ⏳ Queued | |
| 6.3 | `GET /api/admin/health` — DB, cache, queue | M | ⏳ Queued | Backend |
| 6.4 | **FE:** System status page | M | ⏳ Queued | |
| 6.5 | Notification broadcaster | L | ⏳ Queued | Backend |
| 6.6 | **FE:** Broadcast composer + preview + schedule | L | ⏳ Queued | |
| 6.7 | Feature flags system | L | ⏳ Queued | Backend |
| 6.8 | **FE:** Feature flags toggle page | M | ⏳ Queued | |
| 6.9 | Global settings editor (fee, limits, tier) | M | ⏳ Queued | Backend |
| 6.10 | **FE:** Settings editor + validation + changelog | M | ⏳ Queued | |
| 6.11 | PII masking di list views (read-only roles) | M | ⏳ Queued | |

**Deliverable:** Ops & compliance punya tools untuk audit, monitor, dan kontrol runtime.

---

## Phase 7 — Advanced 📦

| # | Task | Effort | Status |
|---|---|---|---|
| 7.1 | A/B testing framework | XL | 📦 Backlog |
| 7.2 | Granular RBAC (custom permissions per resource) | L | 📦 Backlog |
| 7.3 | Regulatory report export (BI PJP format) | XL | 📦 Backlog |
| 7.4 | Data retention policy enforcement | M | 📦 Backlog |
| 7.5 | Fraud detection ML integration | XL | 📦 Backlog |
| 7.6 | Admin API for external tools (Slack, PagerDuty, Zapier) | L | 📦 Backlog |
| 7.7 | Dark mode | S | 📦 Backlog |
| 7.8 | Multi-language (ID/EN) | M | 📦 Backlog |

---

## Backend Pre-requisites

Admin panel butuh backend support yang belum ada di MVP current.

| # | Item | Status | Notes |
|---|---|---|---|
| B.1 | `AdminUser` table + separate auth | ✅ Done | Separate JWT secret, super admin seeded |
| B.2 | `WalletPromo` entity + CRUD | ⏳ Queued | Blocks Phase 3.6–3.8 |
| B.3 | `PromoBanner` entity + CRUD | ⏳ Queued | Blocks Phase 3.9–3.10 |
| B.4 | `Subscription` entity | ⏳ Queued | Blocks Phase 4.6–4.8 |
| B.5 | Audit log infrastructure | ⏳ Queued | Blocks Phase 6.1–6.2 |
| B.6 | Feature flags infrastructure | ⏳ Queued | Blocks Phase 6.7–6.8 |

---

## Cross-cutting Concerns

Tidak tied to a phase — apply ke semua FE work.

| Item | Status | Notes |
|---|---|---|
| Error handling & toast notifications | ⏳ Queued | Belum ada toast system |
| Loading states (skeleton) | ⏳ Queued | |
| Accessibility (keyboard nav, ARIA) | ⏳ Queued | Basic ada dari primitives |
| Responsive design (desktop-first, tablet OK) | 🔄 In Progress | Sidebar hidden on mobile sudah |
| E2E tests (happy path) | ⏳ Queued | |
| Rate limiting on admin endpoints | ⏳ Queued | Backend |
| 2FA admin login | ⏳ Queued | Pre-prod requirement |
| IP whitelist (super_admin) | 📦 Backlog | |
| Session timeout / auto-logout | ⏳ Queued | |
| CSRF protection on mutations | ⏳ Queued | Backend |

---

## Technical Decisions — Locked In

| Decision | Chosen |
|---|---|
| Repo layout | Monorepo (`panto-api` / `panto-web` / `panto-admin`) |
| Design system | Tailwind + shadcn-style primitives (copy-paste, no lock-in) |
| State management | Zustand |
| HTTP client | Axios with interceptors |
| Forms | React Hook Form + Zod |
| Routing | React Router 7 |
| Session storage | localStorage (MVP). Revisit → httpOnly cookie pre-prod |
| Dev port | 5174 (panto-web uses 5173) |

**Still to decide:**
- Charts library (Recharts vs Chart.js) — defer until Phase 5
- Table library (TanStack Table recommended) — decide before Phase 1.5
- Deploy target (`admin.panto.id` + VPN/IP whitelist) — defer until pre-prod

---

## Suggested Timeline

```
Week 1-2    Phase 0 — Foundation                      [🔄 70% done, backend pending]
Week 3-4    Phase 1 — User & Wallet Management        [⏳]
Week 5-6    Phase 2 — Transaction Management          [⏳]
Week 7-8    Phase 3 — Merchant & Content              [⏳]
Week 9-10   Phase 4 — Points & Subscriptions          [⏳]
Week 11-12  Phase 5 — Analytics                       [⏳]
Week 13-14  Phase 6 — Operations                      [⏳]
────────────────────────────────────────────────────────
            Phase 7 — backlog                         [📦]
```

**Rush MVP option:** Phase 0 + 1 + 2 (≈6 weeks) cukup untuk ops team manage user, wallet, tx.

---

## Change Log

| Date | Phase | Change |
|---|---|---|
| 2026-04-20 | 0 | Scaffolded project, shell, mock auth, protected routes (0.1, 0.2, 0.8, 0.9, 0.10) |
| 2026-04-20 | 0 | Finished Phase 0: AdminUser entity, seed, admin auth module, JWT strategy + guard, RBAC decorator, real login wired (0.3–0.7). API contract documented at `ADMIN_API_CONTRACT.md`. |
| 2026-04-20 | 1 | Completed read-only path: users list/detail/activity/wallets endpoints + FE pages. Destructive actions (1.3, 1.7, 1.8, 1.10) deferred pending audit log. |
| 2026-04-20 | 2 | Completed read-only path: transactions list/detail endpoints + FE pages. Actions (2.3, 2.4, 2.6 CSV, 2.7 buttons, 2.8) deferred. |
