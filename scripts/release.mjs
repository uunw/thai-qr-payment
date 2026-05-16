#!/usr/bin/env node
/**
 * Locked-major release script. All seven `@thai-qr-payment/*` packages
 * bump together to the same `1.MINOR.PATCH` version, publish to npm,
 * and force the `latest` dist-tag so the new version wins over registry
 * ghosts left from the prior `linked`-changesets cascade (2.0.0 / 3.0.0
 * / 4.0.0 are all stranded — npm policy blocks `npm unpublish` once
 * dependents exist).
 *
 * Usage:
 *   pnpm release:patch    # 1.1.0 → 1.1.1
 *   pnpm release:minor    # 1.1.0 → 1.2.0
 *
 * Major bumps are deliberately not exposed. To break that rule, edit
 * this script — and only after a real, breaking API change.
 *
 * Requires:
 *   - npm login (or NPM_TOKEN env / bypass-2FA granular token)
 *   - clean working tree
 *   - all tests green
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const PACKAGES = [
  'packages/payload',
  'packages/qr',
  'packages/assets',
  'packages/render',
  'packages/cli',
  'packages/react',
  'packages/thai-qr-payment',
];

const PINNED_MAJOR = 1;

const bump = process.argv[2];
if (bump !== 'patch' && bump !== 'minor') {
  console.error('usage: release.mjs <patch|minor>');
  process.exit(1);
}

function readPkg(dir) {
  return JSON.parse(readFileSync(resolve(root, dir, 'package.json'), 'utf8'));
}

function writePkg(dir, json) {
  writeFileSync(resolve(root, dir, 'package.json'), `${JSON.stringify(json, null, 2)}\n`);
}

function nextVersion(current, kind) {
  const [maj, min, pat] = current.split('.').map(Number);
  if (maj !== PINNED_MAJOR) {
    throw new Error(
      `expected major=${PINNED_MAJOR} for ${current}; rerun after syncing all packages to ${PINNED_MAJOR}.x`,
    );
  }
  if (kind === 'patch') return `${maj}.${min}.${pat + 1}`;
  return `${maj}.${min + 1}.0`;
}

const baseline = readPkg(PACKAGES[0]).version;
const target = nextVersion(baseline, bump);

console.log(`Bumping ${PACKAGES.length} packages: ${baseline} → ${target}`);

for (const dir of PACKAGES) {
  const pkg = readPkg(dir);
  pkg.version = target;
  writePkg(dir, pkg);
}

console.log('Running build + test before publish…');
execSync('pnpm build', { stdio: 'inherit', cwd: root });
execSync('pnpm test', { stdio: 'inherit', cwd: root });

console.log('Publishing to npm…');
for (const dir of PACKAGES) {
  const name = readPkg(dir).name;
  console.log(`  → ${name}@${target}`);
  execSync('npm publish --tag latest --access public --provenance=false', {
    stdio: 'inherit',
    cwd: resolve(root, dir),
    env: { ...process.env, NPM_CONFIG_PROVENANCE: 'false' },
  });
}

console.log('Forcing dist-tag latest (overrides registry ghosts)…');
for (const dir of PACKAGES) {
  const name = readPkg(dir).name;
  execSync(`npm dist-tag add ${name}@${target} latest`, { stdio: 'inherit', cwd: root });
}

console.log(`\nDone. All ${PACKAGES.length} packages published at ${target}.`);
console.log('Next: commit the package.json bumps + git push.');
