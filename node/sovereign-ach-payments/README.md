# ⚡ Node.js Stripe ACH Payments Function

Stripe **ACH (bank debit)** payments. ACH settles asynchronously and can be returned
later, so this template creates a `us_bank_account` PaymentIntent and handles the
`payment_intent.*` webhooks with a signature-verified webhook.

## 🧰 Usage

### POST /create

Creates a PaymentIntent for ACH.

**Body**

```json
{ "amount": 5000, "currency": "usd", "metadata": { "order_id": "42" } }
```

### POST /webhook

Stripe webhook endpoint. The `Stripe-Signature` header is verified.

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 30            |

## 🔒 Environment Variables

### STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET

Stripe secret key and the webhook signing secret.

| Question      | Answer        |
| ------------- | ------------- |
| Required      | Yes           |
| Sample Value  | `sk_test_...` / `whsec_...` |
