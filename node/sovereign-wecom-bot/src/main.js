import crypto from 'node:crypto';

// WeCom (WeChat Work) AI Bot callback webhook.
//
//   GET  /   URL verification: verify msg_signature, decrypt echostr, return plaintext.
//   POST /   Receive an encrypted message, verify, decrypt, reply (echo or REPLY_TEXT),
//            re-encrypt and return { encrypt, msgsignature, timestamp, nonce }.
//
// Crypto matches the WeCom callback spec (SHA1 signature + AES-256-CBC with a
// 43-char EncodingAESKey), ported from the AionUi ext-wecom-bot example.

function sha1Sign(token, timestamp, nonce, encrypted) {
  const sorted = [token, String(timestamp), String(nonce), encrypted].sort();
  return crypto.createHash('sha1').update(sorted.join('')).digest('hex');
}

function decodePkcs7(buffer) {
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 32) throw new Error('Invalid PKCS7 padding');
  return buffer.subarray(0, buffer.length - pad);
}

function encodePkcs7(buffer) {
  const blockSize = 32;
  const padLen = blockSize - (buffer.length % blockSize || blockSize);
  const pad = Buffer.alloc(padLen, padLen);
  return Buffer.concat([buffer, pad]);
}

function decryptPayload(encodingAesKey, encrypted) {
  const aesKey = Buffer.from(`${encodingAesKey}=`, 'base64');
  const iv = aesKey.subarray(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]);
  const raw = decodePkcs7(decrypted);
  const body = raw.subarray(16);
  const len = body.subarray(0, 4).readUInt32BE(0);
  return body.subarray(4, 4 + len).toString('utf8');
}

function encryptPayload(encodingAesKey, plainText) {
  const aesKey = Buffer.from(`${encodingAesKey}=`, 'base64');
  const iv = aesKey.subarray(0, 16);
  const random16 = crypto.randomBytes(16);
  const message = Buffer.from(plainText);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(message.length, 0);
  const encoded = encodePkcs7(Buffer.concat([random16, len, message]));
  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(encoded), cipher.final()]).toString('base64');
}

function extractText(payload) {
  const msgType = payload?.msgtype;
  if (msgType === 'text') return payload?.text?.content || '';
  if (msgType === 'voice') return payload?.voice?.content || '';
  if (msgType === 'image') return payload?.image?.url ? `[image] ${payload.image.url}` : '[image]';
  if (msgType === 'file') return payload?.file?.name ? `[file] ${payload.file.name}` : '[file]';
  return '';
}

export default async ({ req, res, log, error }) => {
  try {
    const token = process.env.WECOM_TOKEN;
    const aesKey = process.env.WECOM_ENCODING_AES_KEY;
    if (!token || !aesKey || aesKey.length !== 43) {
      return res.json({ ok: false, error: 'WECOM_TOKEN and a 43-char WECOM_ENCODING_AES_KEY are required' }, 500);
    }

    const msgSignature = String(req.query?.msg_signature ?? '');
    const timestamp = String(req.query?.timestamp ?? '');
    const nonce = String(req.query?.nonce ?? '');
    if (!msgSignature || !timestamp || !nonce) {
      return res.text('missing query signature params', 400);
    }

    // URL verification
    if (req.method === 'GET') {
      const echostr = String(req.query?.echostr ?? '');
      if (!echostr) return res.text('missing echostr', 400);
      if (sha1Sign(token, timestamp, nonce, echostr) !== msgSignature) {
        return res.text('signature mismatch', 403);
      }
      return res.text(decryptPayload(aesKey, echostr));
    }

    if (req.method !== 'POST') return res.text('method not allowed', 405);

    const body = req.bodyJson ?? {};
    const encrypt = body.encrypt;
    if (typeof encrypt !== 'string' || !encrypt) {
      return res.text('invalid body: missing encrypt', 400);
    }
    if (sha1Sign(token, timestamp, nonce, encrypt) !== msgSignature) {
      return res.text('signature mismatch', 403);
    }

    const payload = JSON.parse(decryptPayload(aesKey, encrypt));
    const inbound = extractText(payload);
    const reply = process.env.REPLY_TEXT ? process.env.REPLY_TEXT : inbound || 'received';
    log(`reply to ${payload?.from?.userid || payload?.from_userid || 'wecom-user'}: ${reply.slice(0, 80)}`);

    // One-shot streaming reply (finish: true) — same shape as buildEncryptedStreamResponse.
    const response = {
      msgtype: 'stream',
      stream: { id: `sovereign-${Date.now()}`, finish: true, content: reply },
    };
    const encrypted = encryptPayload(aesKey, JSON.stringify(response));
    return res.json({
      encrypt: encrypted,
      msgsignature: sha1Sign(token, timestamp, nonce, encrypted),
      timestamp,
      nonce,
    });
  } catch (err) {
    error(err.message);
    return res.text(err.message, 500);
  }
};
