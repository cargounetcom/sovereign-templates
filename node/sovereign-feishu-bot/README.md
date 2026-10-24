# ⚡ Node.js Feishu (Lark) Bot Function

Feishu event-subscription bot: handles URL verification (`url_verification` → `challenge`),
decrypts encrypted events (`body.encrypt`, AES-256-CBC with key = SHA256(Encrypt Key)),
and replies to messages through the Feishu reply API.

Written from Feishu's public protocol — the AionUi `ext-feishu` example was a stub.

## 🧰 Usage

### POST /

Registered as the Feishu event-subscription endpoint.

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 15            |

## 🔒 Environment Variables

### FEISHU_APP_ID / FEISHU_APP_SECRET

App credentials, used to obtain a `tenant_access_token` for replying to messages.

| Question      | Answer        |
| ------------- | ------------- |
| Required      | No (skip to not reply) |
| Sample Value  | `cli_...` / `secret` |

### FEISHU_ENCRYPT_KEY

Encrypt Key from the Feishu event-subscription settings. Set it to decrypt encrypted events.

| Question      | Answer     |
| ------------- | ---------- |
| Required      | No         |
| Sample Value  | `abc123...` |

### FEISHU_VERIFICATION_TOKEN

Optional. When set, events whose `token` does not match are rejected.

| Question      | Answer     |
| ------------- | ---------- |
| Required      | No         |
| Sample Value  | `vt_...`   |

### REPLY_TEXT

Optional fixed reply. When empty, the bot replies `echo: <text>`.

| Question      | Answer   |
| ------------- | -------- |
| Required      | No       |
| Sample Value  | `Hello!` |
