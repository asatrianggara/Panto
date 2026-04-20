# Panto Admin API Contract

Contract antara `panto-api` (backend) dan `panto-admin` (frontend) untuk Phase 0 finish + Phase 1 + Phase 2 (read-only endpoints).

**Out of scope this pass:** suspend/activate, reset PIN, force-sync, retry, refund, flagging, CSV export. Those need audit log infrastructure.

**Base URL:** `/api/admin/*` (behind `AdminJwtGuard`, except `/auth/login`)
**Auth:** `Authorization: Bearer <admin-jwt>` — JWT payload: `{ adminId: string, role: AdminRole }`
**Roles:** `'super_admin' | 'admin' | 'support' | 'read_only'` — all endpoints accessible by any admin unless noted.

All timestamps are ISO 8601. All amounts in IDR rupiah (integer, no cents).

**Response envelope:** following the existing `panto-api` convention, every response is wrapped:
```json
{ "success": true, "data": <payload>, "message": "..." }
```
Errors: `{ "success": false, "error": "message", "statusCode": 401 }` (or NestJS default `{ statusCode, message, error }` on validation errors).
The `data` field contents for each endpoint are documented below. The frontend `client.ts` unwraps `data` automatically.

---

## 0. Auth

### `POST /api/admin/auth/login`
**No guard.**

Request:
```json
{ "email": "admin@panto.id", "password": "panto123" }
```

Response 200:
```json
{
  "token": "<jwt>",
  "admin": {
    "id": "uuid",
    "email": "admin@panto.id",
    "role": "super_admin",
    "isActive": true
  }
}
```

Errors: 401 `{ message: "Invalid email or password" }`

### `GET /api/admin/auth/me`
Returns current admin profile (decoded from JWT).

Response 200:
```json
{ "id": "uuid", "email": "...", "role": "super_admin", "isActive": true }
```

---

## 1. Dashboard

### `GET /api/admin/dashboard/overview`
Top-line KPIs for the dashboard home.

Response 200:
```json
{
  "totalUsers": 1234,
  "activeUsers": 980,
  "totalWallets": 3100,
  "activeWallets": 2890,
  "transactionsToday": 245,
  "transactionVolumeToday": 45000000,
  "failedTransactionsToday": 3,
  "newUsersToday": 12
}
```

---

## 2. Users

### `GET /api/admin/users`
List users with filters + pagination.

Query params:
- `q` — search by phone or name (partial match)
- `tier` — `'free' | 'plus'`
- `isActive` — `'true' | 'false'`
- `page` — default `1`
- `limit` — default `20`, max `100`
- `sort` — `'createdAt' | 'name'` (default `createdAt`)
- `order` — `'asc' | 'desc'` (default `desc`)

Response 200:
```json
{
  "items": [
    {
      "id": "uuid",
      "phoneNumber": "+628...",
      "name": "Budi",
      "email": "budi@mail.com",
      "tier": "free",
      "isActive": true,
      "walletCount": 3,
      "createdAt": "2026-01-15T..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1234
}
```

### `GET /api/admin/users/:id`
User detail with aggregated counts.

Response 200:
```json
{
  "id": "uuid",
  "phoneNumber": "+628...",
  "name": "Budi",
  "email": "budi@mail.com",
  "avatarUrl": null,
  "tier": "free",
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "...",
  "stats": {
    "walletCount": 3,
    "activeWalletCount": 3,
    "totalBalance": 450000,
    "transactionCount": 42,
    "successfulTransactions": 40,
    "totalSpent": 2300000
  }
}
```

Errors: 404 `{ message: "User not found" }`

### `GET /api/admin/users/:id/wallets`
Wallets owned by user.

Response 200:
```json
{
  "items": [
    {
      "id": "uuid",
      "provider": "gopay",
      "providerPhone": "+628...",
      "balance": 150000,
      "isActive": true,
      "inRouting": true,
      "isRealLinked": false,
      "lastSynced": "...",
      "linkedAt": "..."
    }
  ]
}
```

