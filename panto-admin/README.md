# Panto Admin

Web-based admin panel untuk internal staff Panto memanage users, wallets, transactions, merchants, promos, dan analytics.

Part of the Panto monorepo:
- [`panto-api`](../panto-api) — NestJS backend (shared with mobile/web)
- [`panto-web`](../panto-web) — user-facing web app
- [`panto-mobile`](../panto-mobile) — user-facing mobile app
- **`panto-admin`** — this app (admin dashboard)

---

## Tech stack

| | |
|---|---|
| Framework | React 18 + Vite 5 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn-style primitives |
| Routing | React Router 7 |
| State | Zustand |
| HTTP | Axios |
| Forms | React Hook Form + Zod |
| Icons | Lucide |

---

## Quick start

**Prerequisites:** Node ≥ 18, running `panto-api` on port 3000.

```bash
# From panto-admin/
npm install
npm run dev
```

The app runs on **http://localhost:5174**. Vite proxies `/api/*` → `http://localhost:3000`.

**Default login** (seeded on first boot of `panto-api`):
- Email: `admin@panto.id`
- Password: `panto123`
- Role: `super_admin`

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server on :5174 |
| `npm run build` | Typecheck + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## Project structure

```
panto-admin/
├── ADMIN_API_CONTRACT.md   # Shared API contract with panto-api
├── WBS.md                  # Work breakdown — progress tracker across phases
├── src/
│   ├── api/
│   │   ├── client.ts       # Axios instance — unwraps { success, data } envelope
│   │   ├── auth.ts         # Login / me
│   │   └── endpoints.ts    # All typed endpoint functions
│   ├── components/
│   │   ├── layout/         # AdminLayout, Sidebar, Topbar, Breadcrumbs
│   │   └── ui/             # Button, Input, Card, Table, Badge, Pagination, …
│   ├── lib/
│   │   ├── utils.ts        # cn() classname helper
│   │   ├── format.ts       # formatIDR / formatDate / formatRelative
│   │   ├── useAsync.ts     # Generic data-fetching hook
│   │   └── useDebounce.ts
│   ├── pages/              # Route components (Dashboard, Users, Wallets, Transactions…)
│   ├── routes/
│   │   └── ProtectedRoute.tsx  # Auth + role gate
│   ├── store/
│   │   └── authStore.ts    # Zustand — token + admin profile (localStorage)
│   ├── types/
│   │   └── index.ts        # Shared domain types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css           # Tailwind entry + CSS variables
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── tsconfig*.json
```

**Path alias:** `@/*` resolves to `src/*`.

---

## Authentication

Admin auth is **completely separate** from user auth on the backend:

- Separate table: `admin_users`
- Separate JWT secret (so admin tokens can't impersonate users)
- Token stored in `localStorage` under `panto_admin_token`
- Axios interceptor auto-attaches `Authorization: Bearer <token>`
- 401 responses auto-logout and redirect to `/login`

**Roles:** `super_admin` · `admin` · `support` · `read_only`

Role enforcement happens in two places:
1. **Backend:** `AdminJwtGuard` + `@RequireRole(...)` decorator
2. **Frontend:** `<ProtectedRoute allow={['super_admin']}>` wrapper

---

## API contract

See [ADMIN_API_CONTRACT.md](./ADMIN_API_CONTRACT.md) — the shared source of truth between this app and `panto-api`.

All endpoints are prefixed `/api/admin/*` and wrapped in the standard envelope:

```json
{ "success": true, "data": <payload>, "message": "…" }
```

The axios client ([src/api/client.ts](src/api/client.ts)) unwraps `data` automatically, so call sites receive the payload directly.

**List responses** always follow:
```ts
{ items: T[], page: number, limit: number, total: number }
```

---

## Features shipped

See [WBS.md](./WBS.md) for the full roadmap and progress tracker.

**Phase 0 — Foundation** ✅
- Admin auth (separate JWT), seeded super admin, protected routing

**Phase 1 — Users & Wallets** (read-only)
- Users list with search + tier/status filters + pagination
- User detail with 4 tabs: Profile / Wallets / Transactions / Activity
- Wallets overview: total liquidity, per-provider aggregates, filterable list

**Phase 2 — Transactions** (read-only)
- Transactions list with search + status + date range filters
- Transaction detail with splits breakdown

**Deferred** (pending audit-log infrastructure): suspend/activate, reset PIN, force-sync, retry, refund, CSV export, flagged queue.

---

## Conventions

### Data fetching

Use the `useAsync` hook for any async data:

```tsx
import { useAsync } from '@/lib/useAsync';
import { fetchUsers } from '@/api/endpoints';

const { data, error, loading, refetch } = useAsync(
  () => fetchUsers({ page, q }),
  [page, q]
);
```

No React Query / SWR — keeping it minimal for MVP.

### Formatting

Always use the helpers from [src/lib/format.ts](src/lib/format.ts):
- `formatIDR(amount)` — Indonesian Rupiah
- `formatNumber(n)` — locale-aware thousand separators
- `formatDate(iso)` — medium date + short time
- `formatRelative(iso)` — "3h ago", "2d ago", etc.

### Styling

Use Tailwind utility classes. For variant-heavy components, use `cva` (see [src/components/ui/button.tsx](src/components/ui/button.tsx)). Use `cn()` from `@/lib/utils` to merge conditional classes.

Design tokens live as CSS variables in [src/index.css](src/index.css) — flip `.dark` on `<html>` for dark mode (not exposed yet).

---

## Deployment (future)

Planned:
- Target: `admin.panto.id` (internal subdomain)
- Access control: VPN or IP whitelist
- Pre-prod hardening: 2FA, session timeout, CSRF, httpOnly cookie auth

---

## Contributing

1. Check [WBS.md](./WBS.md) for the next task in the current phase
2. Keep changes scoped to the WBS item — update its status when done
3. Backend changes: coordinate via [ADMIN_API_CONTRACT.md](./ADMIN_API_CONTRACT.md) — update the contract first, then implement
4. Typecheck + build must pass before merge:
   ```bash
   npm run build
   ```
