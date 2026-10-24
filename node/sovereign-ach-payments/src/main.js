import Stripe from 'stripe';

// Stripe ACH (bank debit) payments. ACH settles asynchronously (can take days and can
// be returned later), so the webhook handles payment_intent.processing / succeeded /
// payment_failed, and the signature is verified before anything else.
//
//   POST /create   { amount, currency?, metadata? } -> PaymentIntent (us_bank_account)
//   POST /webhook  Stripe webhook (Stripe-Signature header verified)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function rawBody(req) {
  if (typeof req.bodyText === 'string') return req.bodyText;
  if (typeof req.body === 'string') return req.body;
  return JSON.stringify(req.bodyJson ?? {});
}

export default async ({ req, res, log, error }) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.json({ ok: false, error: 'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required' }, 500);
    }

    if (req.path === '/webhook') {
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = stripe.webhooks.constructEvent(rawBody(req), sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        return res.json({ ok: false, error: `signature: ${err.message}` }, 400);
      }
      switch (event.type) {
        case 'payment_intent.processing':
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
          log(`stripe ${event.type} ${event.data.object.id}`);
          break;
        default:
          log(`stripe ignored ${event.type}`);
      }
      return res.json({ ok: true, type: event.type });
    }

    if (req.path === '/create') {
      const body = req.bodyJson ?? {};
      const amount = Number(body.amount);
      const currency = String(body.currency ?? 'usd');
      if (!Number.isInteger(amount) || amount <= 0) {
        return res.json({ ok: false, error: 'invalid amount' }, 400);
      }
      const pi = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ['us_bank_account'],
        payment_method_options: { us_bank_account: { verification_method: 'instant' } },
        metadata: body.metadata ?? {},
      });
      return res.json({ ok: true, id: pi.id, client_secret: pi.client_secret });
    }

    return res.json({ ok: false, error: 'Use POST /create or POST /webhook' }, 404);
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
