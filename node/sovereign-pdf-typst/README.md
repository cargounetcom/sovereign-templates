# ⚡ Node.js Typst PDF Function

Renders [Typst](https://typst.app/) markup to a PDF and returns it as the response body.
Useful for invoices, reports and certificates.

## 🧰 Usage

### POST /

**Body**

```json
{ "source": "#set page(width: 10cm, height: 5cm)\n= Invoice\nTotal: #(100 * 2) EUR" }
```

Returns the compiled PDF (`application/pdf`).

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install && curl -L https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz | tar xJ && cp typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst` |
| Permissions       | `any`         |
| Timeout (Seconds) | 30            |

## 🔒 Environment Variables

None required.

> The build command downloads the Typst binary into the function image at build time,
> so the runtime can call it. Pin a specific Typst version for reproducible output.
