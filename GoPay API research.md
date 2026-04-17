# GoPay Indonesia E-Wallet API — Technical Research Document

## 1. Overview

GoPay is Indonesia's leading e-wallet, operated by PT Dompet Anak Bangsa (a Gojek subsidiary). There are **three distinct integration paths**:

| Integration Path | Target Audience | Auth Mechanism |
|---|---|---|
| **Midtrans Core API** | Any Midtrans merchant | HTTP Basic Auth (Server Key) |
| **GoPay Tokenization — BI-SNAP** | Merchants needing account linking & auto-debit | RSA Asymmetric Signature + Bearer JWT |
| **GoBiz Direct API** | Gojek-registered merchants only | OAuth2 Client Credentials |

> Auto-debit and recurring payments are available exclusively through the **GoPay Tokenization (BI-SNAP)** path combined with the **Midtrans Subscription API**.

---

## 2. Authorization & Authentication

### 2.1 Midtrans Core API — HTTP Basic Auth

The standard path for most merchants.

**Mechanism:** Base64-encode `ServerKey:` (key + colon + empty password), pass as `Authorization: Basic <encoded>`.

```javascript
const encoded = Buffer.from(`${serverKey}:`).toString('base64');
const headers = {
  'Authorization': `Basic ${encoded}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

**Credentials:** Server Key + Client Key from Midtrans Dashboard → Settings → Access Keys
- Sandbox dashboard: `https://dashboard.sandbox.midtrans.com`
- Production dashboard: `https://dashboard.midtrans.com`

---

### 2.2 GoPay Tokenization — BI-SNAP (Two-Phase Auth)

Required for account linking and auto-debit.

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
// Response
{
  "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
  "tokenType": "BearerToken",
  "expiresIn": "900"
}
```

> Token expires in **900 seconds (15 minutes)**. Implement proactive refresh.

#### Phase 2 — Transactional Calls

All subsequent calls require `Authorization: Bearer <token>` plus a per-request HMAC-SHA512 signature.

| Header | Description |
|---|---|
| `Authorization` | `Bearer <access_token>` |
| `Authorization-Customer` | Customer-level token (where applicable) |
| `X-TIMESTAMP` | ISO 8601 with timezone |
| `X-SIGNATURE` | HMAC-SHA512 per-request signature |
| `X-PARTNER-ID` | Issued by Midtrans |
| `X-DEVICE-ID` | Device identifier |
| `X-EXTERNAL-ID` | Unique idempotency key per request |
| `CHANNEL-ID` | Distribution channel ID |

**Credentials:** X-CLIENT-KEY and X-CLIENT-SECRET from Midtrans. Merchant generates RSA key pair; registers public key with Midtrans.

---

### 2.3 GoBiz Direct API — OAuth2 Client Credentials

**Token endpoint:** `POST https://integration-goauth.gojekapi.com/oauth2/token`

```
// Request body (form-encoded)
grant_type=client_credentials&client_id=<id>&client_secret=<secret>
```

```json
// Response
{ "access_token": "...", "token_type": "Bearer", "expires_in": 3600 }
```

- Token expires in **1 hour**; no refresh token — re-request on `401`.

---

### 2.4 Environments

| Environment | Midtrans Base URL | GoBiz Base URL |
|---|---|---|
| Sandbox | `https://api.sandbox.midtrans.com/` | `https://api.sandbox.gobiz.co.id` |
| Production | `https://api.midtrans.com/` | ⚠️ Not specified |

**Sandbox GoPay test credentials:** PIN `112233`, OTP `987654`

---

## 3. Auto-Debit API

### Availability: **YES**

Via GoPay Tokenization (account linking) + Subscription API.

> **Activation required** — both GoPay Tokenization and Subscription API must be explicitly activated. Contact your Midtrans Sales PIC. Pre-Auth requires separate activation.

---

### 3.1 Account Linking Flow (User Consent)

#### Step 1 — Create Pay Account

