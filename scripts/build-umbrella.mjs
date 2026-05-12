#!/usr/bin/env node
/**
 * Build the `thai-qr-payment` umbrella package.
 *
 * The umbrella is a thin re-export shim over the scoped
 * `@thai-qr-payment/*` packages, so a bundler is the wrong tool:
 * rspack/swc would either inline the deps (defeating the umbrella's
 * point) or drop the `export *` declarations entirely under
 * `usedExports: true`. We use TypeScript directly to emit:
 *
 *   dist/*.js   — ESM (module: ESNext)
 *   dist/*.cjs  — CJS wrappers that re-export via dynamic require
 *   dist/*.d.ts — declarations (shared by both)
 *
 * The CJS wrappers are 3-line require() shims rather than tsc output
 * because tsc-compiled CJS strips the `Object.defineProperty(..., '__esModule')`
 * marker in a way that breaks named imports in some bundlers. The
 * require()-and-reassign pattern works everywhere.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..', 'packages', 'thai-qr-payment');
const srcDir = join(pkgRoot, 'src');
const distDir = join(pkgRoot, 'dist');

const WATCH = process.argv.includes('--watch');

/** Run a child process and inherit stdio; resolve on exit. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd: pkgRoot, ...opts });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`)),
    );
    child.on('error', reject);
  });
}

/** List `.ts` source files (skip tests). */
async function listSources() {
  const entries = await readdir(srcDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts'))
    .map((e) => e.name);
}

/** Emit the CJS shim for one umbrella entry. */
function cjsShimFor(stem) {
  // Map umbrella entry → upstream package name.
  const upstream =
    stem === 'index'
      ? null // full umbrella; aggregate manually
      : stem === 'cli'
        ? null // CLI shim — separate handling below
        : `@thai-qr-payment/${stem}`;
  if (stem === 'cli') {
    return `"use strict";\nrequire("@thai-qr-payment/cli/bin");\n`;
  }
  if (upstream != null) {
    return `"use strict";\nObject.defineProperty(exports, "__esModule", { value: true });\nObject.assign(exports, require(${JSON.stringify(upstream)}));\n`;
  }
  // index: aggregate every upstream
  const lines = [
    '"use strict";',
    'Object.defineProperty(exports, "__esModule", { value: true });',
    'Object.assign(exports, require("@thai-qr-payment/payload"));',
    'Object.assign(exports, require("@thai-qr-payment/qr"));',
    'Object.assign(exports, require("@thai-qr-payment/render"));',
    'Object.assign(exports, require("@thai-qr-payment/assets"));',
  ];
  return `${lines.join('\n')}\n`;
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  // 1) Emit ESM .js + .d.ts via tsc. `export *` is preserved natively.
  await run('npx', [
    'tsc',
    '-p',
    'tsconfig.json',
    '--module',
    'ESNext',
    '--moduleResolution',
    'Bundler',
    '--outDir',
    'dist',
  ]);

  const sources = await listSources();

  // 2) Re-extension ESM output: tsc emits `.js`, which is exactly what
  //    we want for the ESM entries. Re-write the CLI entry with a
  //    `#!/usr/bin/env node` banner so it can run as a bin.
  const cliPath = join(distDir, 'cli.js');
  try {
    const cliBody = await readFile(cliPath, 'utf8');
    if (!cliBody.startsWith('#!')) {
      await writeFile(cliPath, `#!/usr/bin/env node\n${cliBody}`, { mode: 0o755 });
    }
  } catch {
    // CLI source might be absent; tolerate.
  }

  // 3) Emit per-entry CJS shims.
  for (const file of sources) {
    const stem = file.replace(/\.ts$/, '');
    if (stem === 'cli') continue; // CLI is ESM-only (Node bin)
    await writeFile(join(distDir, `${stem}.cjs`), cjsShimFor(stem));
  }

  console.log(`✓ thai-qr-payment umbrella built (${sources.length} entries)`);
}

if (WATCH) {
  console.log('watch mode not supported for umbrella; running one-shot build');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
