#!/usr/bin/env node
/**
 * One-off maintenance script: enrich every workspace package.json with
 * the metadata fields that npm + bundlers + sponsor pages look for.
 *
 * Idempotent — safe to re-run. Existing keyword arrays are merged with
 * the per-package additions; existing scripts are not overwritten.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const SHARED_KEYWORDS = [
  'thai-qr-payment',
  'thai-qr',
  'promptpay',
  'qrcode',
  'qr-code',
  'qr',
  'emvco',
  'emv-qrcps',
  'thailand',
  'payment',
  'billpayment',
  'kshop',
  'kbank',
  'scb',
  'national-itmx',
  'bot',
  'svg',
  'zero-dependency',
  'esm',
  'typescript',
  'browser',
  'node',
  'edge-runtime',
  'cloudflare-workers',
  'deno',
  'bun',
];

const PER_PACKAGE_KEYWORDS = {
  'thai-qr-payment': ['umbrella', 'all-in-one'],
  '@thai-qr-payment/payload': [
    'emv',
    'tlv',
    'parser',
    'builder',
    'wire-format',
    'crc16',
    'crc-16-ccitt',
  ],
  '@thai-qr-payment/qr': ['iso-18004', 'reed-solomon', 'galois-field', 'encoder', 'matrix'],
  '@thai-qr-payment/render': ['svg-renderer', 'card', 'composer'],
  '@thai-qr-payment/assets': ['logo', 'brand', 'icons', 'svg-assets'],
  '@thai-qr-payment/react': ['react', 'react-component', 'jsx', 'tsx', 'preact'],
  '@thai-qr-payment/cli': ['cli', 'command-line', 'bin', 'tqp'],
};

const AUTHOR = {
  name: 'uunw',
  url: 'https://github.com/uunw',
};

const FUNDING = {
  type: 'github',
  url: 'https://github.com/sponsors/uunw',
};

const ENGINES = {
  node: '>=18',
  pnpm: '>=8',
};

function unique(arr) {
  return [...new Set(arr)].sort();
}

function patchOne(pkg) {
  const name = pkg.name;

  // author → object form with URL
  pkg.author = AUTHOR;

  // funding (GitHub Sponsors)
  pkg.funding = FUNDING;

  // engines: keep node, add pnpm
  pkg.engines = { ...ENGINES, ...(pkg.engines ?? {}) };
  pkg.engines.node = ENGINES.node;
  pkg.engines.pnpm = pkg.engines.pnpm ?? ENGINES.pnpm;

  // keywords: merge shared + per-package
  const base = Array.isArray(pkg.keywords) ? pkg.keywords : [];
  pkg.keywords = unique([...base, ...SHARED_KEYWORDS, ...(PER_PACKAGE_KEYWORDS[name] ?? [])]);

  // CDN entry points (only for non-CLI library packages)
  if (!pkg.bin && pkg.module) {
    pkg.unpkg = pkg.module;
    pkg.jsdelivr = pkg.module;
  }

  // prepublishOnly: ensure build + test before npm publish
  pkg.scripts = pkg.scripts ?? {};
  if (!pkg.scripts.prepublishOnly) {
    pkg.scripts.prepublishOnly = 'pnpm build && pnpm test';
  }

  // peerDependenciesMeta for optional peers (react package has React as
  // required peer, so no optionals — placeholder for future extensions).
  // Leave as-is unless explicitly needed.

  return pkg;
}

function patchRoot(pkg) {
  pkg.author = AUTHOR;
  pkg.funding = FUNDING;
  pkg.engines = { ...ENGINES, ...(pkg.engines ?? {}) };
  pkg.engines.node = ENGINES.node;
  pkg.engines.pnpm = pkg.engines.pnpm ?? ENGINES.pnpm;
  pkg.keywords = unique(SHARED_KEYWORDS);
  return pkg;
}

function sortKeysCanonical(pkg) {
  // Canonical key order popular bundlers + npm UIs expect at the top.
  const PRIORITY = [
    'name',
    'version',
    'private',
    'description',
    'keywords',
    'homepage',
    'bugs',
    'license',
    'author',
    'contributors',
    'maintainers',
    'funding',
    'repository',
    'engines',
    'os',
    'cpu',
    'workspaces',
    'packageManager',
    'type',
    'sideEffects',
    'main',
    'module',
    'types',
    'typings',
    'browser',
    'unpkg',
    'jsdelivr',
    'exports',
    'imports',
    'bin',
    'files',
    'directories',
    'scripts',
    'dependencies',
    'peerDependencies',
    'peerDependenciesMeta',
    'optionalDependencies',
    'devDependencies',
    'bundledDependencies',
    'publishConfig',
  ];
  const out = {};
  for (const k of PRIORITY) {
    if (k in pkg) out[k] = pkg[k];
  }
  for (const k of Object.keys(pkg)) {
    if (!(k in out)) out[k] = pkg[k];
  }
  return out;
}

async function processFile(path, isRoot) {
  const raw = JSON.parse(await readFile(path, 'utf8'));
  const patched = isRoot ? patchRoot(raw) : patchOne(raw);
  const sorted = sortKeysCanonical(patched);
  await writeFile(path, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  console.log(`✓ ${path}`);
}

async function main() {
  await processFile(resolve(repoRoot, 'package.json'), true);
  const pkgsDir = resolve(repoRoot, 'packages');
  for (const dir of readdirSync(pkgsDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    await processFile(resolve(pkgsDir, dir.name, 'package.json'), false);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
