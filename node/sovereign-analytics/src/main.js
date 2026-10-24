// Forward product events to a self-hosted PostHog instance.
//
//   POST /capture  -> single event  { event, distinct_id, properties?, timestamp? }
//   POST /batch    -> many events   [{ event, distinct_id, ... }, ...] or { batch: [...] }
//
// Set AUTH_TOKEN to require `Authorization: Bearer <AUTH_TOKEN>` on every call.

async function posthog(path, body) {
  const host = process.env.POSTHOG_HOST.replace(/\/+$/, '');
  const res = await fetch(`${host}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PostHog -> ${res.status} ${text}`);
  return text;
}

export default async ({ req, res, log, error }) => {
  try {
    if (!process.env.POSTHOG_HOST || !process.env.POSTHOG_API_KEY) {
      return res.json({ ok: false, error: 'Missing POSTHOG_HOST or POSTHOG_API_KEY' }, 400);
    }

    if (
      process.env.AUTH_TOKEN &&
      req.headers['authorization'] !== `Bearer ${process.env.AUTH_TOKEN}`
    ) {
      return res.json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = req.bodyJson ?? {};

    if (req.path === '/capture') {
      const out = await posthog('/capture', {
        api_key: process.env.POSTHOG_API_KEY,
        event: body.event,
        distinct_id: body.distinct_id,
        properties: body.properties ?? {},
        timestamp: body.timestamp,
      });
      log(`captured event "${body.event}"`);
      return res.json({ ok: true, response: out });
    }

    if (req.path === '/batch') {
      const events = Array.isArray(body) ? body : body.batch;
      if (!Array.isArray(events) || events.length === 0) {
        return res.json({ ok: false, error: 'batch must be a non-empty array' }, 400);
      }
      const out = await posthog('/batch', {
        api_key: process.env.POSTHOG_API_KEY,
        batch: events,
      });
      log(`captured ${events.length} events`);
      return res.json({ ok: true, response: out });
    }

    return res.json({ ok: false, error: 'Use POST /capture or POST /batch' }, 404);
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
