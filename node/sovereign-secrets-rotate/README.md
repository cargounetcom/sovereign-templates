# ⚡ Node.js Rotate Secrets from Infisical Function

Pulls a secret path from a **self-hosted [Infisical](https://github.com/Infisical/infisical)**
instance and upserts each value into the variables of a target Appwrite function.
Rotate a key once in Infisical and every function that uses it updates on the next run.

## 🧰 Usage

### POST / (or any method)

Runs the sync. Returns the list of secrets that were created or updated.

**Response**

Sample `200` Response:

```json
{
  "ok": true,
  "synced": [
    { "key": "OPENAI_API_KEY", "action": "updated" },
    { "key": "DATABASE_URL", "action": "created" }
  ]
}
```

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 30            |
| Scope             | `functions.write` |

## 🔒 Environment Variables

### INFISICAL_URL

Base URL of your self-hosted Infisical instance.

| Question      | Answer                         |
| ------------- | ------------------------------ |
| Required      | Yes                            |
| Sample Value  | `https://infisical.example.com` |

### INFISICAL_TOKEN

Infisical service token (secret) scoped to the project and environment.

| Question      | Answer                |
| ------------- | --------------------- |
| Required      | Yes                   |
| Sample Value  | `st.abc123...`        |

### INFISICAL_PROJECT_ID

The Infisical workspace (project) ID.

| Question      | Answer       |
| ------------- | ------------ |
| Required      | Yes          |
| Sample Value  | `650abc...`  |

### INFISICAL_ENVIRONMENT

The Infisical environment slug to read from.

| Question      | Answer  |
| ------------- | ------- |
| Required      | Yes     |
| Sample Value  | `prod`  |

### INFISICAL_SECRET_PATH

The secret path inside the project. `/` for the root folder.

| Question      | Answer  |
| ------------- | ------- |
| Required      | Yes     |
| Sample Value  | `/`     |

### APPWRITE_FUNCTION_ID

The Appwrite function whose variables should be synced.

| Question      | Answer       |
| ------------- | ------------ |
| Required      | Yes          |
| Sample Value  | `612a3...5b6c9` |
