# Panto Admin Panel — Task Roadmap

> Web-based admin dashboard untuk internal staff Panto memanage users, wallets, transactions, merchants, promos, dan analytics.

**Target stack:** React + Vite + TypeScript (separate app di monorepo: `panto-admin/`)
**Backend:** Reuse NestJS backend (`panto-api`) dengan module baru `admin/*` + RBAC middleware
**Effort legend:** `S` = 0.5–1 day · `M` = 1–3 days · `L` = 3–5 days · `XL` = 1–2 weeks

---

## Phase 0 — Foundation (Sprint 1)

Setup fondasi. Wajib sebelum fitur apapun dibangun.

| # | Task | Effort | Depends on |
|---|---|---|---|
| 0.1 | Scaffold `panto-admin` React Vite project di monorepo | S | — |
| 0.2 | Setup design system — pilih antara shadcn/ui, Ant Design, atau build custom | S | 0.1 |
| 0.3 | Add `AdminUser` entity (separate table, bukan merge dengan `users` biar clean) — fields: `email, passwordHash, role, isActive` | S | — |
| 0.4 | Seed 1 super admin account (`admin@panto.id` / env-based password) | S | 0.3 |
| 0.5 | Buat module `src/modules/admin/` di backend dengan sub-module `auth`, `rbac` | M | 0.3 |
| 0.6 | Admin login endpoint `POST /api/admin/auth/login` dengan JWT payload `{adminId, role}` | S | 0.5 |
| 0.7 | `AdminJwtGuard` + `@RequireRole('super_admin'\|'admin'\|'support'\|'read_only')` decorator | M | 0.6 |
| 0.8 | Build admin layout shell — sidebar nav, top bar dengan profile dropdown, breadcrumbs | M | 0.2 |
| 0.9 | Login page untuk admin (email + password) | S | 0.6, 0.8 |
| 0.10 | Protected route wrapper dengan role check | S | 0.7, 0.9 |

**Deliverable:** Admin bisa login, lihat empty dashboard shell, logout.

---

## Phase 1 — User & Wallet Management (Sprint 2)

| # | Task | Effort | Depends on |
|---|---|---|---|
| 1.1 | `GET /api/admin/users` — list dengan filter (phone, name, tier, status), pagination, sort | M | 0.7 |
| 1.2 | `GET /api/admin/users/:id` — detail dengan counts (wallets, transactions, points) | S | 1.1 |
| 1.3 | `PATCH /api/admin/users/:id` — update (suspend/activate, change tier, reset PIN) | M | 1.1 |
| 1.4 | `GET /api/admin/users/:id/activity` — recent login + transaction history timeline | M | 1.1 |
| 1.5 | **Frontend:** Users list page — table dengan search bar, filter chips, pagination | L | 1.1, 0.8 |
| 1.6 | **Frontend:** User detail page dengan tabs: Profile / Wallets / Transactions / Points / Activity Log | L | 1.2, 1.4 |
| 1.7 | Suspend / Activate user action dengan confirmation modal + reason textarea | S | 1.3, 1.6 |
| 1.8 | Reset PIN action (generate random + display once, email to user in production) | S | 1.3, 1.6 |
| 1.9 | `GET /api/admin/wallets` — global wallet overview across all users | M | 0.7 |
| 1.10 | `POST /api/admin/wallets/:id/force-sync` — admin-triggered balance refresh | S | 1.9 |
| 1.11 | **Frontend:** Wallets overview page — table dengan group by provider, total liquidity | M | 1.9 |
| 1.12 | Wallet balance audit log (record every admin-triggered balance change) | M | 1.9 |

**Deliverable:** Admin bisa cari user, lihat detail lengkap, manage wallet mereka.

---

## Phase 2 — Transaction Management (Sprint 3)

| # | Task | Effort | Depends on |
|---|---|---|---|
| 2.1 | `GET /api/admin/transactions` — list dengan filter (status, date range, amount range, user, merchant, wallet) | M | 0.7 |
| 2.2 | `GET /api/admin/transactions/:id` — detail lengkap + splits + user info | S | 2.1 |
| 2.3 | `POST /api/admin/transactions/:id/retry` — retry failed transaction | M | 2.1 |
| 2.4 | `POST /api/admin/transactions/:id/refund` — manual refund dengan audit log | L | 2.1 |
| 2.5 | Suspicious activity flags — simple rule engine (amount > threshold, frequency, new user) | L | 2.1 |
| 2.6 | **Frontend:** Transactions list page dengan real-time filter + pagination + export CSV button | L | 2.1, 0.8 |
| 2.7 | **Frontend:** Transaction detail modal/page dengan action buttons (Retry, Refund, Flag) | M | 2.2, 2.3, 2.4 |
| 2.8 | **Frontend:** Flagged transactions queue (separate view untuk high-priority review) | M | 2.5 |

