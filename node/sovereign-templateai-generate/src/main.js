// Proxy to the templateai generator (OpenDesign fork).
//
//   POST /generate   { stack, name, description?, features?, token? } -> { files, setup, description }
//
// `stack` must be one of: nextjs | wordpress | shopify | medusa | sanity | html.
// The license token is injected from TEMPLATEAI_TOKEN when the caller does not send one.

const STACKS = ['nextjs', 'wordpress', 'shopify', 'medusa', 'sanity', 'html'];

export default async ({ req, res, log, error }) => {
  try {
    if (!process.env.TEMPLATEAI_URL) {
      return res.json({ ok: false, error: 'TEMPLATEAI_URL is required' }, 500);
    }
    if (req.path !== '/generate') {
      return res.json({ ok: false, error: 'Use POST /generate' }, 404);
    }
    const body = req.bodyJson ?? {};
    const stack = String(body.stack ?? '');
    if (!STACKS.includes(stack)) {
      return res.json({ ok: false, error: `Unknown stack — choose one of: ${STACKS.join(', ')}` }, 400);
    }

    const base = process.env.TEMPLATEAI_URL.replace(/\/+$/, '');
    const r = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: process.env.TEMPLATEAI_TOKEN ?? body.token ?? '',
        stack,
        name: body.name,
        description: body.description,
        features: Array.isArray(body.features) ? body.features : [],
      }),
    });

    const text = await r.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* non-JSON */
    }
    if (!r.ok) {
      return res.json({ ok: false, error: json.error ?? `templateai ${r.status}` }, r.status);
    }
    log(`generated ${stack} project`);
    return res.json({ ok: true, ...json });
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
