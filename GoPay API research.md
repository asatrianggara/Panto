# GoPay Indonesia E-Wallet API — Technical Research Document

## 1. Overview

GoPay is Indonesia's leading e-wallet, operated by PT Dompet Anak Bangsa (a Gojek subsidiary). There are **three distinct integration paths**:

| Integration Path | Target Audience | Auth Mechanism |
|---|---|---|
| **Midtrans Core API** | Any Midtrans merchant | HTTP Basic Auth (Server Key) |
| **GoPay Tokenization — BI-SNAP** | Merchants needing account linking & auto-debit | RSA Asymmetric Signature + Bearer JWT |
| **GoBiz Direct API** | Gojek-registered merchants only | OAuth2 Client Credentials |

> **This project's focus:** Account linking (one-time) + Direct Debit per transaction (tap-to-pay). This uses **GoPay Tokenization + Midtrans Core API or BI-SNAP**.

---

## 2. Authorization & Authentication

### 2.1 Midtrans Core API — HTTP Basic Auth

**Mechanism:** Base64-encode `ServerKey:` (key + colon + empty password).

```javascript
const encoded = Buffer.from(`${serverKey}:`).toString('base64');
const headers = {
  'Authorization': `Basic ${encoded}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

**Credentials:** Server Key + Client Key from Midtrans Dashboard → Settings → Access Keys
- Sandbox: `https://dashboard.sandbox.midtrans.com`
- Production: `https://dashboard.midtrans.com`

---

### 2.2 GoPay Tokenization — BI-SNAP (Two-Phase Auth)

Required for account linking and direct debit.

#### Phase 1 — Get Bearer Token

**Endpoint:** `POST /v1.0/access-token/b2b`

**Signature:** `SHA256withRSA(clientKey + "|" + timestamp, merchantPrivateKey)`

```http
X-CLIENT-KEY: <client_key>
X-TIMESTAMP: 2024-01-15T10:30:00+07:00
X-SIGNATURE: <SHA256withRSA_signature>
Content-Type: application/json
```

```json
// Response — token expires in 900 seconds (15 min)
{
  "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
  "tokenType": "BearerToken",
  "expiresIn": "900"
}
```

#### Phase 2 — Transactional Calls

| Header | Description |
|---|---|
| `Authorization` | `Bearer <access_token>` |
| `Authorization-Customer` | Customer-level token (for customer-scoped calls) |
| `X-TIMESTAMP` | ISO 8601 with timezone |
| `X-SIGNATURE` | HMAC-SHA512 per-request signature |
| `X-PARTNER-ID` | Issued by Midtrans |
| `X-DEVICE-ID` | Device identifier |
| `X-EXTERNAL-ID` | Unique idempotency key per request |
| `CHANNEL-ID` | Distribution channel ID |

**Per-request HMAC-SHA512 string-to-sign:**
```
{HTTP_METHOD}:{relative_path}:{access_token}:{lowercase_hex(SHA256(request_body))}:{timestamp}
```
Signed with `X-CLIENT-SECRET`.

**Credentials:** X-CLIENT-KEY and X-CLIENT-SECRET from Midtrans. Merchant generates RSA key pair and registers public key with Midtrans.

---

### 2.3 Environments

| Environment | Core API Base URL | BI-SNAP Base URL |
|---|---|---|
| Sandbox | `https://api.sandbox.midtrans.com` | `https://merchants.sbx.midtrans.com` |
| Production | `https://api.midtrans.com` | `https://merchants.midtrans.com` |

**Sandbox GoPay test credentials:** PIN `112233`, OTP `987654`

> Always use **separate Server Keys** per environment. A `401` error almost always means a key/environment mismatch.

---

## 3. Implementation Guide — Account Linking + Tap-to-Pay

This is the full flow for the project's use case: user connects GoPay once, then pays with a single tap per transaction.

### Flow Overview

```
[ONCE — Account Linking]
1. POST /v2/pay/account          → get account_id + activation deeplink
2. User completes consent        → enters OTP + PIN + QR scan in Gojek app
3. GET  /v2/pay/account/{id}     → retrieve payment_option_token

[PER TRANSACTION — Tap-to-Pay]
4. GET  /v2/pay/account/{id}     → refresh payment_option_token (required each time)
5. POST /v2/charge               → create charge → returns "pending" + deeplink
6. Redirect user to deeplink     → user confirms in GoPay app (PIN required*)
7. Webhook fires                 → transaction_status = "settlement"
8. Verify signature              → fulfill order
```

