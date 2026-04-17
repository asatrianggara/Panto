# OVO Indonesia E-Wallet API — Technical Research Document

## 1. Overview

OVO is one of Indonesia's leading e-wallet providers, regulated by Bank Indonesia (BI) as a licensed e-money issuer. Its partner-facing integration follows the **BI SNAP (Standar Nasional Open API Pembayaran)** standard, which mandates dual-layer cryptographic signing and OAuth 2.0-style user authorization for all payment and direct debit operations.

This document covers:

- Native OVO partner API authentication, credential lifecycle, and environment configuration
- Native auto-debit (direct debit) API endpoints, binding flows, and execution patterns
- Third-party payment gateway integrations that expose OVO recurring/auto-debit capabilities
- Error codes, webhook behavior, limitations, and merchant tier requirements

**Integration paths available:**

| Path | Complexity | Recurring Support | NDA Required |
|---|---|---|---|
| OVO Native Partner API (SNAP) | High | Yes (with OVO Security Team approval) | Yes |
| Xendit tokenized MIT | Medium | Yes (approval required) | No (via Xendit) |
| DOKU OVO Open API | Medium | Yes (1-year token) | No (via DOKU) |
| ESPAY OVO Binding | Medium | Yes (push-to-pay) | No (via ESPAY) |
| Midtrans | Low | No native OVO recurring | No |
| PPRO | Low | No | No |

---

## 2. Authorization & Authentication

### 2.1 Native OVO API Auth

OVO's native Partner Integration API uses a **multi-layer authentication scheme** compliant with BI SNAP.

#### Authentication Layers

| Layer | Method | Usage |
|---|---|---|
| System token (B2B) | Asymmetric RSA — SHA256withRSA with private key | Signing token-request headers |
| Transactional APIs | Symmetric HMAC — HMAC-SHA512 with client secret | Signing every payment/binding request |
| User-linked sessions | OAuth 2.0-style Bearer token (B2B2C) | All debit/balance APIs that touch a user account |

#### Required Credentials

| Credential | Description |
|---|---|
| `Client ID` | Also referred to as `X-CLIENT-KEY` / `X-PARTNER-ID` |
| `Client Secret` | Used as the HMAC-SHA512 key for transactional request signing |
| Private Key | PKCS1 format, RSA 4096-bit — used for asymmetric B2B token request signing |
| Public Key | PKCS1 + X.509 formats — shared with OVO for credential exchange and signature validation |

#### Key Generation

```bash
# X.509 public key (for credential sharing with OVO):
openssl genrsa -des3 -out id_rsa.pem 2048
openssl rsa -in id_rsa.pem -outform PEM -pubout -out id_rsa.pub.pem

# PKCS1 private/public key pair (for signature generation):
openssl genrsa -traditional -out private.pem 4096
openssl rsa -in private.pem -RSAPublicKey_out -out public.pem
```

#### Onboarding Process

