# ⚡ Node.js DocuSeal e-Signature Function

Integrates a **self-hosted [DocuSeal](https://github.com/docusealco/docuseal)** instance:
creates a signing submission and, on `submission.completed`, downloads the signed
document into Appwrite Storage.

## 🧰 Usage

### POST /create

Creates a submission from a DocuSeal template.

**Body**

```json
{ "template_id": 1, "email": "signer@example.com", "name": "Signer" }
```

### POST /webhook

DocuSeal webhook. On `submission.completed`, the signed document is stored in Appwrite.

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 30            |
| Scope             | `storage.write` |

## 🔒 Environment Variables

### DOCUSEAL_URL / DOCUSEAL_API_KEY

Base URL and API key of the self-hosted DocuSeal.

| Question      | Answer                        |
| ------------- | ----------------------------- |
| Required      | Yes                           |
| Sample Value  | `https://docuseal.example.com` / `...` |

### APPWRITE_BUCKET_ID

Appwrite storage bucket where signed documents are saved.

| Question      | Answer     |
| ------------- | ---------- |
| Required      | Yes        |
| Sample Value  | `612a3...` |

> DocuSeal's exact endpoint paths (`/submissions`, `/submissions/{id}/download`) follow
> its API; confirm them against your deployed version.