> ⚠️ **PIN Note:** As of **1 February 2026**, Midtrans mandates that all GoPay payments redirect the user to the GoPay standalone app for PIN confirmation. The UX is: tap button → GoPay app opens → user confirms/enters PIN → returns to merchant app. Fully PIN-free silent debit is **not available** on the standard integration path.

---

### Step 1 — Create Pay Account (Link GoPay)

```
POST https://api.sandbox.midtrans.com/v2/pay/account
Authorization: Basic <Base64(SERVER_KEY:)>
Content-Type: application/json
```

```json
// Request
{
  "payment_type": "gopay",
  "gopay_partner": {
    "phone_number": "81212345678",
    "country_code": "62",
    "redirect_url": "https://yourdomain.com/gopay/callback"
  }
}
```

```json
// Response
{
  "status_code": "201",
  "account_id": "0dd2cd90-a9a9-4a09-b393-21162dfb713b",
  "account_status": "PENDING",
  "actions": [
    { "name": "activation-link-url", "method": "GET", "url": "https://gopay.co.id/activation?token=xxx" },
    { "name": "activation-link-app",  "method": "GET", "url": "gojek://gopay/activation?token=xxx" }
  ]
}
```

**Customer consent steps:** activation link → enter OTP → enter PIN → scan QR in Gojek app → redirected back.

> Session timeout: **1 hour**. After timeout `account_status` becomes `EXPIRED` — must restart linking.

---

### Step 2 — Get Pay Account (Retrieve Token)

Call after customer completes consent, and **again before every charge** (token can rotate).

```
GET https://api.sandbox.midtrans.com/v2/pay/account/{account_id}
Authorization: Basic <Base64(SERVER_KEY:)>
```

```json
// Response
{
  "status_code": "200",
  "account_id": "0dd2cd90-a9a9-4a09-b393-21162dfb713b",
  "account_status": "ENABLED",
  "metadata": {
    "payment_options": [
      {
        "name": "GOPAY_WALLET",
        "active": true,
        "balance": { "value": "8000000.00", "currency": "IDR" },
        "token": "c3ed4a3b-f14c-4d1d-aad2-abcdef123456"
      },
      {
        "name": "PAY_LATER",
        "active": true,
        "balance": { "value": "3000000.00", "currency": "IDR" },
        "token": "pay-later-token-xyz"
      }
    ]
  }
}
```

| `account_status` | Meaning |
|---|---|
| `PENDING` | Customer has not completed consent |
| `ENABLED` | Active — token is usable |
| `DISABLED` | Account unlinked |
| `EXPIRED` | Linking session timed out |

> Store `account_id` permanently. Fetch `token` fresh before each charge.

---

### Step 3 — Charge (Tap-to-Pay)

Two API options — choose one based on your integration path:

#### Option A — Core API (Recommended for most merchants)

```
POST https://api.sandbox.midtrans.com/v2/charge
Authorization: Basic <Base64(SERVER_KEY:)>
Content-Type: application/json
```

```json
// Request
{
  "payment_type": "gopay",
  "transaction_details": {
    "order_id": "order-tap-54321",
    "gross_amount": 150000
  },
  "gopay": {
    "account_id": "0dd2cd90-a9a9-4a09-b393-21162dfb713b",
    "payment_option_token": "c3ed4a3b-f14c-4d1d-aad2-abcdef123456",
    "enable_callback": true,
    "callback_url": "myapp://payment/callback",
    "pre_auth": false,
    "recurring": false
  },
  "customer_details": {
    "first_name": "Budi",
    "last_name": "Santoso",
    "email": "budi@example.com",
    "phone": "08111222333"
  }
}
```

**Request fields:**

| Field | Required | Description |
|---|---|---|
| `payment_type` | Yes | Always `"gopay"` |
| `transaction_details.order_id` | Yes | Unique per transaction |
| `transaction_details.gross_amount` | Yes | Integer IDR amount (no decimals) |
| `gopay.account_id` | Yes | From account linking |
| `gopay.payment_option_token` | Yes | From Get Pay Account (fresh fetch) |
| `gopay.enable_callback` | Optional | Set `true` to append callback to deeplink |
| `gopay.callback_url` | Optional | App deeplink to return user after payment |
| `gopay.pre_auth` | Optional | `false` = direct debit (default) |
| `gopay.recurring` | Optional | `true` = mark as recurring charge |

