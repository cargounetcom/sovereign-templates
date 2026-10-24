// DocuSeal (self-hosted, AGPL-3.0) e-signature integration.
//
//   POST /create   { template_id, email, name } -> create a DocuSeal submission
//   POST /webhook  DocuSeal submission.completed -> fetch the signed document and
//                  store it in Appwrite Storage.

const required = ['DOCUSEAL_URL', 'DOCUSEAL_API_KEY', 'APPWRITE_BUCKET_ID'];

async function docuseal(path, options = {}) {
  const url = `${process.env.DOCUSEAL_URL.replace(/\/+$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.DOCUSEAL_API_KEY}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON */
  }
  if (!res.ok) throw new Error(`DocuSeal ${path} -> ${res.status} ${text}`);
  return json;
}

async function appwriteUpload(req, file, name) {
  const res = await fetch(
    `${process.env.APPWRITE_FUNCTION_API_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files`,
    {
      method: 'POST',
      headers: {
        'x-appwrite-key': req.headers['x-appwrite-key'] ?? '',
        'content-type': 'application/octet-stream',
        'x-appwrite-file': name,
      },
      body: file,
    }
  );
  if (!res.ok) throw new Error(`Appwrite upload -> ${res.status} ${await res.text()}`);
  return res.json();
}

export default async ({ req, res, log, error }) => {
  try {
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) return res.json({ ok: false, error: `Missing env: ${missing.join(', ')}` }, 400);

    if (req.path === '/create') {
      const body = req.bodyJson ?? {};
      if (!body.template_id || !body.email) return res.json({ ok: false, error: 'template_id and email are required' }, 400);
      const submission = await docuseal('/submissions', {
        method: 'POST',
        body: JSON.stringify({
          template_id: body.template_id,
          send_email: body.send_email ?? true,
          submitters: [{ email: body.email, role: body.role ?? 'Signer', name: body.name ?? body.email }],
        }),
      });
      return res.json({ ok: true, submission });
    }

    if (req.path === '/webhook') {
      const body = req.bodyJson ?? {};
      const event = body.event_type ?? body.event ?? '';
      log(`docuseal webhook ${event}`);
      if (event === 'submission.completed' || body.submission?.status === 'completed') {
        const submissionId = body.submission?.id ?? body.submission_id;
        if (!submissionId) return res.json({ ok: false, error: 'no submission id' }, 400);
        const download = await fetch(
          `${process.env.DOCUSEAL_URL.replace(/\/+$/, '')}/submissions/${submissionId}/download`,
          { headers: { authorization: `Bearer ${process.env.DOCUSEAL_API_KEY}` } }
        );
        if (!download.ok) throw new Error(`DocuSeal download -> ${download.status}`);
        const buf = Buffer.from(await download.arrayBuffer());
        const stored = await appwriteUpload(req, buf, `${submissionId}-signed.pdf`);
        return res.json({ ok: true, stored });
      }
      return res.json({ ok: true, ignored: event });
    }

    return res.json({ ok: false, error: 'Use POST /create or POST /webhook' }, 404);
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
