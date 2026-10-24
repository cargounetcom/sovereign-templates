import { createHash } from 'node:crypto';

// Sync Appwrite documents into a self-hosted Qdrant collection, embedding the
// documents with a local Ollama model by default (on-prem, no cloud API keys).
//
//   POST /  (or an Appwrite databases.*.documents.* event) -> full sync

function uuidFromString(s) {
  const h = createHash('sha256').update(String(s)).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

async function appwriteFetch(req, path, options = {}) {
  const res = await fetch(`${process.env.APPWRITE_FUNCTION_API_ENDPOINT}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-appwrite-key': req.headers['x-appwrite-key'] ?? '',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Appwrite ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function listDocuments(req, databaseId, collectionId) {
  const docs = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const body = await appwriteFetch(
      req,
      `/databases/${databaseId}/collections/${collectionId}/documents?limit=${limit}&offset=${offset}`
    );
    const batch = body.documents ?? [];
    docs.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return docs;
}

async function embed(texts) {
  const url = `${process.env.EMBED_URL.replace(/\/+$/, '')}/api/embed`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.EMBED_MODEL ?? 'nomic-embed-text', input: texts }),
  });
  if (!res.ok) throw new Error(`Embeddings -> ${res.status} ${await res.text()}`);
  const body = await res.json();
  return body.embeddings ?? [];
}

async function qdrantFetch(path, options = {}) {
  const url = `${process.env.QDRANT_URL.replace(/\/+$/, '')}${path}`;
  const headers = { 'content-type': 'application/json' };
  if (process.env.QDRANT_API_KEY) headers['api-key'] = process.env.QDRANT_API_KEY;
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new Error(`Qdrant ${path} -> ${res.status} ${text}`);
  return json;
}

export default async ({ req, res, log, error }) => {
  try {
    const required = [
      'APPWRITE_DATABASE_ID',
      'APPWRITE_COLLECTION_ID',
      'QDRANT_URL',
      'QDRANT_COLLECTION_NAME',
      'EMBED_URL',
    ];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      return res.json({ ok: false, error: `Missing env: ${missing.join(', ')}` }, 400);
    }

    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_COLLECTION_ID;
    const qCollection = process.env.QDRANT_COLLECTION_NAME;

    const docs = await listDocuments(req, databaseId, collectionId);
    log(`Fetched ${docs.length} documents.`);
    if (docs.length === 0) {
      return res.json({ ok: true, synced: 0 });
    }

    const texts = docs.map((d) => JSON.stringify(d));
    const vectors = await embed(texts);
    if (vectors.length !== docs.length) {
      throw new Error(`expected ${docs.length} vectors, got ${vectors.length}`);
    }

    // Create the collection if it does not exist (dimension = vector size).
    try {
      await qdrantFetch(`/collections/${qCollection}`, {
        method: 'PUT',
        body: JSON.stringify({ vectors: { size: vectors[0].length, distance: 'Cosine' } }),
      });
    } catch (err) {
      log(`collection create skipped: ${err.message}`);
    }

    const points = docs.map((d, i) => ({
      id: uuidFromString(d.$id),
      vector: vectors[i],
      payload: d,
    }));

    await qdrantFetch(`/collections/${qCollection}/points?wait=true`, {
      method: 'PUT',
      body: JSON.stringify({ points }),
    });

    return res.json({ ok: true, synced: points.length });
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
