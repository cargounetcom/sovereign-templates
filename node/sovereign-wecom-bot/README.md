# ⚡ Node.js WeCom (WeChat Work) AI Bot Function

Handles the WeCom (企业微信) AI Bot callback: URL verification (`GET`) and encrypted
message callbacks (`POST`), with the exact SHA1 signature + AES-256-CBC crypto of the
WeCom callback spec. Re-encrypts the reply and returns the `{ encrypt, msgsignature,
timestamp, nonce }` envelope.

## 🧰 Usage

### GET /

URL verification. WeCom calls this when you register the callback URL.

### POST /

Receives an encrypted message, decrypts it, replies with `REPLY_TEXT` (or echoes the
inbound text), and returns the encrypted response envelope.

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 15            |

## 🔒 Environment Variables

### WECOM_TOKEN

The WeCom AI Bot callback token.

| Question      | Answer            |
| ------------- | ----------------- |
| Required      | Yes               |
| Sample Value  | `your-wecom-token` |

### WECOM_ENCODING_AES_KEY

The 43-character EncodingAESKey from the WeCom AI Bot configuration.

| Question      | Answer                              |
| ------------- | ----------------------------------- |
| Required      | Yes                                 |
| Sample Value  | `abcdefghijklmnopqrstuvwxyz1234567890ABC` |

### REPLY_TEXT

Optional fixed reply. When empty, the bot echoes the inbound text.

| Question      | Answer        |
| ------------- | ------------- |
| Required      | No            |
| Sample Value  | `Hello!`      |

> The reply uses WeCom's one-shot streaming shape (`msgtype: "stream"` with
> `finish: true`). Multi-turn stream polling needs persistent state (Appwrite DB) and is
> intentionally out of scope for this single-function template.
