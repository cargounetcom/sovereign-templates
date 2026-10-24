import crypto from 'node:crypto';

// Sovereign unified payments through a self-hosted Hyperswitch orchestrator — one API
// that routes to every connected provider (Stripe, PayPal, Adyen, …).
//
//   POST /payments   { product_id } -> price/currency read from the Appwrite DB (never
//                     the caller), fee = round(gross * FEE_BPS/10000) + FEE_FLAT_CENTS
//                     (guarded fee <= gross), then a Hyperswitch payment is created.
//   POST /webhook    Hyperswitch status webhook, HMAC-SHA256 over "{timestamp}.{raw_body}".
//
// Lessons ported from aionflow: price only from the DB, HMAC-verify before touching
// state, and fee <= gross (the P0 there was a negative payout when fee exceeded gross).

const required = [
  'HYPERSWITCH_URL',
  'HYPERSWITCH_API_KEY',
  'WEBHOOK_SECRET',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_COLLECTION_ID',
];

export function computeFee(grossCents, feeBps, feeFlatCents) {
  const pct = Math.round((grossCents * feeBps) / 10000);
  const fee = pct + feeFlatCents;
  return fee > grossCents ? grossCents : fee; // guard fee <= gross
}

async function appwriteFetch(req, path, options = {}) {
  const res = await fetch(`${process.env.APPWRITE_FUNCTION_API_ENDPOINT}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-appwrite-key': req.headers['x-appwrite-key'] ?? '',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Appwrite ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function hyperswitchFetch(path, options = {}) {
  const url = `${process.env.HYPERSWITCH_URL.replace(/\/+$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'api-key': process.env.HYPERSWITCH_API_KEY,
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new Error(`Hyperswitch ${path} -> ${res.status} ${text}`);
  return json;
}

function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (typeof req.bodyText === 'string') return req.bodyText;
  return JSON.stringify(req.bodyJson ?? {});
}

export default async ({ req, res, log, error }) => {
  try {
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      return res.json({ ok: false, error: `Missing env: ${missing.join(', ')}` }, 400);
    }

    if (req.path === '/webhook') {
      const sigHeader = process.env.WEBHOOK_SIGNATURE_HEADER ?? 'x-signature';
      const tsHeader = process.env.WEBHOOK_TIMESTAMP_HEADER ?? 'x-timestamp';
      const signature = String(req.headers[sigHeader] ?? '');
      const timestamp = String(req.headers[tsHeader] ?? '');
      const raw = rawBody(req);
      const expected = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(`${timestamp}.${raw}`)
        .digest('hex');
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(signature, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.json({ ok: false, error: 'signature mismatch' }, 403);
      }
      log('verified Hyperswitch webhook');
      return res.json({ ok: true });
    }

    if (req.path !== '/payments') {
      return res.json({ ok: false, error: 'Use POST /payments or POST /webhook' }, 404);
    }

    const body = req.bodyJson ?? {};
    const productId = String(body.product_id ?? '');
    if (!productId) {
      return res.json({ ok: false, error: 'product_id is required' }, 400);
    }

    const product = await appwriteFetch(
      req,
      `/databases/${process.env.APPWRITE_DATABASE_ID}/collections/${process.env.APPWRITE_COLLECTION_ID}/documents/${productId}`
    );

    const amountField = process.env.AMOUNT_FIELD ?? 'amount';
    const currencyField = process.env.CURRENCY_FIELD ?? 'currency';
    const amount = Number(product[amountField]);
    const currency = String(product[currencyField] ?? 'USD');
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.json({ ok: false, error: `invalid amount in product ${productId}` }, 400);
    }

    const feeBps = Number(process.env.FEE_BPS ?? 280);
    const feeFlat = Number(process.env.FEE_FLAT_CENTS ?? 60);
    const fee = computeFee(amount, feeBps, feeFlat);
    const net = amount - fee;
    log(`product=${productId} amount=${amount} fee=${fee} net=${net}`);

    const payment = await hyperswitchFetch('/payments', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency,
        confirm: false,
        metadata: { product_id: productId, fee, net, fee_bps: feeBps, fee_flat: feeFlat },
      }),
    });

    return res.json({ ok: true, payment, fee, net });
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