```json
// Response (HTTP 201)
{
  "status_code": "201",
  "status_message": "GO-PAY transaction is created",
  "transaction_id": "231c79c5-e39e-4993-86da-cadcaee56c1d",
  "order_id": "order-tap-54321",
  "gross_amount": "150000.00",
  "currency": "IDR",
  "payment_type": "gopay",
  "transaction_time": "2024-11-01 10:30:00",
  "transaction_status": "pending",
  "fraud_status": "accept",
  "actions": [
    {
      "name": "deeplink-redirect",
      "method": "GET",
      "url": "https://simulator.sandbox.midtrans.com/gopay/ui/checkout?referenceid=Y0xwjoQ9uy&callback_url=myapp://payment/callback"
    },
    {
      "name": "generate-qr-code",
      "method": "GET",
      "url": "https://api.sandbox.veritrans.co.id/v2/gopay/231c79c5/qr-code"
    },
    {
      "name": "get-status",
      "method": "GET",
      "url": "https://api.sandbox.veritrans.co.id/v2/231c79c5/status"
    },
    {
      "name": "cancel",
      "method": "POST",
      "url": "https://api.sandbox.veritrans.co.id/v2/231c79c5/cancel"
    }
  ]
}
```

> Always redirect user to `actions[deeplink-redirect].url` after receiving this response.

---

#### Option B — BI-SNAP (New standard, mandatory migration path)

```
POST https://merchants.sbx.midtrans.com/v1.0/debit/payment-host-to-host
Authorization: Bearer <access_token_b2b>
Authorization-Customer: Bearer <customer_access_token>
X-TIMESTAMP: 2024-11-01T10:30:00+07:00
X-SIGNATURE: <HMAC-SHA512>
X-PARTNER-ID: YOUR_PARTNER_ID
X-EXTERNAL-ID: unique-uuid-per-request
CHANNEL-ID: YOUR_CHANNEL_ID
Content-Type: application/json
```

```json
// Request
{
  "partnerReferenceNo": "order-tap-54321",
  "chargeToken": "eyJ0eXAiOiJKV1Qi...",
  "merchantId": "G123456789",
  "validUpTo": "2024-11-01T11:30:00+07:00",
  "payOptionDetails": [
    {
      "payMethod": "GOPAY",
      "payOption": "GOPAY_WALLET",
      "transAmount": {
        "value": "150000.00",
        "currency": "IDR"
      },
      "additionalInfo": {
        "paymentOptionToken": "c3ed4a3b-f14c-4d1d-aad2-abcdef123456"
      }
    }
  ],
  "urlParams": [
    {
      "url": "https://merchant.example.com/payment/return",
      "type": "PAY_RETURN",
      "isDeeplink": "Y"
    }
  ],
  "additionalInfo": {
    "lang": "en",
    "customerDetails": {
      "firstName": "Budi",
      "lastName": "Santoso",
      "email": "budi@example.com",
      "phone": "08111222333"
    }
  }
}
```

```json
// Response
{
  "responseCode": "2005400",
  "responseMessage": "Request has been processed successfully",
  "referenceNo": "T2024110101234567890",
  "partnerReferenceNo": "order-tap-54321",
  "webRedirectUrl": "https://gopay.co.id/pay/webview?token=xxx",
  "appRedirectUrl": "gojek://gopay/pay?token=xxx&callback=https://merchant.example.com/payment/return",
  "additionalInfo": {
    "grossAmount": { "value": "150000.00", "currency": "IDR" },
    "status": "PENDING",
    "expiryTime": "2024-11-01T11:30:00+07:00",
    "paymentType": "GOPAY",
    "transactionStatus": "03",
    "fraudStatus": "accept"
  }
}
```

> Redirect user to `appRedirectUrl` (mobile) or `webRedirectUrl` (browser/webview).

---

#### Core API vs. BI-SNAP Comparison

| Aspect | Core API | BI-SNAP |
|---|---|---|
| Auth | Basic Auth (Server Key) | Asymmetric JWT + HMAC-SHA512 per request |
| Field naming | snake_case | camelCase / PascalCase |
| Amount format | Integer (`150000`) | Decimal string (`"150000.00"`) |
| Redirect field | `actions[].url` | `appRedirectUrl` / `webRedirectUrl` |
| Status on creation | `transaction_status: "pending"` | `additionalInfo.status: "PENDING"` |
| Rollout | Available now, being phased out | Mandatory migration; sandbox since Oct 22, 2024 |

---

### Step 4 — Receive Settlement via Webhook

Midtrans sends `POST` to your configured Notification URL when the charge settles.

