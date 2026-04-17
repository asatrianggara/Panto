# Panto — MVP Specification

> Smart Payment Aggregator yang memungkinkan user membayar **satu transaksi menggunakan dana dari multiple e-wallet sekaligus**.

**Status:** MVP Simulation Mode — semua wallet operation disimulasikan, tidak ada integrasi real dengan provider e-wallet.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Implemented Features](#implemented-features)
5. [Project Structure](#project-structure)
6. [Backend API](#backend-api)
7. [Database Schema](#database-schema)
8. [Frontend Routes & Pages](#frontend-routes--pages)
9. [SmartPay Algorithm](#smartpay-algorithm)
10. [How to Run](#how-to-run)
11. [Demo Credentials](#demo-credentials)
12. [Deviations from Original Plan](#deviations-from-original-plan)

---

## 1. Overview

Panto menyelesaikan masalah dana yang tersebar di multiple e-wallet (GoPay, OVO, DANA, ShopeePay, LinkAja). Alih-alih harus konsolidasi manual (yang memakan fee transfer), Panto menarik dana dari beberapa wallet sekaligus untuk satu pembayaran — Panto bertindak sebagai merchant dan menggunakan API dari berbagai macam e-wallet untuk integrasi e-wallet dan menerima pembayaran dan bertindak sebagai user saat membayar merchant menggunakan finpay.

### Value Proposition
> "Bayar apapun dengan semua e-wallet sekaligus. Gratis. Satu tap."

### Scope of MVP
- ✅ Full UI/UX mobile-first layout
- ✅ SmartPay algorithm (routing + scoring + savings calculation)
- ✅ Simulated wallet linking, balance, and user to merchant(Panto) transfer
- ✅ QR scan with live camera (html5-qrcode) + gallery upload
- ✅ Dynamic QR generation for pay & receive
- ✅ Transaction history with filters, chart, and CSV export
- ✅ PantoPoints earning system
- ❌ Real e-wallet API integration (Phase 2+)
- ❌ Real QRIS merchant payment
- ❌ Panto+ subscription with real payment

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | NestJS 10 + TypeScript |
| **Database** | SQLite via `better-sqlite3` + TypeORM |
| **Auth** | JWT (Passport) + bcrypt PIN hashing |
| **Frontend** | React 18 + TypeScript + Vite 5 |
| **Routing** | React Router v6 |
| **State** | Zustand (auth store, persist to localStorage) |
| **HTTP** | Axios with request/response interceptors |
| **Icons** | lucide-react |
| **QR Scan** | html5-qrcode (camera + file upload) |
| **QR Generate** | qrcode (PNG download + terminal output) |
| **Charts** | Custom SVG (no charting library) |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Browser / Phone)            │
│  ┌─────────────────────────────────────────────────┐    │
│  │  React SPA (Vite 5173)                          │    │
│  │  - Mobile-first 430px container                 │    │
│  │  - Bottom navigation (Home/Wallet/Pay/Hist/Prof)│    │
│  │  - Full-screen scan camera viewport             │    │
│  └──────────────────┬──────────────────────────────┘    │
└─────────────────────┼────────────────────────────────────┘
                      │ /api/* (Vite proxy)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   NestJS BACKEND (3000)                 │
│  ┌─────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐        │
│  │  Auth   │ │ Users  │ │ Wallets │ │ SmartPay │        │
│  └─────────┘ └────────┘ └─────────┘ └──────────┘        │
│  ┌──────────────┐ ┌──────┐ ┌───────────┐ ┌──────┐       │
│  │ Transactions │ │Points│ │ Merchants │ │ Seed │       │
│  └──────────────┘ └──────┘ └───────────┘ └──────┘       │
│                      │                                   │
│                      ▼                                   │
│             ┌──────────────────┐                         │
│             │  SQLite (./panto.sqlite)                   │
│             └──────────────────┘                         │
└──────────────────────────────────────────────────────────┘
```

### Design Pattern: Adapter for Wallet Provider

Wallet operation abstracted behind an interface so real providers can be swapped in later. Current MVP uses a `MockWalletProvider` that reads/writes balance directly in the local database.

---

## 4. Implemented Features

### Auth
- Login with phone (`08xxxxxxxxx`) + 6-digit PIN
- Register new account
- JWT token (24h expiry) stored in localStorage
- ProtectedRoute guard with stale-token detection via `/users/me` fetch on mount
- Auto-redirect to `/login` on 401 via axios interceptor

### Home Screen
- Blue gradient header with:
  - User's PantoPoints badge (top-right)
  - Total balance across all wallets
  - Active wallet count + wallet icons row
  - Total saved badge (when > 0)
- **Swipeable menu pager** (2 pages × 8 items):
  - Page 1: Scan QR, **Scan Demo 🔴NEW**, History, Merge, Transfer, PLN, PDAM, Pulsa
  - Page 2: E-money, Internet, TV Kabel, Voucher, BPJS
  - CSS scroll-snap + page indicator dots (tap to jump)
  - Active tiles vs locked tiles (with lock icon overlay + "Coming Soon" modal)
- Promo banner card
- Recent transactions list (last 5)

### Wallets Screen
- Total balance card (gradient)
- Wallet cards for each linked provider:
  - Provider icon, phone, balance
  - Status badge (Aktif / Tidak Aktif)
  - Routing toggle (include in SmartPay)
  - **Sync button** — randomizes balance Rp 900 – Rp 500.000 (demo feature)
  - Tap balance to manually edit (for testing)
- Link new wallet modal — select provider + enter phone → auto-assigns random balance

### Pay Screen (3-step flow)
1. **Enter Payment**:
   - Amount input (Rupiah formatted, with Clear button)
   - Merchant name field (editable even when pre-filled from QR scan)
   - Quick-pick merchant buttons
   - "Find Best Split" → calls SmartPay
2. **SmartPay Result**:
   - Recommended split with progress bars per wallet
   - Percentage, promo indicators
   - Customize mode (edit amounts per wallet)
   - Summary: Total / Fee GRATIS / Hemat
3. **Success**:
   - Animated checkmark
   - Receipt with split breakdown, savings, points earned
   - Return to home

### Scan QR Demo (full-screen)
Three tabs in one camera viewport:
- **Scan** (default): Live camera scanner (`html5-qrcode`)
  - Gallery upload icon for picking image from files
  - "Generate Demo QR" button — opens modal with 5 pre-seeded merchants; tap Download to save PNG
  - Fallback from `environment` to `user` facing camera (so it works on laptop webcam)
- **Bayar** (CPM — Customer Presented Mode): User's QR refreshes every **60 seconds**
- **Transfer** (Receive Mode): Input amount → dynamic receive QR refreshes every **15 seconds**, 1-transaction-only

QR Payload format (JSON):
```json
{
  "type": "panto-merchant" | "panto-user" | "panto-receive",
  "merchantId/userId": "uuid",
  "merchantName": "Kopi Kenangan",
  "totalBill": 35000,
  "issuedAt": "2026-04-13T..."
}
```

### History Screen
- **Stats row** (reused Profile pattern): PantoPoints / Total Transaksi / Total Hemat
- **Filter bar**:
  - Date chips: `Minggu Ini` | `Bulan Lalu` | `3 Bulan` | `Custom 🔒` (Panto VIP)
  - Type dropdown: Semua / QR Payment / Transfer / Merge / PLN / PDAM / Pulsa
  - Wallet dropdown: Semua / GoPay / OVO / DANA / ShopeePay / LinkAja
- **Chart** (custom SVG line chart):
  - Wallet tabs: Semua + each provider
  - X-axis: date, Y-axis: spending amount per day
  - Area gradient below polyline
- **Transaction list grouped by month**:
  - Month header ("Oktober 2025") with total summary
  - Each tx: day+month date badge, merchant, time, type, amount, savings
  - Tap to expand split breakdown
- **Download button** (top-right):
  - Per Bulan → CSV export (respects active filters)
  - Custom Range 🔒 — Panto VIP locked

### Profile Screen
- Avatar with initials (blue circle)
- Editable name (inline edit)
- Stats row: PantoPoints / Total Transaksi / Total Hemat
- Panto+ upgrade card (locked)
- Settings list: Notifikasi / Bahasa / Tema / Keamanan (all locked)
- Logout

---

## 5. Project Structure

```
Panto/
├── SPEC.md                          # This file
├── index.html                       # Legacy prototype (untouched)
├── pitch/                           # Legacy pitch deck (untouched)
│
├── panto-api/                       # NestJS Backend
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/
│   │   │   ├── decorators/current-user.decorator.ts
│   │   │   ├── guards/jwt-auth.guard.ts
│   │   │   └── interfaces/api-response.interface.ts
│   │   └── modules/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── wallets/
│   │       ├── smartpay/
│   │       │   ├── smartpay.service.ts
│   │       │   └── wallet-fees.constant.ts      # Per-wallet fee table
│   │       ├── transactions/
│   │       ├── points/
│   │       ├── merchants/                       # Pre-seeded demo merchants
│   │       └── seed/
│   ├── panto.sqlite                             # Database (gitignored)
│   ├── tsconfig.json
│   └── package.json
│
└── panto-web/                       # React Frontend
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                              # Route definitions
    │   ├── index.css                            # Global styles + design tokens
    │   ├── api/
    │   │   ├── client.ts                        # Axios instance + interceptors
    │   │   └── endpoints.ts                     # All API functions
    │   ├── store/
    │   │   └── authStore.ts                     # Zustand auth store
    │   ├── types/index.ts
    │   ├── utils/
    │   │   └── qr.ts                            # QR encode/decode/download
    │   ├── components/
    │   │   ├── Layout.tsx                       # Bottom nav shell
    │   │   ├── ProtectedRoute.tsx               # Auth guard
    │   │   ├── WalletIcon.tsx
    │   │   └── ComingSoonModal.tsx
    │   └── pages/
    │       ├── Login/LoginPage.tsx
    │       ├── Home/HomePage.tsx
    │       ├── Wallets/WalletsPage.tsx
    │       ├── Pay/PayPage.tsx                  # 3-step flow in one file
    │       ├── History/HistoryPage.tsx
    │       ├── Profile/ProfilePage.tsx
    │       └── Scan/
    │           ├── ScanQRPage.tsx               # Tab container
    │           ├── ScanMode.tsx                 # Camera + gallery
    │           ├── PayMode.tsx                  # User QR (60s refresh)
    │           ├── TransferMode.tsx             # Receive QR (15s refresh)
    │           └── MerchantGenerator.tsx        # 5 demo merchants modal
    ├── vite.config.ts                           # Includes /api proxy + host:true
    └── package.json
```

---

## 6. Backend API

**Base URL:** `http://localhost:3000/api`
**Auth:** JWT Bearer token in `Authorization` header (except `/auth/*`)
**Response envelope:** `{ success: boolean, data: any, message?: string }`

### Auth
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/auth/register` | `{ phone, name, pin }` | Create user, returns JWT |
| POST | `/auth/login` | `{ phone, pin }` | Returns JWT + user |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/me` | Current user profile |
| PATCH | `/users/me` | Update name/email/avatar |
| GET | `/users/me/stats` | Total transactions, total saved |

### Wallets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/wallets` | List user wallets |
| POST | `/wallets/link` | Link provider (assigns random balance 50k–500k) |
| PATCH | `/wallets/:id` | Update `balance` or `inRouting` |
| DELETE | `/wallets/:id` | Unlink |
| GET | `/wallets/summary` | Total balance + active count + providers list |

### SmartPay
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/smartpay/calculate` | `{ amount, merchantName, merchantCategory? }` | Returns optimal split |
| POST | `/smartpay/validate` | `{ amount, customSplits }` | Validate user-edited split |

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/transactions` | Create payment (2s simulated delay, deducts balances, awards points) |
| GET | `/transactions?page=1&limit=20` | Paginated history |
| GET | `/transactions/:id` | Transaction detail with splits |

### Points
| Method | Endpoint | Description |
|---|---|---|
| GET | `/points` | Balance + totalEarned + totalRedeemed |
| GET | `/points/history?page=1&limit=20` | Paginated points log |

### Merchants
| Method | Endpoint | Description |
|---|---|---|
| GET | `/merchants` | All 5 seeded merchants with embedded QR payload |
| GET | `/merchants/:id/qr` | QR payload for specific merchant |

---

## 7. Database Schema

SQLite with TypeORM synchronize mode (auto-migrate in dev).

### users
- `id` (uuid PK)
- `phoneNumber` (unique)
- `name`, `email?`, `avatarUrl?`
- `pinHash` (bcrypt)
- `tier` ('free' | 'plus')
- `isActive` (bool)
- `createdAt`, `updatedAt`

### wallets
- `id` (uuid PK)
- `userId` (FK → users)
- `provider` ('gopay' | 'ovo' | 'dana' | 'shopeepay' | 'linkaja')
- `providerPhone`
- `balance` (integer, Rupiah)
- `isActive`, `inRouting` (bool)
- `transferFee` (integer, default 0)
- `lastSynced`, `linkedAt`
- **Unique constraint:** `(userId, provider)`

### transactions
- `id` (uuid PK)
- `userId` (FK)
- `type` ('qr_payment')
- `merchantName`, `merchantCategory`
- `totalAmount`, `totalFee`, `totalSaving`, `pointsEarned`
- `status` ('pending' | 'processing' | 'success' | 'failed')
- `idempotencyKey` (unique)
- `createdAt`, `completedAt?`

### transaction_splits
- `id` (uuid PK)
- `transactionId` (FK)
- `walletId` (FK)
- `provider`, `amount`, `fee`, `promoSaving`
- `status`, `processedAt?`

### panto_points_log
- `id` (uuid PK)
- `userId`, `transactionId?` (FKs)
- `type` ('earn' | 'redeem' | 'bonus')
- `amount`, `balanceAfter`, `description`
- `createdAt`

### merchants
- `id` (uuid PK)
- `name`, `category`, `logoEmoji`
- `defaultBill` (integer, nullable)
- `createdAt`

---

## 8. Frontend Routes & Pages

| Path | Component | Layout | Description |
|---|---|---|---|
| `/login` | `LoginPage` | — | Login / register toggle |
| `/` | `HomePage` | Layout | Dashboard with balance + menu + recent tx |
| `/wallets` | `WalletsPage` | Layout | Wallet list + link/unlink + sync |
| `/pay` | `PayPage` | Layout | 3-step SmartPay payment flow |
| `/history` | `HistoryPage` | Layout | Filtered + grouped transaction history |
| `/profile` | `ProfilePage` | Layout | User info + stats + settings |
| `/scan` | `ScanQRPage` | **Full-screen** (no Layout) | Scan / Bayar / Transfer tabs |

All non-login routes wrapped in `ProtectedRoute`. Layout provides bottom navigation bar.

---

## 9. SmartPay Algorithm

Located in [panto-api/src/modules/smartpay/smartpay.service.ts](panto-api/src/modules/smartpay/smartpay.service.ts).

```
INPUT:
  amount, merchantName, merchantCategory?

PROCESS:
  1. Filter active wallets (isActive && inRouting)
  2. Validate total balance ≥ amount
  3. Score each wallet:
     score = (promoValue × 100)           // category-matched promo
           + (balance / totalBalance × 50) // bigger wallets preferred
           - (transferFee × 10)            // penalize fees
  4. Sort wallets by score DESC
  5. Greedy allocate: for each wallet, allocate min(balance, remaining).
     Skip if allocation < Rp 1.000 unless last piece.
  6. Calculate savings using real per-wallet fee table

OUTPUT:
  splits: [{ walletId, provider, amount, percentage, fee, promoSaving }]
  summary: { totalAmount, totalFee, totalSaving, walletsUsed }
```

### Per-Wallet Fee Table

[panto-api/src/modules/smartpay/wallet-fees.constant.ts](panto-api/src/modules/smartpay/wallet-fees.constant.ts)

| Provider | toBank | toOtherEwallet | p2pSame |
|---|---|---|---|
| GoPay | Rp 2.500 | Rp 2.500 | Rp 0 |
| OVO | Rp 2.500 | Rp 2.500 | Rp 0 |
| DANA | Rp 2.500 | Rp 2.500 | Rp 0 |
| ShopeePay | Rp 1.500 | Rp 1.500 | Rp 0 |
| LinkAja | Rp 1.000 | Rp 1.000 | Rp 0 |

### Savings Logic

```
getManualConsolidationCost(providers[]):
  if providers.length ≤ 1: return 0
  sort providers by toBank fee DESC
  primary = providers[0]      // highest-fee wallet as target
  secondary = providers[1..]  // all others transfer to primary
  return sum(toBank[p] for p in secondary)
```

This represents the cost the user would pay if they manually consolidated funds across wallets. That cost = Panto's "savings" for the user.

---

## 10. How to Run

### Prerequisites
- Node.js 18+
- npm 9+

### First-time setup
```bash
cd panto-api && npm install
cd ../panto-web && npm install
```

### Start dev servers

**Terminal 1 — Backend:**
```bash
cd panto-api
npx ts-node -r tsconfig-paths/register src/main.ts
# → http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd panto-web
npm run dev
# → http://localhost:5173
# → Network: http://<your-lan-ip>:5173 (for phone access)
```

### Access from phone
1. Ensure laptop & phone on same WiFi
2. Get laptop IP: `ipconfig getifaddr en0`
3. Open `http://<laptop-ip>:5173` on phone
4. Allow macOS firewall popup if asked

---

## 11. Demo Credentials

Auto-seeded on first run of backend:

| Field | Value |
|---|---|
| Phone | `08123456789` |
| PIN | `123456` |
| Name | `Demo User` |
| Wallets | GoPay (Rp 150.000), OVO (Rp 120.000), DANA (Rp 80.000) |
| PantoPoints | 1.089 (welcome bonus) + earned from 2 sample transactions |
| Sample transactions | Kopi Kenangan (Rp 45k), Indomaret (Rp 78k) |

### Seeded Merchants (for QR Demo)
1. ☕ Kopi Kenangan — Rp 35.000
2. 🏪 Indomaret — Rp 50.000
3. 🍔 GrabFood — Rp 75.000
4. 💊 Apotek Kimia Farma — Rp 120.000
5. ⛽ SPBU Pertamina — Rp 100.000

---

## 12. Deviations from Original Plan

| Original Plan | MVP Reality | Reason |
|---|---|---|
| MySQL + Docker Compose | SQLite via `better-sqlite3` | Zero-config local dev, no Docker dependency |
| Redis cache + session store | In-memory (no cache) | Overkill for MVP, no scale need |
| Bull queue for analytics | Not implemented | Out of scope |
| Real OTP via SMS | Direct PIN login | Simulation, no SMS gateway |
| Biometric auth | Not implemented | Would need real device |
| html5-qrcode full feature set | Subset (scan + file) | Clean UI with custom styling |
| Charting library (Chart.js, Recharts) | Custom SVG line chart | Smaller bundle, fits mobile-first |
| Zustand persist middleware | Manual localStorage in store | Simpler, one dep less |

---

## Future Roadmap (not in MVP)

- **Phase 2 (Alpha)** — Real OTP via SMS gateway, real QRIS parsing, push notifications
- **Phase 3 (Beta)** — First real e-wallet integration (partnership required), Panto float management
- **Phase 4 (Production)** — PJP license from BI, all e-wallet integrations, bill payment, bank transfer, withdraw, real merge money
- **Phase 5 (Scale)** — AI-powered SmartPay, financial services, open API

See [panto_concept.md](attached) for business model and positioning analysis.