**Deliverable:** Admin bisa investigate transaksi, resolve failed/disputed ones, flag suspicious.

---

## Phase 3 — Merchant & Content Management (Sprint 4)

| # | Task | Effort | Depends on |
|---|---|---|---|
| 3.1 | `POST /api/admin/merchants` — create dengan validation | S | 0.7 |
| 3.2 | `PATCH /api/admin/merchants/:id` — update | S | 3.1 |
| 3.3 | `DELETE /api/admin/merchants/:id` — soft delete | S | 3.1 |
| 3.4 | Merchant categories table + CRUD endpoints | M | 0.7 |
| 3.5 | **Frontend:** Merchants list + create/edit form (name, category, logo emoji, default bill) | L | 3.1, 3.2, 3.3 |
| 3.6 | Create `WalletPromo` entity (backend belum ada) — cashback config per provider + category + value + validity period | M | 0.7 |
| 3.7 | Wallet promo CRUD endpoints | M | 3.6 |
| 3.8 | **Frontend:** Wallet promos management — matrix view provider × category | L | 3.6, 3.7 |
| 3.9 | `PromoBanner` entity + CRUD (home screen promo banners) | M | 0.7 |
| 3.10 | **Frontend:** Promo banners management dengan image upload + preview + schedule | L | 3.9 |

**Deliverable:** Marketing team bisa manage merchants, promos, dan banners tanpa code change.

---

## Phase 4 — PantoPoints & Subscriptions (Sprint 5)

| # | Task | Effort | Depends on |
|---|---|---|---|
| 4.1 | `GET /api/admin/points/users/:userId` — points log per user | S | 0.7 |
| 4.2 | `POST /api/admin/points/credit` — manual credit/debit poin dengan reason + audit log | M | 4.1 |
| 4.3 | `POST /api/admin/points/campaign` — bulk credit (e.g., "semua user yang register bulan ini dapet 500 poin") | L | 4.2 |
| 4.4 | **Frontend:** Points management page — user search + adjustment form | M | 4.2 |
| 4.5 | **Frontend:** Campaign creation wizard (segment → amount → confirm) | L | 4.3 |
| 4.6 | `Subscription` entity (tier, price, started_at, expires_at, status) — belum ada di schema | M | 0.7 |
| 4.7 | Subscription CRUD + metrics (MRR, churn) | L | 4.6 |
| 4.8 | **Frontend:** Subscriptions overview dengan MRR chart | L | 4.7 |

**Deliverable:** Product team bisa jalanin points campaign dan monitor subscription revenue.

---

## Phase 5 — Analytics Dashboard (Sprint 6)

| # | Task | Effort | Depends on |
|---|---|---|---|
| 5.1 | `GET /api/admin/analytics/overview` — DAU, WAU, MAU, new users, total txs, total volume | M | 0.7 |
| 5.2 | `GET /api/admin/analytics/smartpay` — avg split count, acceptance rate, total savings | M | 0.7 |
| 5.3 | `GET /api/admin/analytics/wallets` — distribution per provider, active vs dormant | M | 0.7 |
| 5.4 | `GET /api/admin/analytics/funnel` — registration → first tx → retention D7/D30 | L | 0.7 |
| 5.5 | `GET /api/admin/analytics/revenue` — subscription revenue, fee revenue breakdown | M | 4.7 |
| 5.6 | **Frontend:** Main dashboard dengan KPI cards + time-series charts (pilih charting lib: Recharts/Chart.js) | L | 5.1, 5.2 |
| 5.7 | **Frontend:** SmartPay analytics page dengan heatmap + histograms | L | 5.2, 5.6 |
| 5.8 | **Frontend:** Retention cohort analysis table | L | 5.4 |
| 5.9 | Custom date range filter di semua analytics page | M | 5.6 |
| 5.10 | Export dashboard ke PDF untuk laporan bulanan | M | 5.6 |

**Deliverable:** Tim bisnis punya visibility real-time ke KPI tanpa nanya engineer.

---

## Phase 6 — Operations & Compliance (Sprint 7)