```json
// Webhook payload
{
  "transaction_time": "2024-11-01 10:30:00",
  "transaction_status": "settlement",
  "transaction_id": "231c79c5-e39e-4993-86da-cadcaee56c1d",
  "settlement_time": "2024-11-01 10:31:02",
  "status_code": "200",
  "signature_key": "<SHA512 hash>",
  "payment_type": "gopay",
  "order_id": "order-tap-54321",
  "merchant_id": "G123456789",
  "gross_amount": "150000.00",
  "fraud_status": "accept",
  "currency": "IDR"
}
```

**Verify before fulfilling order:**
```
SHA512(order_id + status_code + gross_amount + SERVER_KEY) === signature_key
```

**Retry policy:** up to 3 attempts (20ms → 40ms → 80ms). Return `200 OK` promptly.

**Fallback — poll status:**
```
GET https://api.midtrans.com/v2/{transaction_id}/status
```

---

### Transaction Status Lifecycle

```
pending → settlement   (success)
pending → deny         (insufficient balance / rejected)
pending → expire       (~24h timeout, user did not confirm)
pending → cancel       (merchant called cancel endpoint)
settlement → refund    (merchant initiated refund)
```

---

### Step 5 — Unbind Pay Account (Revoke Consent)

```
POST https://api.sandbox.midtrans.com/v2/pay/account/{account_id}/unbind
```

> Midtrans auto-sends an unbind webhook if customer changes PIN or phone in Gojek app. Handle this to invalidate stored tokens.

---

## 4. Auto-Debit / Subscription API (Scheduled Recurring)

For **merchant-initiated scheduled charges** (not user-triggered), use the Subscription API on top of the linked account token.

### Subscription Endpoints

| Operation | Method | Path |
|---|---|---|
| Create Subscription | `POST` | `/v1/subscriptions` |
| Get Subscription | `GET` | `/v1/subscriptions/{id}` |
| Update Subscription | `PATCH` | `/v1/subscriptions/{id}` |
| Enable Subscription | `POST` | `/v1/subscriptions/{id}/enable` |
| Disable Subscription | `POST` | `/v1/subscriptions/{id}/disable` |

```json
// Create Subscription request
{
  "name": "MONTHLY_PLAN",
  "amount": "14000",
  "currency": "IDR",
  "payment_type": "gopay",
  "token": "<payment_option_token>",
  "schedule": {
    "interval": 1,
    "interval_unit": "month",
    "max_interval": 12
  },
  "retry_schedule": {
    "interval": 1,
    "interval_unit": "day",
    "max_interval": 3
  },
  "gopay": { "account_id": "0dd2cd90-a9a9-4a09-b393-21162dfb713b" },
  "customer_details": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "081234567890"
  }
}
```

`interval_unit` accepts: `day`, `week`, `month`, `year`

Supported payment types: `gopay`, `qris`, `shopeepay`, `credit_card`

> **Activation required** — Subscription API requires separate explicit activation. Contact Midtrans Sales PIC.

---

## 5. Transaction Limits & Merchant Requirements

| Requirement | Details |
|---|---|
| GoPay Tokenization activation | Must be explicitly activated — contact Midtrans Sales PIC |
| Subscription API activation | Separate activation required |
| Pre-Auth activation | Requires separate Sales rep request |
| GoPay (non-KYC) limit | IDR 2,000,000 per transaction |
| GoPay (KYC-verified) limit | IDR 20,000,000 per transaction |
| GoPayLater limit | IDR 3,000,000 |
| Linking session timeout | 1 hour |

---

## 6. Error & Response Codes

| HTTP Status / Code | Meaning | Flow |
|---|---|---|
| `201` / `PENDING` | Linking initiated, not completed | Create Pay Account |
| `204` / `EXPIRED` | Linking timed out | Get Pay Account |
| `400` | Validation error | All |
| `401` | Wrong key or wrong environment | All |
| `403` | Content negotiation failure | All |
| `404` | Resource not found | Get/Unbind/Subscription |
| `406` | Duplicate Order ID | Charge, Direct Debit |
| `408` | Wrong data type | All |
| `410` | Merchant account deactivated | All |
| `503` | GoPay service unavailable | All |
| `900` | `GENERIC_SERVICE_ERROR` | All |
| `transaction_status: settlement` | Successful, settled | All charge flows |
| `transaction_status: authorize` | Pre-Auth hold placed | Pre-Auth only |
| `transaction_status: deny` | Charge rejected by GoPay | Direct Debit |
| `transaction_status: expire` | User did not confirm in time | Direct Debit |

