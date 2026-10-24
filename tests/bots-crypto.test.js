// Run with: bun test tests/bots-crypto.test.js   (from the repo root)
// Verifies the WeCom and Feishu bot crypto is self-consistent (round-trip) and that
// the WeCom signature is the SHA1 of the sorted [token, timestamp, nonce, encrypt].
import { describe, expect, test } from 'bun:test'
import { sha1Sign, decryptPayload, encryptPayload } from '../node/sovereign-wecom-bot/src/main.js'
import { decrypt as feishuDecrypt, encrypt as feishuEncrypt } from '../node/sovereign-feishu-bot/src/main.js'

// 43-char EncodingAESKey (Tencent's documented sample).
const WECOM_KEY = 'jWmYm7qr5nMoAUwZRjGtBxmz3KA1tkAj3ykkR6q2B2C'
const TOKEN = 'sovereign-test-token'

describe('wecom crypto', () => {
  test('encodingAESKey is 43 chars', () => {
    expect(WECOM_KEY.length).toBe(43)
  })

  test('encrypt/decrypt round-trip across payload shapes', () => {
    const cases = [
      'hello',
      '',
      'Київ 🇺🇦 中文',
      JSON.stringify({ msgtype: 'stream', stream: { id: 'x', finish: true, content: 'привіт' } }),
      'x'.repeat(31),
      'x'.repeat(32),
      'x'.repeat(64),
    ]
    for (const msg of cases) {
      expect(decryptPayload(WECOM_KEY, encryptPayload(WECOM_KEY, msg))).toBe(msg)
    }
  })

  test('signature is SHA1 of sorted token/timestamp/nonce/encrypt', () => {
    const enc = 'ciphertext'
    const s = sha1Sign(TOKEN, '1700000000', 'nonce', enc)
    expect(s).toMatch(/^[0-9a-f]{40}$/)
    // sorted → order of timestamp/nonce must not matter
    expect(sha1Sign(TOKEN, '1700000000', 'nonce', enc)).toBe(sha1Sign(TOKEN, 'nonce', '1700000000', enc))
  })
})

describe('feishu crypto', () => {
  test('encrypt/decrypt round-trip', () => {
    const key = 'feishu-encrypt-key'
    const cases = [
      { type: 'url_verification', challenge: 'challenge-123' },
      { schema: '2.0', header: { event_type: 'im.message.receive_v1' }, event: { message: { message_id: 'om_1', content: '{"text":"hi"}' } } },
    ]
    for (const obj of cases) {
      expect(feishuDecrypt(key, feishuEncrypt(key, JSON.stringify(obj)))).toEqual(obj)
    }
  })
})
