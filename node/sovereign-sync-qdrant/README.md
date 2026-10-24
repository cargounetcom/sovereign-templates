# ⚡ Node.js Sync with Self-hosted Qdrant Function

Syncs an Appwrite database collection into a **self-hosted [Qdrant](https://qdrant.tech/)**
collection. Documents are embedded with a **local Ollama model** by default, so neither
the documents nor their embeddings leave your infrastructure.

## 🧰 Usage

### POST / (or an Appwrite `databases.*.documents.*` event)

Runs a full sync: fetches every document in the configured collection, embeds it, and
upserts it into the Qdrant collection.

**Response**

Sample `200` Response:

```json
{ "ok": true, "synced": 42 }
```

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 30            |
| Scope             | `databases.read` |

## 🔒 Environment Variables

### APPWRITE_DATABASE_ID

The Appwrite database that contains the collection to sync.

| Question      | Answer     |
| ------------- | ---------- |
| Required      | Yes        |
| Sample Value  | `612a3...` |

### APPWRITE_COLLECTION_ID

The Appwrite collection to sync.

| Question      | Answer     |
| ------------- | ---------- |
| Required      | Yes        |
| Sample Value  | `7c3e8...` |

### QDRANT_URL

Base URL of the self-hosted Qdrant server.

| Question      | Answer                         |
| ------------- | ------------------------------ |
| Required      | Yes                            |
| Sample Value  | `http://qdrant.local:6333`     |

### QDRANT_API_KEY

API key for Qdrant. Leave empty when Qdrant runs without authentication.

| Question      | Answer      |
| ------------- | ----------- |
| Required      | No          |
| Sample Value  | `secret...` |

### QDRANT_COLLECTION_NAME

Name of the Qdrant collection to sync into.

| Question      | Answer      |
| ------------- | ----------- |
| Required      | Yes         |
| Sample Value  | `documents` |

### EMBED_URL

Base URL of the Ollama (or Ollama-compatible embeddings) server.

| Question      | Answer                                |
| ------------- | ------------------------------------- |
| Required      | Yes                                   |
| Sample Value  | `http://host.docker.internal:11434`   |

### EMBED_MODEL

The embeddings model to use.

| Question      | Answer             |
| ------------- | ------------------ |
| Required      | No                 |
| Sample Value  | `nomic-embed-text` |
