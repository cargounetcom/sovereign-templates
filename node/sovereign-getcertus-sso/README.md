# ⚡ Node.js GetCertus SSO Function

Verifies a **GetCertus** OIDC `id_token`, JIT-provisions / links the matching Appwrite
user by e-mail, and syncs GetCertus roles to Appwrite team (workspace) memberships.

Configure the login session itself with Appwrite's native OAuth2 provider pointed at
GetCertus; this function covers what native OAuth2 does not: user provisioning and
role → team mapping.

## 🧰 Usage

### POST /verify

Verifies a token and syncs the user.

**Body**

```json
{ "id_token": "eyJhbGciOiJSUzI1NiIs..." }
```

**Response**

Sample `200` Response:

```json
{
  "ok": true,
  "subject": "user-123",
  "userId": "612a3...5b6c9",
  "memberships": [{ "role": "admin", "teamId": "workspace-1", "action": "added" }]
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
| Scopes            | `users.read`, `users.write`, `teams.read`, `teams.write` |

## 🔒 Environment Variables

### GETCERTUS_ISSUER

The OIDC issuer of the GetCertus instance (includes `/oidc`).

| Question      | Answer                          |
| ------------- | ------------------------------- |
| Required      | Yes                             |
| Sample Value  | `https://acme.getcertus.app/oidc` |

### GETCERTUS_AUDIENCE

The OIDC client ID the token was issued for (its `aud` claim).

| Question      | Answer       |
| ------------- | ------------ |
| Required      | Yes          |
| Sample Value  | `my-app-client-id` |

### GETCERTUS_JWKS_URL

Optional. Defaults to `{GETCERTUS_ISSUER}/jwks`.

| Question      | Answer                              |
| ------------- | ----------------------------------- |
| Required      | No                                  |
| Sample Value  | `https://acme.getcertus.app/oidc/jwks` |

### ROLES_CLAIM

The claim in the `id_token` that carries the roles (default `roles`).

| Question      | Answer   |
| ------------- | -------- |
| Required      | No       |
| Sample Value  | `roles`  |

### ROLE_TEAM_MAP

JSON object mapping a GetCertus role to an Appwrite team (workspace) ID.

| Question      | Answer                                 |
| ------------- | -------------------------------------- |
| Required      | No                                     |
| Sample Value  | `{"admin":"workspace-1","member":"workspace-1"}` |
