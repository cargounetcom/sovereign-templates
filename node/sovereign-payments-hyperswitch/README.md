# ⚡ Node.js Unified Payments (Hyperswitch) Function

Creates payments through a **self-hosted [Hyperswitch](https://github.com/juspay/hyperswitch)**
orchestrator — one API that routes to every connected provider (Stripe, PayPal, Adyen, …).
Price and currency come from the Appwrite DB, never from the caller, and the commission
is configurable (default **2.8 % + 0.60**, with a `fee ≤ gross` guard).

## 🧰 Usage

### POST /payments

Creates a Hyperswitch payment for a product.

**Body**

```json
{ "product_id": "612a3...5b6c9" }
```

**Response**

Sample `200` Response:

```json
{ "ok": true, "payment": { "payment_id": "pay_…", "status": "requires_confirmation" }, "fee": 340, "net": 99660 }
```

### POST /webhook

Receives Hyperswitch status updates. Verified with HMAC-SHA256 over `{timestamp}.{raw_body}`.

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 30            |
| Scope             | `databases.read` |

## 🔒 Environment Variables

### HYPERSWITCH_URL / HYPERSWITCH_API_KEY

Base URL and merchant API key of the self-hosted Hyperswitch.

| Question      | Answer                     |
| ------------- | -------------------------- |
| Required      | Yes                        |
| Sample Value  | `https://pay.example.com` / `snd_...` |

### WEBHOOK_SECRET

Shared secret used to verify the Hyperswitch webhook HMAC.

| Question      | Answer        |
| ------------- | ------------- |
| Required      | Yes           |
| Sample Value  | `your-secret` |

### APPWRITE_DATABASE_ID / APPWRITE_COLLECTION_ID

Appwrite database + collection that holds the products. Each product document must have
an integer `amount` (minor units) and a `currency` string.

| Question      | Answer     |
| ------------- | ---------- |
| Required      | Yes        |
| Sample Value  | `612a3...` / `7c3e8...` |

### FEE_BPS / FEE_FLAT_CENTS

Commission. `FEE_BPS` is basis points (default `280` = 2.8 %); `FEE_FLAT_CENTS` is the
flat fee in minor units (default `60`). Set both to `0` for 0 % pass-through.

| Question      | Answer |
| ------------- | ------ |
| Required      | No     |
| Sample Value  | `280` / `60` |

### WEBHOOK_SIGNATURE_HEADER / WEBHOOK_TIMESTAMP_HEADER

Header names Hyperswitch uses for the webhook signature and timestamp (defaults
`x-signature` / `x-timestamp`).

| Question      | Answer          |
| ------------- | --------------- |
| Required      | No              |
| Sample Value  | `x-signature` / `x-timestamp` |