```
POST https://api.sandbox.midtrans.com/v2/pay/account
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

**Customer consent flow:** receive link → enter OTP → enter PIN → scan QR in Gojek app → redirect back.

> Session timeout: **1 hour**. After timeout `account_status` becomes `EXPIRED`.

#### Step 2 — Get Pay Account (retrieve token)

```
GET https://api.sandbox.midtrans.com/v2/pay/account/{account_id}
```

```json
// Response
{
  "account_status": "ENABLED",
  "metadata": {
    "payment_options": [
      {
        "name": "GOPAY_WALLET",
        "active": true,
        "balance": { "value": "8000000.00", "currency": "IDR" },
        "token": "c3ed4a3b-f14c-4d1d-aad2-abcdef123456"
      }
    ]
  }
}
```

| `account_status` | Meaning |
|---|---|
| `PENDING` | Customer has not completed consent |
| `ENABLED` | Active; token is usable |
| `DISABLED` | Unlinked |
| `EXPIRED` | Session timed out |

#### Step 3 — Unbind Pay Account

```
POST https://api.sandbox.midtrans.com/v2/pay/account/{account_id}/unbind
```

> Midtrans auto-sends an unbind webhook if the customer changes their PIN or phone number in the Gojek app.

---

### 3.2 Subscription API Endpoints

| Operation | Method | Path |
|---|---|---|
| Create Subscription | `POST` | `/v1/subscriptions` |
| Get Subscription | `GET` | `/v1/subscriptions/{id}` |
| Update Subscription | `PATCH` | `/v1/subscriptions/{id}` |
| Enable Subscription | `POST` | `/v1/subscriptions/{id}/enable` |
| Disable Subscription | `POST` | `/v1/subscriptions/{id}/disable` |

**Create Subscription request:**

```json
{
  "name": "MONTHLY_SUBSCRIPTION_2024",
  "amount": "14000",
  "currency": "IDR",
  "payment_type": "gopay",
  "token": "<token_from_get_pay_account>",
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

---

### 3.3 Direct Debit (One-Off on Linked Account)

| Mode | Description | Activation |
|---|---|---|
| Standard Direct Debit | Immediate single charge | Standard tokenization activation |
| Pre-Auth | Authorize hold → capture separately | Requires separate Sales rep activation |

⚠️ Full request schemas — see [docs.midtrans.com/reference/direct-debit-api-gopay-tokenization](https://docs.midtrans.com/reference/direct-debit-api-gopay-tokenization)

---

### 3.4 Webhooks

**Signature verification:** `SHA512(order_id + status_code + gross_amount + ServerKey)`

Retry policy: up to 3 attempts (20ms → 40ms → 80ms). Return `200 OK` promptly.

---

### 3.5 Transaction Limits

| Account Type | Per-Transaction Limit |
|---|---|
| GoPay (non-KYC) | IDR 2,000,000 |
| GoPay (KYC-verified) | IDR 20,000,000 |
| GoPayLater | IDR 3,000,000 |

---

### 3.6 Error & Response Codes

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
| `transaction_status: settlement` | Successful, settled | Subscription/Direct Debit |
| `transaction_status: authorize` | Pre-Auth hold placed | Pre-Auth only |
| `transaction_status: deny` | Charge rejected | Direct Debit |
| `transaction_status: expire` | Customer timed out | Direct Debit |

---

## 4. Summary & Key Takeaways

**Integration path decision tree:**
```
GoBiz/Gojek merchant? → YES → GoBiz Direct API (OAuth2)
                      → NO  → Midtrans
                               Need auto-debit? → YES → GoPay Tokenization BI-SNAP + Subscription API
                                               → NO  → Midtrans Core API (Basic Auth)
```

**Pre-integration checklist:**
- [ ] Obtain Sandbox Server Key + Client Key from Midtrans Dashboard
- [ ] For BI-SNAP: generate RSA key pair, register public key with Midtrans
- [ ] Contact Midtrans Sales PIC to **activate GoPay Tokenization / auto-debit**
- [ ] Contact Midtrans Sales PIC to **activate Subscription API** (separate activation)
- [ ] Configure webhook URL; implement **SHA512 signature verification**

**Key technical points:**
1. BI-SNAP tokens expire in **15 min** — implement proactive refresh
2. GoBiz tokens expire in **1 hour** with no refresh token — re-authenticate on `401`
3. Linking sessions expire after **1 hour** — re-initiate if expired
4. Handle **unbind webhooks** asynchronously — customer PIN/phone changes auto-unlink accounts
5. KYC status affects transaction caps (IDR 2M vs IDR 20M)
6. Use **separate Server Keys** per environment — `401` almost always means key/environment mismatch

---

## 5. References

| # | Source |
|---|---|
| 1 | [Midtrans — API Authorization Headers](https://docs.midtrans.com/docs/api-authorization-headers) |
| 2 | [Midtrans — GoPay Tokenization BI-SNAP Overview](https://docs.midtrans.com/reference/gopay-tokenization-1) |
| 3 | [Midtrans — GoPay Tokenization](https://docs.midtrans.com/reference/gopay-tokenization) |
| 4 | [Midtrans — Create Pay Account](https://docs.midtrans.com/reference/create-pay-account) |
| 5 | [Midtrans — Get Pay Account](https://docs.midtrans.com/reference/get-pay-account) |
| 6 | [Midtrans — Unbind Pay Account](https://docs.midtrans.com/reference/unbind-pay-account) |
| 7 | [Midtrans — Access Token API (BI-SNAP)](https://docs.midtrans.com/reference/access-token-api) |
| 8 | [Midtrans — Direct Debit API](https://docs.midtrans.com/reference/direct-debit-api-gopay-tokenization) |
| 9 | [Midtrans — Pre-Auth Payment API](https://docs.midtrans.com/reference/auth-payment-api-gopay-tokenization) |
| 10 | [Midtrans — Create Subscription](https://docs.midtrans.com/reference/create-subscription) |
| 11 | [Midtrans — Get Subscription](https://docs.midtrans.com/reference/get-subscription) |
| 12 | [Midtrans — Update Subscription](https://docs.midtrans.com/reference/update-subscription) |
| 13 | [Midtrans — Sandbox Testing (GoPay BI-SNAP)](https://docs.midtrans.com/reference/testing-gopay-tokenization-bi-snap-on-sandbox) |
| 14 | [Midtrans — Account Linking/Unlinking Notification](https://docs.midtrans.com/reference/account-linking-unlinking-notification) |
| 15 | [Midtrans — Webhooks](https://docs.midtrans.com/docs/https-notification-webhooks) |
| 16 | [Midtrans — Error Codes](https://docs.midtrans.com/docs/error-code-and-response-code) |
| 17 | [Midtrans — GoPay Response Codes](https://docs.midtrans.com/reference/gopay-response-codes) |
| 18 | [Midtrans — Subscription API Improvements (Aug 2023)](https://docs.midtrans.com/changelog/august-15th-subscription-api-improvements) |
| 19 | [GoBiz — Direct Integration Auth](https://developer.gobiz.com/docs/api/auth/direct-integration/) |
| 20 | [GoBiz — Create Transaction](https://developer.gobiz.com/docs/api/payment-integration/create-transaction/) |
| 21 | [PPRO Developer Hub — GoPay Indonesia](https://developerhub.ppro.com/simple-api/docs/gopay-by-gojek-indonesia) |
| 22 | [Adyen — GoPay API Only](https://docs.adyen.com/payment-methods/gopay/api-only/) |
