// Rotate secrets: pull a secret path from a self-hosted Infisical instance and
// upsert each value into the variables of a target Appwrite function.
//
// Requires the function to run with the `functions.write` scope so it can read
// and write the target function's variables.

const required = [
  'INFISICAL_URL',
  'INFISICAL_TOKEN',
  'INFISICAL_PROJECT_ID',
  'INFISICAL_ENVIRONMENT',
  'INFISICAL_SECRET_PATH',
  'APPWRITE_FUNCTION_ID',
];

async function appwriteFetch(req, path, options = {}) {
  const res = await fetch(`${process.env.APPWRITE_FUNCTION_API_ENDPOINT}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-appwrite-key': req.headers['x-appwrite-key'] ?? '',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Appwrite ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function infisicalSecrets() {
  const base = process.env.INFISICAL_URL.replace(/\/+$/, '');
  const secretPath = process.env.INFISICAL_SECRET_PATH.replace(/^\/+/, '');
  const url = new URL(`${base}/api/v3/secrets/raw/${secretPath}`);
  url.searchParams.set('environment', process.env.INFISICAL_ENVIRONMENT);
  url.searchParams.set('workspaceId', process.env.INFISICAL_PROJECT_ID);

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${process.env.INFISICAL_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Infisical -> ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.secrets ?? [];
}

export default async ({ req, res, log, error }) => {
  try {
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      return res.json({ ok: false, error: `Missing env: ${missing.join(', ')}` }, 400);
    }

    const functionId = process.env.APPWRITE_FUNCTION_ID;
    const secrets = await infisicalSecrets();
    log(`Fetched ${secrets.length} secrets from Infisical.`);

    const existing = await appwriteFetch(req, `/functions/${functionId}/variables`);
    const byKey = new Map((existing.variables ?? []).map((v) => [v.key, v]));

    const synced = [];
    for (const s of secrets) {
      const key = s.secretKey ?? s.key;
      const value = s.secretValue ?? s.value ?? '';
      if (!key) continue;

      const current = byKey.get(key);
      if (current) {
        await appwriteFetch(req, `/functions/${functionId}/variables/${current.$id}`, {
          method: 'PUT',
          body: JSON.stringify({ key, value, secret: true }),
        });
        synced.push({ key, action: 'updated' });
      } else {
        await appwriteFetch(req, `/functions/${functionId}/variables`, {
          method: 'POST',
          body: JSON.stringify({ key, value, secret: true }),
        });
        synced.push({ key, action: 'created' });
      }
    }

    return res.json({ ok: true, synced });
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
