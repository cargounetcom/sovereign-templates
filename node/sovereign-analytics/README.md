# ⚡ Node.js Analytics with PostHog Function

Forwards product events to a **self-hosted [PostHog](https://github.com/PostHog/posthog)**
instance, so analytics data never leaves your infrastructure.

## 🧰 Usage

### POST /capture

Sends a single event.

**Body**

```json
{
  "event": "signed_up",
  "distinct_id": "user-123",
  "properties": { "plan": "pro" },
  "timestamp": "2026-10-24T08:00:00Z"
}
```

### POST /batch

Sends many events at once. Accepts either a bare array or `{ "batch": [...] }`.

**Body**

```json
[
  { "event": "signed_up", "distinct_id": "user-123" },
  { "event": "project_created", "distinct_id": "user-456" }
]
```

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 15            |

## 🔒 Environment Variables

### POSTHOG_HOST

Base URL of your self-hosted PostHog instance.

| Question      | Answer                         |
| ------------- | ------------------------------ |
| Required      | Yes                            |
| Sample Value  | `https://posthog.example.com`  |

### POSTHOG_API_KEY

Project API key from PostHog (secret).

| Question      | Answer       |
| ------------- | ------------ |
| Required      | Yes          |
| Sample Value  | `phc_abc...` |

### AUTH_TOKEN

Optional shared secret. When set, requests must send `Authorization: Bearer <AUTH_TOKEN>`.

| Question      | Answer     |
| ------------- | ---------- |
| Required      | No         |
| Sample Value  | `your-long-random-secret` |
