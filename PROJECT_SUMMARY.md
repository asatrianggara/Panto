# Panto — Project Summary

> **Smart Payment Aggregator MVP** — Pay one transaction using funds from multiple e-wallets simultaneously.

---

## Overview

Panto solves the "scattered funds" problem across Indonesian e-wallets (GoPay, OVO, DANA, ShopeePay, LinkAja). Instead of topping up one wallet before paying, Panto's **SmartPay algorithm** automatically splits a payment optimally across all linked wallets.

**Current Phase:** MVP Simulation — all wallet operations are simulated locally. No real e-wallet API integration yet (planned Phase 3+).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11 + TypeScript |
| Database | SQLite + TypeORM (auto-sync) |
| Auth | JWT (Passport) + bcrypt |
| Frontend | React 18 + TypeScript + Vite 5 |
| Routing | React Router v7 |
| State | Zustand 5 (localStorage persist) |
| HTTP Client | Axios (with JWT interceptors) |
| QR Scan | html5-qrcode |
| QR Generate | qrcode |

---

## Features

### 1. Authentication
- Register/login with phone number (08xxxxxxxxx) and 6-digit PIN
- JWT-based session (24h expiry)
- Auto-redirect on token expiry

### 2. Wallet Management
- Link up to 5 e-wallets: GoPay, OVO, DANA, ShopeePay, LinkAja
- Each linked wallet gets a simulated random balance
- Toggle wallets in/out of SmartPay routing
- Sync balance (simulated refresh)
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
- 5 demo merchant QRs built-in for testing

### 5. Transaction History
- Paginated list grouped by month
- Filter by wallet provider
- Custom SVG spending chart
- CSV export

### 6. PantoPoints Loyalty
- Earn points on every transaction
- Welcome bonus on registration
- Points history log

### 7. Profile
- Edit name, email, avatar
- View stats: total transactions, total savings, PantoPoints balance
- Settings (mostly locked in MVP)

---

## Project Structure

```
Panto/
├── panto-api/          # NestJS backend (port 3000)
│   └── src/
│       └── modules/
│           ├── auth/
│           ├── users/
│           ├── wallets/
│           ├── smartpay/
│           ├── transactions/
│           ├── points/
│           ├── merchants/
│           ├── dana/
│           └── seed/
│
└── panto-web/          # React frontend (port 5173)
    └── src/
        ├── api/
        ├── store/
        ├── components/
        ├── pages/
        │   ├── Login/
        │   ├── Home/
        │   ├── Wallets/
        │   ├── Pay/
        │   ├── History/
        │   ├── Profile/
        │   └── Scan/
        └── utils/
```

---

## How to Run

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Install Dependencies

```bash
# Backend
cd panto-api && npm install

# Frontend
cd ../panto-web && npm install
```

### 2. Start Development Servers

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd panto-api
npx ts-node -r tsconfig-paths/register src/main.ts
```
API runs at: `http://localhost:3000`

**Terminal 2 — Frontend:**
```bash
cd panto-web
npm run dev
```
App runs at: `http://localhost:5173`

> The frontend Vite config automatically proxies `/api` requests to `localhost:3000`, so no extra configuration needed.

### 3. Access on Mobile (Same WiFi)

```bash
# Get your laptop's local IP
ipconfig getifaddr en0
```

Then open `http://<your-ip>:5173` on your phone.

### 4. Production Build

```bash
# Backend
cd panto-api && npm run build && npm run start:prod

# Frontend
cd panto-web && npm run build && npm run preview
```

---

## Demo Credentials (Auto-seeded)

The database is pre-seeded with a demo account on first run.

| Field | Value |
|---|---|
| Phone | `08123456789` |
| PIN | `123456` |
| Wallets | GoPay (Rp 150.000), OVO (Rp 120.000), DANA (Rp 80.000) |
| PantoPoints | ~1.089 (welcome bonus + sample transactions) |

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
**Auth:** `Authorization: Bearer <jwt_token>` (except `/auth/*`)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/auth/register` | POST | No | Register with phone + PIN |
| `/auth/login` | POST | No | Login, returns JWT |
| `/users/me` | GET | Yes | Current user profile |
| `/users/me` | PATCH | Yes | Update profile |
| `/users/me/stats` | GET | Yes | Transaction & savings stats |
| `/wallets` | GET | Yes | List linked wallets |
| `/wallets/link` | POST | Yes | Link a new e-wallet |
| `/wallets/summary` | GET | Yes | Total balance + count |
| `/wallets/:id` | PATCH | Yes | Update wallet (balance, routing) |
| `/wallets/:id` | DELETE | Yes | Unlink wallet |
| `/smartpay/calculate` | POST | Yes | Calculate optimal split for amount |
| `/smartpay/validate` | POST | Yes | Validate a custom split |
| `/transactions` | POST | Yes | Create payment transaction |
| `/transactions` | GET | Yes | Paginated transaction history |
| `/transactions/:id` | GET | Yes | Transaction detail + splits |
| `/points` | GET | Yes | Points balance + totals |
| `/points/history` | GET | Yes | Paginated points log |
| `/merchants` | GET | Yes | All demo merchants + QR payloads |

---

## Environment Variables

Only needed for future DANA integration (optional in current MVP):

```env
# panto-api/.env  (copy from .env.example)
DANA_CLIENT_ID=
DANA_PRIVATE_KEY_PATH=./keys/dana-private.pem
DANA_CLIENT_SECRET=
DANA_ORIGIN=http://localhost:3000
DANA_MERCHANT_ID=
DANA_ENV=sandbox
DANA_PUBLIC_KEY=
```

> The database (`panto.sqlite`) is auto-created in `panto-api/` on first run. No setup needed.

---

## Known Limitations (MVP Scope)

- No real e-wallet API calls — all balances are simulated
- JWT secret is hardcoded (`panto-secret-key`) — change before any real deployment
- No automated tests configured
- No OTP/SMS verification — PIN login only
- DANA OAuth flow is partially scaffolded but not complete
- QR parsing only handles Panto-format QR (not real QRIS standard)

---

## Roadmap

| Phase | Scope |
|---|---|
| **Current (MVP)** | Simulation mode, local demo |
| **Phase 2** | Real OTP via SMS, real QRIS parsing, push notifications |
| **Phase 3** | First real e-wallet integration (requires partnership) |
| **Phase 4** | PJP license from BI, full e-wallet coverage, bill payment |
| **Phase 5** | AI-powered SmartPay, open API, financial services |
