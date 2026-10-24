import { createRemoteJWKSet, jwtVerify } from 'jose';

// Verify a GetCertus (Logto fork) OIDC id_token, JIT-provision / link the matching
// Appwrite user by e-mail, then sync GetCertus roles -> Appwrite team memberships.
//
//   POST /verify  { "id_token": "..." }
//
// Configure the actual login session with Appwrite's native OAuth2 provider pointing
// at GetCertus; this function handles what native OAuth2 does not: user provisioning
// and role -> team (workspace) mapping.

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
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
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new Error(`Appwrite ${path} -> ${res.status} ${text}`);
  return json;
}

async function verifyToken(idToken) {
  const issuer = process.env.GETCERTUS_ISSUER.replace(/\/+$/, '');
  const jwksUrl = process.env.GETCERTUS_JWKS_URL ?? `${issuer}/jwks`;
  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    audience: process.env.GETCERTUS_AUDIENCE,
  });
  return payload;
}

async function findUserByEmail(req, email) {
  const query = `equal("email","${email.replace(/"/g, '\\"')}")`;
  const body = await appwriteFetch(req, `/users?queries[]=${encodeURIComponent(query)}`);
  return body.users?.[0] ?? null;
}

export default async ({ req, res, log, error }) => {
  try {
    if (req.path !== '/verify' && req.path !== '/') {
      return res.json({ ok: false, error: 'Use POST /verify' }, 404);
    }
    if (!process.env.GETCERTUS_ISSUER || !process.env.GETCERTUS_AUDIENCE) {
      return res.json({ ok: false, error: 'Missing GETCERTUS_ISSUER or GETCERTUS_AUDIENCE' }, 400);
    }

    const body = req.bodyJson ?? {};
    if (!body.id_token) {
      return res.json({ ok: false, error: 'Missing id_token' }, 400);
    }

    const payload = await verifyToken(body.id_token);
    const email = payload.email;
    const sub = payload.sub;

    if (!email) {
      return res.json({ ok: false, error: 'id_token has no email claim' }, 400);
    }

    const rolesClaim = process.env.ROLES_CLAIM ?? 'roles';
    const roles = payload[rolesClaim] ?? [];
    const roleList = Array.isArray(roles) ? roles : [roles];
    const roleTeamMap = parseJson(process.env.ROLE_TEAM_MAP, {});

    let user = await findUserByEmail(req, email);
    if (!user) {
      const password = globalThis.crypto.randomUUID().replace(/-/g, '');
      user = await appwriteFetch(req, '/users', {
        method: 'POST',
        body: JSON.stringify({ userId: 'unique()', email, password, name: email }),
      });
      log(`Created Appwrite user for ${email}`);
    }

    const memberships = [];
    for (const role of roleList) {
      const teamId = roleTeamMap[role];
      if (!teamId) continue;
      try {
        await appwriteFetch(req, `/teams/${teamId}/memberships`, {
          method: 'POST',
          body: JSON.stringify({ userId: user.$id, roles: [] }),
        });
        memberships.push({ role, teamId, action: 'added' });
      } catch (err) {
        memberships.push({ role, teamId, action: 'skipped', reason: err.message });
      }
    }

    return res.json({ ok: true, subject: sub, userId: user.$id, memberships });
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 401);
  }
};
