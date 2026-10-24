# ⚡ Node.js Query PostgreSQL Function

Runs **read-only** SQL against a self-hosted PostgreSQL instance and returns the rows.

## 🧰 Usage

### POST /query

**Body**

```json
{ "query": "select id, name from users where active = $1 limit 10", "params": [true] }
```

**Response**

```json
{ "ok": true, "rows": [{ "id": 1, "name": "Ada" }], "rowCount": 1 }
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

### PG_CONNECTION_STRING

PostgreSQL connection string.

| Question      | Answer                                            |
| ------------- | ------------------------------------------------- |
| Required      | Yes                                               |
| Sample Value  | `postgres://user:pass@pg.example.com:5432/dbname` |

## Security

Only `SELECT` statements are accepted; values must be passed in `params` (never
interpolated into the SQL).
