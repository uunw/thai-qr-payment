#!/usr/bin/env node
/**
 * Pre-compress every dist/*.{js,cjs} file with brotli + gzip so CDNs
 * (and self-hosted static servers) can serve the smaller variant
 * directly without re-compressing on every request.
 *
 * Outputs:
 *   dist/index.js     → dist/index.js.br   + dist/index.js.gz
 *   dist/index.cjs    → dist/index.cjs.br  + dist/index.cjs.gz
 *
 * Runs once at the end of `pnpm build` via the root postbuild hook.
 */

import { readdirSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompress, gzip, constants } from 'node:zlib';
import { promisify } from 'node:util';

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const TARGETS = /\.(?:js|cjs|d\.ts)$/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else if (stat.isFile() && TARGETS.test(entry) && !entry.endsWith('.map')) yield full;
  }
}

async function compressOne(path) {
  const data = await readFile(path);
  if (data.length < 1024) return null; // not worth compressing tiny files
  const [br, g] = await Promise.all([
    brotli(data, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      },
    }),
    gz(data, { level: 9 }),
  ]);
  await Promise.all([writeFile(`${path}.br`, br), writeFile(`${path}.gz`, g)]);
  return { raw: data.length, br: br.length, gz: g.length };
}

async function main() {
  const pkgsDir = resolve(repoRoot, 'packages');
  const rows = [];
  for (const pkg of readdirSync(pkgsDir)) {
    const dist = resolve(pkgsDir, pkg, 'dist');
    try {
      statSync(dist);
    } catch {
      continue;
    }
    for (const file of walk(dist)) {
      const result = await compressOne(file);
      if (result != null) {
        rows.push({ file: file.replace(`${repoRoot}/`, ''), ...result });
      }
    }
  }

  if (rows.length === 0) {
    console.log('no files compressed');
    return;
  }

  const pad = (s, n) => String(s).padStart(n);
  console.log('compressed:');
  for (const r of rows) {
    const ratio = ((r.br / r.raw) * 100).toFixed(0);
    console.log(
      `  ${r.file.padEnd(60)} ${pad(r.raw, 7)}B → br ${pad(r.br, 6)}B (${ratio}%) gz ${pad(r.gz, 6)}B`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