### `GET /api/admin/users/:id/transactions`
Recent transactions by user (last 50, newest first).

Response 200:
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "qr_payment",
      "merchantName": "Starbucks",
      "totalAmount": 45000,
      "status": "success",
      "createdAt": "..."
    }
  ]
}
```

### `GET /api/admin/users/:id/activity`
Activity timeline (login events + transactions, most recent 50).

Response 200:
```json
{
  "items": [
    {
      "type": "transaction",
      "timestamp": "...",
      "summary": "Paid Rp45.000 to Starbucks",
      "refId": "uuid"
    },
    {
      "type": "wallet_linked",
      "timestamp": "...",
      "summary": "Linked GoPay wallet",
      "refId": "uuid"
    }
  ]
}
```
> Note: MVP — derive from transactions + wallet linkedAt. Login events will come later.

---

## 3. Wallets

### `GET /api/admin/wallets`
Global wallet overview across all users.

Query params:
- `provider` — `'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'linkaja'`
- `isActive` — `'true' | 'false'`
- `isRealLinked` — `'true' | 'false'`
- `page`, `limit`, `sort`, `order` — same as users

Response 200:
```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "Budi",
      "userPhone": "+628...",
      "provider": "gopay",
      "providerPhone": "+628...",
      "balance": 150000,
      "isActive": true,
      "inRouting": true,
      "isRealLinked": false,
      "lastSynced": "...",
      "linkedAt": "..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 3100
}
```

### `GET /api/admin/wallets/summary`
Aggregated metrics — liquidity per provider.

Response 200:
```json
{
  "byProvider": [
    {
      "provider": "gopay",
      "walletCount": 980,
      "activeCount": 920,
      "totalBalance": 120000000,
      "realLinkedCount": 50
    }
  ],
  "totals": {
    "walletCount": 3100,
    "activeCount": 2890,
    "totalBalance": 450000000
  }
}
```

---

## 4. Transactions

### `GET /api/admin/transactions`
Transaction list with filters + pagination.

Query params:
- `q` — search by merchantName or user phone
- `status` — `'pending' | 'processing' | 'success' | 'failed'`
- `userId` — filter by user
- `dateFrom`, `dateTo` — ISO dates (inclusive)
- `amountMin`, `amountMax` — integer IDR
- `page`, `limit`, `sort` (`createdAt' | 'totalAmount'`), `order`

Response 200:
```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "Budi",
      "userPhone": "+628...",
      "type": "qr_payment",
      "merchantName": "Starbucks",
      "merchantCategory": "food",
      "totalAmount": 45000,
      "totalFee": 500,
      "totalSaving": 2000,
      "status": "success",
      "createdAt": "...",
      "completedAt": "..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1234
}
```

### `GET /api/admin/transactions/:id`
Detail with splits + user info.

Response 200:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "user": {
    "id": "uuid",
    "name": "Budi",
    "phoneNumber": "+628..."
  },
  "type": "qr_payment",
  "merchantName": "Starbucks",
  "merchantCategory": "food",
  "totalAmount": 45000,
  "totalFee": 500,
  "totalSaving": 2000,
  "pointsEarned": 45,
  "status": "success",
  "idempotencyKey": "...",
  "createdAt": "...",
  "completedAt": "...",
  "splits": [
    {
      "id": "uuid",
      "walletId": "uuid",
      "provider": "gopay",
      "amount": 30000,
      "fee": 300,
      "promoSaving": 1500,
      "status": "success",
      "processedAt": "..."
    }
  ]
}
```

Errors: 404 `{ message: "Transaction not found" }`

---

## Conventions

- **List responses:** always `{ items, page, limit, total }` shape
- **Error shape:** `{ statusCode, message, error? }` (NestJS default)
- **Sort order:** `desc` by default on time columns
- **Money:** all integer rupiah
- **Phone:** E.164 format (`+62...`)
- **UUIDs:** lowercase strings
