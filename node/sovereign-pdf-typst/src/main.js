import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Render Typst markup to a PDF and return it.
//
//   POST /   { source: "...Typst markup..." } -> PDF binary
//
// The `typst` binary must be installed in the build commands (see README).

export default async ({ req, res, log, error }) => {
  try {
    const body = req.bodyJson ?? {};
    const source = typeof body.source === 'string' ? body.source : typeof req.body === 'string' ? req.body : '';
    if (!source) return res.json({ ok: false, error: 'Typst source is required' }, 400);

    const dir = mkdtempSync(join(tmpdir(), 'typst-'));
    const input = join(dir, 'main.typ');
    const output = join(dir, 'out.pdf');
    try {
      writeFileSync(input, source);
      const r = spawnSync('typst', ['compile', input, output], { encoding: 'utf8' });
      if (r.status !== 0) {
        return res.json({ ok: false, error: (r.stderr || r.stdout || 'typst failed').trim() }, 500);
      }
      const pdf = readFileSync(output);
      return res.binary(pdf, 200, { 'content-type': 'application/pdf' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