| # | Task | Effort | Depends on |
|---|---|---|---|
| 6.1 | Audit log system — record semua admin action (who/what/when/before/after) | L | 0.7 |
| 6.2 | **Frontend:** Audit log viewer dengan filter by admin, action type, date | M | 6.1 |
| 6.3 | System health endpoint `GET /api/admin/health` — DB status, cache, queue | M | — |
| 6.4 | **Frontend:** System status page dengan green/yellow/red indicator + latency graphs | M | 6.3 |
| 6.5 | Notification broadcaster — send in-app/push notification ke segment user | L | — |
| 6.6 | **Frontend:** Broadcast composer + preview + schedule + history | L | 6.5 |
| 6.7 | Feature flags system (per environment or per user cohort) | L | — |
| 6.8 | **Frontend:** Feature flags toggle page | M | 6.7 |
| 6.9 | Global settings editor (fee tables, transaction limits, tier config) | M | — |
| 6.10 | **Frontend:** Settings editor dengan form validation + changelog | M | 6.9 |
| 6.11 | PII masking di list views (phone, email partially hidden untuk read-only admins) | M | 0.7 |

**Deliverable:** Operations & compliance team punya tools untuk audit, monitor, dan kontrol runtime.

---

## Phase 7 — Advanced (Optional / Future)

| # | Task | Effort |
|---|---|---|
| 7.1 | A/B testing framework (assign variants, track conversion) | XL |
| 7.2 | Granular RBAC dengan custom permissions per resource | L |
| 7.3 | Regulatory report export (sesuai format BI untuk PJP license) | XL |
| 7.4 | Data retention policy enforcement (auto-delete old logs) | M |
| 7.5 | Fraud detection ML model integration | XL |
| 7.6 | Admin API untuk integrasi dengan tools external (Slack, PagerDuty, Zapier) | L |
| 7.7 | Dark mode untuk admin panel | S |
| 7.8 | Multi-language (ID/EN) | M |

---

## Suggested Timeline

```
Week 1-2   Phase 0 — Foundation (Sprint 1)
Week 3-4   Phase 1 — User & Wallet Management (Sprint 2)
Week 5-6   Phase 2 — Transaction Management (Sprint 3)
Week 7-8   Phase 3 — Merchant & Content (Sprint 4)
Week 9-10  Phase 4 — Points & Subscriptions (Sprint 5)
Week 11-12 Phase 5 — Analytics (Sprint 6)
Week 13-14 Phase 6 — Operations (Sprint 7)
────────────────────────────────────────────────
           Phase 7 — backlog / post-MVP
```

**Total ~14 weeks** untuk admin panel lengkap (asumsi 1 full-stack developer).

Kalau rush MVP, minimum viable admin panel = **Phase 0 + 1 + 2** (6 weeks) — cukup untuk operations tim manage user, wallet, dan transaksi.

---

## Cross-cutting Concerns

Tasks yang harus diperhatikan di setiap phase (tidak explicit di timeline):

- **Error handling & toast notifications** — user-friendly error messages
- **Loading states** — skeleton loaders untuk tabel dan form
- **Accessibility** — keyboard navigation, ARIA labels
- **Responsive design** — admin panel idealnya desktop-first tapi tablet-friendly
- **E2E tests** — minimal happy path untuk critical flows (login, suspend user, refund tx)
- **Rate limiting** — protect admin endpoints dari abuse
- **2FA untuk admin login** (recommended sebelum production)
- **IP whitelisting** option untuk super_admin role
- **Session timeout** — auto-logout setelah inactivity
- **CSRF protection** untuk mutation endpoints

---

## Technical Decisions to Make Upfront

Sebelum mulai Phase 0, decide dulu:

1. **Separate repo atau monorepo?** — Recommended: monorepo (sudah ada panto-api & panto-web, tambah panto-admin)
2. **Shared types?** — Buat package `@panto/types` di monorepo yang di-import oleh ketiga app
3. **Design system:** shadcn/ui (Tailwind-based, copy-paste) vs Ant Design (full-featured) vs custom
4. **Charts library:** Recharts (React-native, simple) vs Chart.js (more feature-rich)
5. **Form library:** React Hook Form + Zod recommended untuk admin forms yang kompleks
6. **Table library:** TanStack Table (headless, flexible) untuk list pages
7. **Admin session storage:** localStorage vs httpOnly cookie (cookie lebih secure untuk admin)
8. **Deploy target:** internal subdomain `admin.panto.id` dengan VPN atau IP whitelist

---

## Pre-requisite: Backend Modules yang Belum Ada

Admin panel akan butuh endpoint yang belum ada di MVP current. Prioritas tambahan backend:

- [ ] `WalletPromo` entity + CRUD (referenced di SmartPay tapi belum di-implement)
- [ ] `PromoBanner` entity + CRUD
- [ ] `Subscription` entity (Panto+ billing)
- [ ] Audit log infrastructure
- [ ] Feature flags infrastructure
- [ ] Admin user table terpisah + RBAC

Estimasi backend preparation: **~1 week sebelum Phase 0** atau dikerjain paralel di Sprint 1.
