import pg from 'pg';

// Read-only SQL against a self-hosted PostgreSQL instance.
//
//   POST /query   { query: "select ...", params?: [...] } -> { rows, rowCount }
//
// Only SELECT is allowed and queries must be parameterised (values go in `params`,
// never interpolated into the SQL).

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING, max: 4 });

export default async ({ req, res, log, error }) => {
  try {
    if (!process.env.PG_CONNECTION_STRING) {
      return res.json({ ok: false, error: 'PG_CONNECTION_STRING is required' }, 500);
    }
    if (req.path !== '/query') {
      return res.json({ ok: false, error: 'Use POST /query' }, 404);
    }
    const body = req.bodyJson ?? {};
    const query = String(body.query ?? '').trim();
    const params = Array.isArray(body.params) ? body.params : [];
    if (!query) return res.json({ ok: false, error: 'query is required' }, 400);
    if (!/^select\b/i.test(query)) {
      return res.json({ ok: false, error: 'only SELECT queries are allowed' }, 400);
    }

    const result = await pool.query(query, params);
    log(`rows=${result.rowCount}`);
    return res.json({ ok: true, rows: result.rows, rowCount: result.rowCount });
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
