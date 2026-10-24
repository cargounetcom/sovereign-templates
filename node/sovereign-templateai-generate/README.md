# ⚡ Node.js TemplateAI Generator Function

Proxy to the **templateai** generator (OpenDesign fork). Returns a site scaffold
(`files`, `setup`, `description`) for a chosen stack.

## 🧰 Usage

### POST /generate

**Body**

```json
{ "stack": "nextjs", "name": "My Store", "description": "a shop", "features": ["Cart", "Stripe"] }
```

**Response**

```json
{ "ok": true, "files": [{"name":"page.tsx","path":"app/page.tsx","content":"…"}], "setup": ["npm install","npm run dev"], "description": "what was built" }
```

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 30            |

## 🔒 Environment Variables

### TEMPLATEAI_URL

Base URL of the templateai deployment.

| Question      | Answer                     |
| ------------- | -------------------------- |
| Required      | Yes                        |
| Sample Value  | `https://templateai.app`   |

### TEMPLATEAI_TOKEN

License token injected into the generation request when the caller does not provide one.

| Question      | Answer    |
| ------------- | --------- |
| Required      | No        |
| Sample Value  | `tk_...`  |
