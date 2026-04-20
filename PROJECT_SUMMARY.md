# Panto — Project Summary

> **Smart Payment Aggregator MVP** — Pay one transaction using funds from multiple e-wallets simultaneously.

---

## Overview

Panto solves the "scattered funds" problem across Indonesian e-wallets (GoPay, OVO, DANA, ShopeePay, LinkAja). Instead of topping up one wallet before paying, Panto's **SmartPay algorithm** automatically splits a payment optimally across all linked wallets.

**Current Phase:** MVP Simulation — most wallet operations are simulated locally. **DANA** and **GoPay** sandbox OAuth/bind flows are partially wired (see `panto-api/src/modules/dana` and `panto-api/src/modules/gopay`). Real balance movement is still simulated.

The project is now a **monorepo of four apps** sharing a single backend:

| App | Role | Port |
|---|---|---|
| [`panto-api`](panto-api) | NestJS backend — shared by all clients | `3000` |
| [`panto-web`](panto-web) | User-facing web app | `5173` |
| [`panto-admin`](panto-admin) | Internal admin dashboard | `5174` |
| [`panto-mobile`](panto-mobile) | User-facing mobile app (Expo) | Metro |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11 + TypeScript |
| Database | SQLite + TypeORM (auto-sync) via `better-sqlite3` |
| Auth (users) | JWT (Passport) + bcrypt, OTP scaffold |
| Auth (admin) | **Separate** JWT secret + `admin_users` table + role guard |
| DANA SDK | `dana-node` (sandbox OAuth + payment stubs) |
| Web | React 18 + TypeScript + Vite 5, Zustand, Axios, html5-qrcode, qrcode |
| Admin | React 18 + Vite 5, Tailwind CSS, shadcn-style UI, React Hook Form + Zod, Zustand |
| Mobile | Expo SDK 54 + React Native 0.81, React Navigation v7, Zustand + AsyncStorage, expo-camera, react-native-qrcode-svg |
| Routing (web/admin) | React Router v7 |

---

## Backend Modules (`panto-api/src/modules`)

```
auth          — phone+PIN register/login, OTP verify/resend (scaffolded)
users         — profile, stats
wallets       — link/unlink, toggle routing, balance sync
smartpay      — calculate / validate optimal split
transactions  — create payment, paginated history, detail with splits
points        — PantoPoints balance + history
merchants     — demo merchant directory + QR payloads
dana          — sandbox OAuth bind/unbind + payment (create/query/cancel/refund/consult) + webhook
gopay         — sandbox OAuth bind/unbind + balance + webhook
seed          — auto-seed demo user, merchants, admin on boot
admin/        — isolated admin subsystem (auth / dashboard / users / wallets / transactions)
```

Admin endpoints live under `/api/admin/*` and use a **separate JWT secret** so admin tokens cannot impersonate end-users. Roles: `super_admin`, `admin`, `support`, `read_only`.

---

## Features

### 1. Authentication
- Register/login with phone number (08xxxxxxxxx) and 6-digit PIN
- OTP verify/resend endpoints scaffolded (SMS delivery stub)
- JWT-based session (24h expiry), auto-redirect on token expiry

### 2. Wallet Management
- Link up to 5 e-wallets: GoPay, OVO, DANA, ShopeePay, LinkAja
- GoPay and DANA have real sandbox bind flows (OAuth callback → `bind/complete`); others are simulated with random balances
- Toggle wallets in/out of SmartPay routing
- Sync balance (real for GoPay/DANA sandbox, simulated for others)
- Unlink wallet

### 3. SmartPay Algorithm
- Scoring formula per wallet: `(promoValue × 100) + (balance/totalBalance × 50) - (fee × 10)`
- Greedy allocation: highest-score wallet fills first
- Skips wallets with balance < Rp 1.000 (except final remainder)
- Shows total fees, savings, and split breakdown before confirming

### 4. QR Payment System
- **Scan tab:** Camera scan or gallery upload of merchant QR
- **Bayar tab:** Dynamic user QR (refreshes every 60 seconds)
- **Transfer tab:** Receive-money QR (refreshes every 15 seconds)
- 5 demo merchant QRs built-in

### 5. Transaction History
- Paginated list grouped by month
- Filter by wallet provider
- Custom SVG spending chart (web)
- CSV export

### 6. PantoPoints Loyalty
- Earn points on every transaction, welcome bonus on registration
- Points history log

### 7. Profile
- Edit name, email, avatar
- Stats: total transactions, total savings, PantoPoints balance