1. Submit merchant registration at [ovo.id/partnership](https://www.ovo.id/partnership) — email: [email protected]
2. Individual merchants: register via GrabMerchant app (OVO is Grab-backed)
3. Company/API partners: submit business documents via email — KTP, NPWP, SIUP, deed of incorporation, bank account details, power of attorney
4. OVO reviews submission; partner signs NDA (**prerequisite before technical documentation is shared**)
5. Partner provides both public keys (X.509 + PKCS1) and callback URLs for staging
6. OVO provides an encrypted credentials file (AES-256-CBC + RSA-encrypted key); partner decrypts:

```bash
# Step 1 — Decrypt the AES key using RSA private key:
openssl rsautl -decrypt -inkey id_rsa.pem -in key.bin.enc -out key.bin

# Step 2 — Decrypt the credentials file using the AES key:
openssl enc -d -aes-256-cbc -in cred_file.enc -out cred_file.txt \
  -pass file:./key.bin -md sha256
```

7. UAT and BI submission processes are completed; production credentials are issued
   - ⚠️ SLA for production credential issuance: up to 3 working days
8. UI/UX review: OVO reviews merchant app mockups before UAT approval

#### Token Lifecycle

| Token Type | Endpoint | Expiry | Refresh Strategy |
|---|---|---|---|
| B2B Token (system/machine-to-machine) | `POST /OVOSNAP/v3.0/access-token/b2b` | **15 minutes** (BI-mandated 900s) | Re-generate with same asymmetric flow |
| B2B2C Token (user-linked access token) | `POST /OVOSNAP/v3.0/access-token/b2b2c` | **15 days** (1,296,000s) | `grantType: refresh_token` with stored refresh token |
| Refresh Token | Same B2B2C endpoint | **Indefinite** (no expiry) | Used to renew the B2B2C access token |

**Recommendation:** Cache and reuse the B2B token for its full 15-minute window — do not regenerate on every request.

**Token invalidation triggers:**
- Customer unlinks their account in the OVO app
- Customer changes their phone number in the OVO app
- Refresh token call itself returns `401`

**Refresh flow:**
- On `OV00502` or `401XX00` → call B2B2C token endpoint with `grantType: refresh_token`
- If refresh itself fails with `401` → revoke all tokens, mark customer as unlinked, require full re-binding

#### Environments

| Environment | Base URL |
|---|---|
| Staging / Sandbox | `https://app.byte-stack.net` |
| Production | `https://apigw.ovo.id` |

#### Required Headers in Every Authenticated Request

```http
Content-Type: application/json
Authorization: Bearer {accessToken}
X-PARTNER-ID: {clientId}
X-CLIENT-KEY: {clientId}
X-TIMESTAMP: yyyy-MM-ddTHH:mm:ss.SSSTZD
X-SIGNATURE: {signature}
X-EXTERNAL-ID: {uniqueId}
X-DEVICE-ID: {deviceId}
CHANNEL-ID: {channelId}
```

#### Signature Construction

**B2B token requests (asymmetric RSA):**
```
StringToSign = clientID + "|" + timestamp
X-SIGNATURE   = Base64(SHA256withRSA(PrivateKey, StringToSign))
```

**Transactional APIs (symmetric HMAC-SHA512):**
```
StringToSign = HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":"
             + Lowercase(HexEncode(SHA-256(minify(RequestBody)))) + ":" + Timestamp
X-SIGNATURE   = Base64(HMAC-SHA512(ClientSecret, StringToSign))
```

---

### 2.2 Auth via Payment Gateways

🔗 The following gateways abstract OVO's native auth behind their own credential and signing schemes. Merchants authenticate to the gateway only — the gateway handles OVO-side auth internally.

| Gateway | OVO Integration Type | Auth Method (Gateway Layer) | Recurring / Auto-Debit Support |
|---|---|---|---|
| Xendit | Native e-wallet charge + tokenization | API Key (Basic Auth — key as username) | Yes — tokenized MIT |
| DOKU (Jokul) | OVO Open API (non-SNAP) + SNAP variant | HMAC-SHA256 (`Client-Id` + `Request-Id` + `Signature`) | Yes — 1-year token |
| NICEPAY | Push-notification e-wallet | NICEPAY API key + signature | ⚠️ Not documented publicly |
| Midtrans | OVO via QRIS (not direct OVO API) | Midtrans Server Key (Basic Auth) | No native OVO recurring |
| ESPAY | OVO direct debit binding | Basic Auth (`Authorization: Basic Base64(user:pass)`) | Yes — via `pushtopay` after binding |
| Faspay | OVO push-to-pay (Direct Page) | `SHA1(MD5(user_id.password.trx_id))` | ⚠️ Not documented |
| PPRO | OVO redirect payment | PPRO OAuth2 | No — explicitly "Recurring payments: No" |

---

## 3. Auto-Debit API

### 3.1 Native Auto-Debit

#### Availability

**Yes.** OVO's native SNAP-compliant API supports auto-debit via the **Direct Debit (Payment Host-to-Host)** endpoint using `subTransactionType: "AUTO"`. This requires:
- Explicit approval from **OVO's Security Team**
- **Merchant ID whitelisting** by OVO (requested separately from standard onboarding)

#### Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Check user status | `GET` | `/user/v2/account/lookup?phone={msisdn}` |
| Account binding | `POST` | `/v3.0/registration-account-binding` |
| Account unbinding | `POST` | `/v3.0/registration-account-unbinding` |
| B2B token (system) | `POST` | `/OVOSNAP/v3.0/access-token/b2b` |
| B2B2C token (user) | `POST` | `/OVOSNAP/v3.0/access-token/b2b2c` |
| **Direct debit / auto-debit** | `POST` | `/OVOSNAP/v3.0/debit/payment-host-to-host` |
| Check debit status | `POST` | `/OVOSNAP/v3.0/debit/status` |
| Refund | `POST` | `/OVOSNAP/v3.0/debit/refund` |
| Balance inquiry | `POST` | `/OVOSNAP/v3.0/balance-inquiry` |

#### Auto-Debit Request Payload

```json
{
  "partnerReferenceNo": "unique-txn-id",
  "chargeToken": "OVO",
  "merchantId": "your-merchant-id",
  "subTransactionType": "AUTO",
  "payOptionDetails": [
    {
      "payMethod": "CASH",
      "payOption": "OVO",
      "transAmount": {
        "value": "10000.00",
        "currency": "IDR"
      }
    }
  ]
}
```

| `subTransactionType` | Behavior | Requirement |
|---|---|---|
| `"MANUAL"` | PIN required per transaction (default) | No special approval |
| `"AUTO"` | PIN-less debit; no user interaction at charge time | OVO Security Team approval + whitelist |

| `payMethod` | Behavior |
|---|---|
| `"CASH"` | Deducts from OVO Cash balance |
| `"POINTS"` | OVO Points deducted first; remainder from OVO Cash |

**Success response code:** `2005400`

#### User Consent / Account Linking Flow

```
Step 1 — Check user status
GET /user/v2/account/lookup?phone=08xxxxxxxxxx
  → ACTIVE | ACTIVE_NO_PIN | CAN_REGISTER | BLOCKED_MSISDN | LINKED

Step 2 — Initiate binding
POST /v3.0/registration-account-binding
  Body: { phoneNo, custIdMerchant, customerName, email,
          successRegistrationUrl, failedRegistrationUrl }
  → Returns: { linkageToken (JWT), redirectUrl, referenceNo }

Step 3 — Redirect user to OVO WebView
  → User enters PIN or biometric authentication

Step 4 — OVO redirects back to successRegistrationUrl
  → ?authCode=xxxxx&state=yyy&displayMessage=SUCCESS
  → Error: ?errorResponse={"code":"OV00006","state":"1234"}

Step 5 — Exchange authCode for user token
POST /OVOSNAP/v3.0/access-token/b2b2c
  Body: { grantType: "authorization_code", authCode: "xxxxx" }
  → Returns: { accessToken, refreshToken, tokenExpiresIn: 1296000, ilp }

Step 6 — Store securely
  accessToken  → 15 days; used for debit calls
  refreshToken → indefinite; renews access token
  ilp          → stable cross-merchant user identifier (one per customer-merchant pair)
```

**Constraint:** Each OVO account can only be bound to one customer per merchant.

#### End-to-End Debit Execution Flow

```
[SETUP — One time per merchant]
1. Generate RSA key pair; share public keys + callback URLs with OVO
2. Decrypt OVO-provided credentials file; securely store Client ID + Secret
3. Integrate account binding UI

[ACCOUNT LINKING — One time per user]
4.  GET  /user/v2/account/lookup → validate user phone
5.  POST /v3.0/registration-account-binding → get redirectUrl
6.  Redirect user → user enters PIN/biometric in OVO WebView
7.  Receive authCode via callback
8.  POST /OVOSNAP/v3.0/access-token/b2b2c → get accessToken + refreshToken + ilp
9.  Store tokens securely

[DEBIT EXECUTION — Per charge]
10. POST /OVOSNAP/v3.0/access-token/b2b → get B2B system token (cache 15 min)
11. POST /OVOSNAP/v3.0/debit/payment-host-to-host
      with subTransactionType: "AUTO"
      → Success: responseCode 2005400

[RECONCILIATION]
12. POST /OVOSNAP/v3.0/debit/status → async status check

[TOKEN REFRESH]
13. On 401XX00 / OV00502 → refresh with grantType: "refresh_token"
14. If refresh fails 401 → re-binding required
```

#### Error Codes

| Code | HTTP | Meaning | Action |
|---|---|---|---|
| `2005400` | 200 | Payment success | — |
| `401XX00` | 401 | Token expired / unauthorized | Refresh token |
| `OV00502` | 401 | Unauthorized access | Refresh token |
| `4017300` | 401 | HMAC mismatch | Fix signature generation |
| `4030707` | 403 | User/card blocked | Notify user; do not retry |
| `4035414` | 403 | Insufficient funds | Notify user |
| `4047401` | 404 | Transaction not found | Query status endpoint |
| `4093800` | 409 | Duplicate `X-EXTERNAL-ID` | Generate new external ID |
| `OV00006` | — | Binding error (in redirect URL) | Re-initiate binding |

#### Webhook / Callback Mechanism

- Callbacks are **optional** for QRIS payments; **synchronous HTTP response** is primary for auto-debit
- If a callback URL is registered: OVO retries on failure — **3 attempts, 5-second interval**
- Callback payload includes: `latestTransactionStatus`, transaction ID, masked details, `gracePeriod`
- Register separate callback URLs for staging and production
- Push-to-Pay API: no webhook documented — use status polling

---

### 3.2 Auto-Debit via Payment Gateways

---

#### 🔗 Xendit — OVO Tokenized MIT

> ⚠️ Requires explicit activation approval from OVO/Xendit partnership team.

**Auth:** API Key via Basic Auth (key as username, blank password)

**Step 1 — Create Customer:**
```http
POST https://api.xendit.co/customers
{
  "reference_id": "your-customer-ref",
  "given_names": "John",
  "mobile_number": "+6287774441111",
  "email": "customer@example.com"
}
```

**Step 2 — Initialize Account Linking:**
```http
POST https://api.xendit.co/linked_account_tokens/auth
{
  "customer_id": "ba830b92-...",
  "channel_code": "ID_OVO",
  "properties": {
    "success_redirect_url": "https://your-shop.com/auth/success",
    "failure_redirect_url": "https://your-shop.com/auth/failed",
    "callback_url": "https://your-shop.com/webhook"
  }
}
```
Redirect user to `authorizer_url`; wait for `linked_account_token.successful` webhook.

**Step 3 — Create Payment Method (post-webhook):**
```http
POST https://api.xendit.co/payment_methods
{
  "customer_id": "ba830b92-...",
  "type": "EWALLET",
  "properties": { "id": "la-aa620619-..." }
}
```

**Charge saved OVO token:**
```http
POST https://api.xendit.co/ewallets/charges
{
  "reference_id": "charge-ref-001",
  "currency": "IDR",
  "amount": 50000,
  "checkout_method": "TOKENIZED_PAYMENT",
  "channel_code": "ID_OVO",
  "payment_method_id": "pm-..."
}
```

| Property | Value |
|---|---|
| Token validity | Indefinite (unless revoked) |
| Settlement | T+2 calendar days |
| Transaction limits | 100 – 20,000,000 IDR |
| Refund window | 14 days |

**Xendit error codes (OVO-specific):**

| Code | HTTP | Meaning |
|---|---|---|
| `CHANNEL_CODE_NOT_SUPPORTED_ERROR` | 400 | OVO not activated for this Xendit account |
| `INVALID_ACCOUNT_DETAILS` | 400 | Phone number mismatch |
| `ACCOUNT_ACCESS_BLOCKED` | 400 | OVO account inactive |
| `CHANNEL_UNAVAILABLE` | 503 | OVO provider downtime |
| `CUSTOMER_NOT_FOUND_ERROR` | 404 | Invalid `customer_id` |

**Webhooks:** Event-based: `linked_account_token.successful` (binding), payment outcome per charge.

---

#### 🔗 DOKU (Jokul) — OVO Open API Recurring

> ⚠️ Personal sellers (non-business) cannot use this integration.

| Environment | Base URL |
|---|---|
| Sandbox | `https://api-sandbox.doku.com` |
| Production | `https://api.doku.com` |

**Auth headers:** `Client-Id`, `Request-Id`, `Request-Timestamp`, `Signature` (HMAC-SHA256)

**Key endpoints:**

| Operation | Method | Path |
|---|---|---|
| Account binding | `POST` | `/ovo-open-api/v1/token` |
| Recurring charge | `POST` | `/ovo-open-api/v1/payment` |
| SNAP binding | `POST` | `/direct-debit/merchant/ovo/v1.0/registration-account-binding` |
| SNAP payment | `POST` | `/direct-debit/merchant/ovo/v1.0/payment-host-to-host` |
| Unlink | `POST` | `/direct-debit/ovo/v1.0/registration-account-unbinding` |

- Recurring trigger: include `"paymentType": "RECURRING"` in payment body
- Token validity: **1 year** (no PIN after initial binding)
- OVO Points deducted first, then OVO Cash

**DOKU error codes:**

| Code | HTTP | Meaning |
|---|---|---|
| `invalid_signature` | 400 | HMAC signature invalid |
| `account_error` | 400 | OVO account issue |
| `invalid_parameter` | 400 | Malformed field |
| `invalid_access` | 401 | Access violation |
| `not_found` | 404 | Resource not found |

**Webhooks:** HTTP notification to merchant-configured Notification URL after payment completion.

---

#### 🔗 ESPAY — OVO Direct Debit Binding

> ⚠️ IP whitelisting required — register server IPs with ESPAY support.

**Auth:** `Authorization: Basic Base64(username:password)`

| Environment | Binding | Push-to-Pay |
|---|---|---|
| Sandbox | `https://sandbox-api.espay.id/rest/digitalpay/binding` | `https://sandbox-api.espay.id/rest/digitalpay/pushtopay` |
| Production | `https://api.espay.id/rest/digitalpay/binding` | `https://api.espay.id/rest/digitalpay/pushtopay` |

Binding params: `product_code="OVOLINK"`, `customer_id={phone}`, `device_id`, `signature`
Returns: `webview_url` (redirect for auth), `customer_key` (16-char identifier for future calls)

Charge params: `customer_key`, `order_id`, `amount`, `payment_method={"cash":"1000"}`

---

## 4. Comparison Summary

| Dimension | OVO Native (SNAP) | 🔗 Xendit | 🔗 DOKU | 🔗 ESPAY |
|---|---|---|---|---|
| Auth complexity | High (RSA + HMAC-SHA512 + OAuth 2.0) | Low (API Key) | Medium (HMAC-SHA256) | Low (Basic Auth) |
| Auto-debit support | Yes (OVO Security Team approval) | Yes (OVO/Xendit approval) | Yes (business only) | Yes (IP whitelist) |
| Token validity | 15 days (access) / indefinite (refresh) | Indefinite | 1 year | Session-based |
| PIN at charge time | No (AUTO mode, post-approval) | No (tokenized MIT) | No (after binding) | No (after binding) |
| NDA required | **Yes** — before any technical docs | No | No | No |
| Sandbox available | Yes (`app.byte-stack.net`) | Yes | Yes (`api-sandbox.doku.com`) | Yes (`sandbox-api.espay.id`) |
| Ease of integration | Low | High | Medium | Medium |
| Settlement | ⚠️ Not publicly specified | T+2 calendar days | ⚠️ Not specified | ⚠️ Not specified |
| Transaction limits | Non-KYC: 2M IDR / KYC: 10M IDR | 100 – 20,000,000 IDR | ⚠️ Not specified | ⚠️ Not specified |
| Webhook support | Yes (optional; 3 retries, 5s interval) | Yes (event-based) | Yes (HTTP notify) | ⚠️ Not documented |

---

## 5. Key Takeaways & Recommendations

1. **Native OVO is most capable but operationally the heaviest path.** Requires NDA, UI/UX review, bilateral key exchange, and a separate OVO Security Team approval for PIN-less AUTO mode. Budget several weeks for onboarding.

2. **Xendit is the fastest path to OVO recurring in production.** Well-documented, abstracted auth, indefinite token validity. Key constraint: confirm tokenized MIT activation with your Xendit account manager before committing.

3. **DOKU is a strong alternative to Xendit.** One-year token is practical for most subscription use cases. Firm exclusion of personal/non-business sellers must be checked during merchant onboarding screening.

4. **ESPAY is viable but carries deployment risk.** IP whitelisting is incompatible with dynamic-IP cloud/container environments. Confirm static IP availability in your infrastructure first.

5. **Avoid Midtrans and PPRO for recurring OVO.** Midtrans routes OVO via QRIS (not direct debit); PPRO explicitly documents recurring payments as unsupported.

6. **Token refresh handling is critical.** Implement `refresh_token` grant type and handle `401XX00` / `OV00502` errors silently. If refresh fails, surface re-binding gracefully in the UI.

7. **Always use unique `X-EXTERNAL-ID` per request** in native OVO. Duplicates cause `4093800` conflict errors — use UUID or timestamp+reference combinations.

8. **⚠️ Rate limits are not publicly documented** by OVO or any major gateway. Implement exponential backoff and circuit-breaker patterns defensively, and negotiate explicit quota limits with your account manager before production launch.

---

## 6. References

| # | Source | URL |
|---|---|---|
| 1 | OVO Partner Integration — Payment API Tech Doc | https://ovo.id/partner-integration/payment-api/tech-doc |
| 2 | OVO Partner Integration — Push-to-Pay High-Level | https://www.ovo.id/partner-integration/push-to-pay/integration-high-level |
| 3 | OVO SNAP Dynamic QRIS Tech Doc | https://www.ovo.id/partner-integration/dynamic-qris/tech-doc |
| 4 | OVO Payment API Additional Guidance | https://ovo.id/partner-integration/payment-api/additional-guidance |
| 5 | OVO Partnership Page | https://www.ovo.id/partnership |
| 6 | OVO Consumer Topup Tech Doc (Staging Mirror) | https://web.byte-stack.net/partner-integration/consumer-topup/tech-doc |
| 7 | Xendit OVO Docs | https://docs.xendit.co/docs/ovo |
| 8 | Xendit Linked Account Token API | https://archive.developers.xendit.co/api-reference/ewallets/tokenization/ |
| 9 | DOKU OVO Open API (non-SNAP archive) | https://developers.doku.com/archive/non-snap/e-wallet/ovo-open-api |
| 10 | DOKU OVO Open API (SNAP variant archive) | https://developers.doku.com/archive/snap/e-wallet/ovo-open-api |
| 11 | DOKU OVO Recurring Guide | https://dashboard.doku.com/docs/docs/jokul-direct/e-money/ovo-recurring/ |
| 12 | ESPAY OVO Binding & Auto-debit | https://sandbox-kit.espay.id/docs/v2/docespay/binding.php |
| 13 | PPRO OVO Docs | https://developerhub.ppro.com/global-api/docs/ovo |
| 14 | Faspay OVO Direct Page Guide | https://docs.faspay.co.id/merchant-integration/api-reference-1/debit-transaction/e-money-channel-integration-guide/ovo-direct-page |
| 15 | NICEPAY OVO E-Wallet | https://docs.nicepay.co.id/en/e-wallet-ovo |

---

*Document compiled from public API documentation and partner integration guides. Access date: 2026-04-17. All findings marked ⚠️ are unverified or uncertain. All findings marked 🔗 describe gateway-specific behavior, not native OVO API behavior.*
