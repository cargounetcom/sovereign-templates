import crypto from 'node:crypto';

// Feishu (Lark) event-subscription bot.
//
//   POST /   url_verification -> { challenge }; event -> decrypt, reply via the Feishu
//            reply API, ACK. Encrypted events (body.encrypt) are supported when
//            FEISHU_ENCRYPT_KEY is set.
//
// Written from Feishu's public event-subscription protocol. The AionUi ext-feishu
// example was a stub, so this template is the real protocol.

const FEISHU_BASE = process.env.FEISHU_BASE_URL ?? 'https://open.feishu.cn';

function aesKey(encryptKey) {
  return crypto.createHash('sha256').update(encryptKey).digest();
}

function decrypt(encryptKey, encrypted) {
  const key = aesKey(encryptKey);
  const iv = key.subarray(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const buf = Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]);
  return JSON.parse(buf.toString('utf8'));
}

function encrypt(encryptKey, plain) {
  const key = aesKey(encryptKey);
  const iv = key.subarray(0, 16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([cipher.update(Buffer.from(plain)), cipher.final()]).toString('base64');
}

function extractText(message) {
  if (!message?.content) return '';
  if (typeof message.content !== 'string') return '';
  try {
    const parsed = JSON.parse(message.content);
    return parsed?.text ?? '';
  } catch {
    return message.content;
  }
}

async function tenantAccessToken(appId, appSecret) {
  const res = await fetch(`${FEISHU_BASE}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 0) {
    throw new Error(`feishu token -> ${res.status} ${body.msg ?? ''}`);
  }
  return body.tenant_access_token;
}

async function replyMessage(token, messageId, text) {
  const res = await fetch(`${FEISHU_BASE}/open-apis/im/v1/messages/${messageId}/reply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ msg_type: 'text', content: JSON.stringify({ text }) }),
  });
  if (!res.ok) throw new Error(`feishu reply -> ${res.status} ${await res.text()}`);
}

export default async ({ req, res, log, error }) => {
  try {
    if (req.method !== 'POST') return res.text('method not allowed', 405);

    const body = req.bodyJson ?? {};

    if (body.type === 'url_verification') {
      return res.json({ challenge: body.challenge });
    }

    let event = body;
    if (typeof body.encrypt === 'string' && body.encrypt) {
      if (!process.env.FEISHU_ENCRYPT_KEY) {
        return res.json({ ok: false, error: 'FEISHU_ENCRYPT_KEY is required for encrypted events' }, 400);
      }
      event = decrypt(process.env.FEISHU_ENCRYPT_KEY, body.encrypt);
    }

    if (process.env.FEISHU_VERIFICATION_TOKEN && event?.token !== process.env.FEISHU_VERIFICATION_TOKEN) {
      return res.json({ ok: false, error: 'token mismatch' }, 403);
    }

    const message = event?.event?.message ?? event?.event ?? {};
    const messageId = message?.message_id ?? event?.event?.context?.message_id ?? '';
    const text = extractText(message);
    log(`feishu event ${event?.header?.event_type ?? event?.type ?? ''} message=${messageId}`);

    if (messageId && text && process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
      const token = await tenantAccessToken(process.env.FEISHU_APP_ID, process.env.FEISHU_APP_SECRET);
      const reply = process.env.REPLY_TEXT ?? `echo: ${text}`;
      await replyMessage(token, messageId, reply);
    }

    if (typeof body.encrypt === 'string' && body.encrypt) {
      return res.json({ encrypt: encrypt(process.env.FEISHU_ENCRYPT_KEY, JSON.stringify({ code: 0 })) });
    }
    return res.json({ code: 0 });
  } catch (err) {
    error(err.message);
    return res.json({ code: 1, msg: err.message }, 500);
  }
};