---

## 7. Summary & Key Takeaways

**Pre-integration checklist:**
- [ ] Obtain Sandbox Server Key + Client Key from Midtrans Dashboard
- [ ] Contact Midtrans Sales PIC to **activate GoPay Tokenization / Direct Debit**
- [ ] For BI-SNAP: generate RSA key pair, register public key with Midtrans
- [ ] Configure webhook Notification URL; implement **SHA512 signature verification**
- [ ] Test with sandbox credentials: PIN `112233`, OTP `987654`

**Key technical points:**
1. `payment_option_token` must be **fetched fresh** before every charge — do not cache it permanently
2. Every charge returns `pending` first — fulfillment must wait for the **settlement webhook**
3. BI-SNAP tokens expire in **15 min** — implement proactive refresh
4. Linking sessions expire after **1 hour** — re-initiate if expired
5. Handle **unbind webhooks** — customer PIN/phone changes in Gojek app auto-unlink accounts
6. As of **Feb 1, 2026**, GoPay app redirect (PIN confirmation) is mandatory on every transaction
7. KYC status affects caps (IDR 2M vs IDR 20M per transaction)

---

## 8. References

| # | Source |
|---|---|
| 1 | [Midtrans — API Authorization Headers](https://docs.midtrans.com/docs/api-authorization-headers) |
| 2 | [Midtrans — GoPay Tokenization BI-SNAP Overview](https://docs.midtrans.com/reference/gopay-tokenization-1) |
| 3 | [Midtrans — GoPay Tokenization](https://docs.midtrans.com/reference/gopay-tokenization) |
| 4 | [Midtrans — Create Pay Account](https://docs.midtrans.com/reference/create-pay-account) |
| 5 | [Midtrans — Get Pay Account](https://docs.midtrans.com/reference/get-pay-account) |
| 6 | [Midtrans — Unbind Pay Account](https://docs.midtrans.com/reference/unbind-pay-account) |
| 7 | [Midtrans — Access Token API (BI-SNAP)](https://docs.midtrans.com/reference/access-token-api) |
| 8 | [Midtrans — Direct Debit API (Core API)](https://docs.midtrans.com/reference/direct-debit-api-gopay-tokenization) |
| 9 | [Midtrans — Direct Debit API (GoPay/ShopeePay/Dana)](https://docs.midtrans.com/reference/direct-debit-api-gopay) |
| 10 | [Midtrans — Pre-Auth Payment API](https://docs.midtrans.com/reference/auth-payment-api-gopay-tokenization) |
| 11 | [Midtrans — Create Subscription](https://docs.midtrans.com/reference/create-subscription) |
| 12 | [Midtrans — Get Subscription](https://docs.midtrans.com/reference/get-subscription) |
| 13 | [Midtrans — Update Subscription](https://docs.midtrans.com/reference/update-subscription) |
| 14 | [Midtrans — Sandbox Testing (GoPay BI-SNAP)](https://docs.midtrans.com/reference/testing-gopay-tokenization-bi-snap-on-sandbox) |
| 15 | [Midtrans — Account Linking/Unlinking Notification](https://docs.midtrans.com/reference/account-linking-unlinking-notification) |
| 16 | [Midtrans — Webhooks](https://docs.midtrans.com/docs/https-notification-webhooks) |
| 17 | [Midtrans — Error Codes](https://docs.midtrans.com/docs/error-code-and-response-code) |
| 18 | [Midtrans — GoPay Response Codes](https://docs.midtrans.com/reference/gopay-response-codes) |
| 19 | [Midtrans — Transaction Status Cycle](https://docs.midtrans.com/docs/transaction-status-cycle) |
| 20 | [Midtrans — Subscription API Improvements (Aug 2023)](https://docs.midtrans.com/changelog/august-15th-subscription-api-improvements) |
| 21 | [Midtrans — FAQ: Redirection to GoPay App](https://docs.midtrans.com/reference/faq-redirection-to-gojek-gopay-app) |
| 22 | [GoBiz — Direct Integration Auth](https://developer.gobiz.com/docs/api/auth/direct-integration/) |
| 23 | [PPRO Developer Hub — GoPay Indonesia](https://developerhub.ppro.com/simple-api/docs/gopay-by-gojek-indonesia) |
| 24 | [Adyen — GoPay API Only](https://docs.adyen.com/payment-methods/gopay/api-only/) |