### 8. Admin Dashboard (`panto-admin`)
- Separate login (`admin@panto.id` / `panto123`, seeded)
- **Dashboard:** overview metrics
- **Users:** list + search/tier/status filters + pagination, detail with 4 tabs (Profile / Wallets / Transactions / Activity)
- **Wallets:** total liquidity, per-provider aggregates, filterable list
- **Transactions:** list + search/status/date filters, detail with splits
- Deferred (pending audit-log): suspend/activate, reset PIN, refund, CSV export, flagged queue

---

## Project Structure

```
Panto/
├── panto-api/              # NestJS backend  (port 3000)
│   └── src/modules/
│       ├── auth/           # phone+PIN + OTP scaffold
│       ├── users/
│       ├── wallets/
│       ├── smartpay/
│       ├── transactions/
│       ├── points/
│       ├── merchants/
│       ├── dana/           # sandbox OAuth + payment + webhook
│       ├── gopay/          # sandbox OAuth + balance + webhook
│       ├── seed/
│       └── admin/
│           ├── auth/       # admin JWT, guards, decorators
│           ├── common/
│           ├── dashboard/
│           ├── users/
│           ├── wallets/
│           └── transactions/
│
├── panto-web/              # User web app  (port 5173)
│   └── src/
│       ├── api/
│       ├── store/
│       ├── components/
│       ├── pages/
│       │   ├── Login/
│       │   ├── Home/
│       │   ├── Wallets/
│       │   ├── Pay/
│       │   ├── History/
│       │   ├── Profile/
│       │   ├── Scan/
│       │   ├── Dana/       # DanaCallbackPage
│       │   └── Gopay/      # GopayCallbackPage
│       └── utils/
│
├── panto-admin/            # Admin dashboard  (port 5174)
│   └── src/
│       ├── api/            # client + auth + endpoints
│       ├── components/
│       │   ├── layout/     # AdminLayout, Sidebar, Topbar, Breadcrumbs
│       │   └── ui/         # Button, Input, Card, Table, Badge, Pagination…
│       ├── lib/            # utils, format, useAsync, useDebounce
│       ├── pages/          # Dashboard, Login, Users(list/detail), Wallets, Transactions(list/detail), NotFound
│       ├── routes/         # ProtectedRoute (auth + role gate)
│       ├── store/          # authStore
│       └── types/
│
└── panto-mobile/           # Expo mobile app
    └── src/
        ├── api/            # axios + endpoints (mirrors panto-web)
        ├── components/     # WalletIcon, Loader, ComingSoonModal
        ├── navigation/     # Root stack + bottom tabs
        ├── screens/        # Login, Otp, Home, Wallets, Pay, History, Profile, Scan
        ├── store/          # Zustand + AsyncStorage
        ├── theme/
        ├── types/
        └── utils/          # QR payload parsing
```

---

## How to Run

### Prerequisites
- Node.js 18+
- npm 9+
- For mobile: Expo Go app, or iOS Simulator (Xcode), or Android Emulator

### 1. Install Dependencies

```bash
cd panto-api    && npm install
cd ../panto-web   && npm install
cd ../panto-admin && npm install
cd ../panto-mobile && npm install
```

### 2. Start Development Servers

**Backend (required by all clients):**
```bash
cd panto-api
npm run start:dev
# or: npx ts-node -r tsconfig-paths/register src/main.ts
```
API: `http://localhost:3000`

**User web app:**
```bash
cd panto-web && npm run dev        # → http://localhost:5173
```

**Admin dashboard:**
```bash
cd panto-admin && npm run dev      # → http://localhost:5174
```

**Mobile app:**
```bash
cd panto-mobile && npx expo start
# press i (iOS), a (Android), or scan QR with Expo Go
```

Both Vite apps proxy `/api/*` to `localhost:3000`. The mobile app resolves the API host dynamically via Expo's Metro IP, with an override in `app.json` → `expo.extra.apiBaseUrl`.

### 3. Access Web on Mobile Device (same Wi-Fi)

```bash
ipconfig getifaddr en0          # find laptop IP
# open http://<ip>:5173 on phone
```

### 4. Production Build

```bash
cd panto-api    && npm run build && npm run start:prod
cd panto-web    && npm run build && npm run preview
cd panto-admin  && npm run build && npm run preview
# panto-mobile: use EAS Build when ready
```

---

## Demo Credentials (Auto-seeded)

### User account
| Field | Value |
|---|---|
| Phone | `08123456789` |
| PIN | `123456` |
| Wallets | GoPay (Rp 150.000), OVO (Rp 120.000), DANA (Rp 80.000) |
| PantoPoints | ~1.089 |

### Admin account
| Field | Value |
|---|---|
| Email | `admin@panto.id` |
| Password | `panto123` |
| Role | `super_admin` |

### Demo Merchants for QR Testing

| Merchant | Default Bill |
|---|---|
| ☕ Kopi Kenangan | Rp 35.000 |
| 🏪 Indomaret | Rp 50.000 |
| 🍔 GrabFood | Rp 75.000 |
| 💊 Apotek Kimia Farma | Rp 120.000 |
| ⛽ SPBU Pertamina | Rp 100.000 |

---

## API Reference

**Base URL:** `http://localhost:3000/api`
**Auth:** `Authorization: Bearer <jwt_token>` (except `/auth/*` and admin login)

### User API

| Endpoint | Method | Description |
|---|---|---|
| `/auth/register` | POST | Register with phone + PIN |
| `/auth/login` | POST | Login, returns JWT |
| `/auth/otp/verify` | POST | Verify OTP code |
| `/auth/otp/resend` | POST | Resend OTP |
| `/users/me` | GET/PATCH | Current user / update profile |
| `/users/me/stats` | GET | Transaction & savings stats |
| `/wallets` | GET | List linked wallets |
| `/wallets/link` | POST | Link a new e-wallet |
| `/wallets/summary` | GET | Total balance + count |
| `/wallets/:id` | PATCH/DELETE | Update / unlink wallet |
| `/smartpay/calculate` | POST | Optimal split for amount |
| `/smartpay/validate` | POST | Validate a custom split |
| `/transactions` | GET/POST | History / create payment |
| `/transactions/:id` | GET | Detail + splits |
| `/points` | GET | Balance + totals |
| `/points/history` | GET | Paginated points log |
| `/merchants` | GET | Demo merchants + QR payloads |

### DANA sandbox (`/api/dana`)
`status`, `bind`, `callback`, `bind/complete`, `bind/simulate`, `balance`, `unbind`, `payment/{create,query,cancel,refund,consult}`, `webhook/notify`

### GoPay sandbox (`/api/gopay`)
`status`, `bind`, `callback`, `bind/complete`, `bind/simulate`, `balance`, `unbind`, `webhook/notify`

### Admin API (`/api/admin/*`)

| Endpoint | Method | Description |
|---|---|---|
| `/auth/login` | POST | Admin login |
| `/auth/me` | GET | Current admin |
| `/dashboard/overview` | GET | Overview metrics |
| `/users` | GET | Paginated users list |
| `/users/:id` | GET | User detail |
| `/users/:id/wallets` | GET | User's wallets |
| `/users/:id/transactions` | GET | User's transactions |
| `/users/:id/activity` | GET | Activity log |
| `/wallets` | GET | All wallets |
| `/wallets/summary` | GET | Aggregates |
| `/transactions` | GET | All transactions |
| `/transactions/:id` | GET | Transaction detail |

All admin responses use a `{ success, data, message }` envelope; list responses are `{ items, page, limit, total }`. See [panto-admin/ADMIN_API_CONTRACT.md](panto-admin/ADMIN_API_CONTRACT.md).

---

## Environment Variables

```env
# panto-api/.env  (see .env.example)
DANA_CLIENT_ID=
DANA_PRIVATE_KEY_PATH=./keys/dana-private.pem
DANA_CLIENT_SECRET=
DANA_ORIGIN=http://localhost:3000
DANA_MERCHANT_ID=
DANA_ENV=sandbox
DANA_PUBLIC_KEY=

GOPAY_CLIENT_ID=
GOPAY_CLIENT_SECRET=
GOPAY_ORIGIN=http://localhost:3000
GOPAY_ENV=sandbox
```

> `panto.sqlite` is auto-created in `panto-api/` on first run — no migration step.

---

## Known Limitations (MVP Scope)

- Most wallets still simulated; only DANA and GoPay have sandbox flows wired
- JWT secrets are hardcoded — rotate before any real deployment
- No automated tests configured
- OTP endpoints exist but SMS delivery is stubbed
- QR parsing handles Panto-format QR only (not full QRIS standard)
- Admin actions beyond read-only (suspend, refund, CSV export…) deferred pending audit-log infrastructure

---

## Roadmap

| Phase | Scope |
|---|---|
| **Current (MVP)** | Simulation + DANA/GoPay sandbox; admin read-only; mobile parity with web |
| **Phase 2** | Real OTP SMS, real QRIS parsing, push notifications, admin write actions + audit log |
| **Phase 3** | Production e-wallet integrations (requires partnerships) |
| **Phase 4** | PJP license from BI, full e-wallet coverage, bill payment |
| **Phase 5** | AI-powered SmartPay, open API, financial services |
