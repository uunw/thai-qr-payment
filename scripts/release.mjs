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
if (bump !== 'patch' && bump !== 'minor' && bump !== 'publish') {
  console.error('usage: release.mjs <patch|minor|publish> [--otp=123456]');
  console.error('  publish — ship the version already in package.json, no bump');
  process.exit(1);
}

// `npm publish` can't prompt for a 2FA code from under execSync — it exits
// EOTP instead. Pass one through explicitly. Note the code has to outlive
// all seven publishes; if it expires partway, rerun `publish` with a fresh
// one (already-published packages will 403 EPUBLISHCONFLICT, which is safe
// to skip). A granular token with "bypass 2FA" set avoids the race.
const otpArg = process.argv.find((a) => a.startsWith('--otp='));
const otp = otpArg?.slice('--otp='.length);
if (otpArg != null && !/^\d{6}$/.test(otp ?? '')) {
  console.error(`--otp expects a 6-digit code, got: ${otp}`);
  process.exit(1);
}
const otpFlag = otp != null ? ` --otp=${otp}` : '';

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
const target = bump === 'publish' ? baseline : nextVersion(baseline, bump);

if (bump === 'publish') {
  // Ship what's already in package.json. Needed when the bump landed in
  // an earlier commit (or by hand) and only the publish half failed —
  // rerunning `minor` there would overshoot to the next version and
  // strand the one that's tagged.
  const drift = PACKAGES.filter((d) => readPkg(d).version !== target);
  if (drift.length > 0) {
    throw new Error(
      `packages out of lockstep: ${drift.map((d) => `${readPkg(d).name}@${readPkg(d).version}`).join(', ')} (expected ${target})`,
    );
  }
  console.log(`Publishing ${PACKAGES.length} packages at ${target} (no bump)`);
} else {
  console.log(`Bumping ${PACKAGES.length} packages: ${baseline} → ${target}`);
  for (const dir of PACKAGES) {
    const pkg = readPkg(dir);
    pkg.version = target;
    writePkg(dir, pkg);
  }
}

console.log('Running build + test before publish…');
execSync('pnpm build', { stdio: 'inherit', cwd: root });
execSync('pnpm test', { stdio: 'inherit', cwd: root });

// `publishConfig.provenance: true` outranks both `--provenance=false`
// and NPM_CONFIG_PROVENANCE — package.json wins that precedence fight in
// npm 11. Provenance needs an OIDC provider, so a local publish dies on
// `Automatic provenance generation not supported for provider: null`.
// Drop the key for the duration of the publish and put it back after, so
// the committed manifests still request provenance for the day this ships
// from CI. `restore` runs from a finally block: an abort mid-loop must not
// leave seven manifests rewritten on disk.
function stripProvenance() {
  const saved = new Map();
  for (const dir of PACKAGES) {
    const pkg = readPkg(dir);
    if (pkg.publishConfig?.provenance === undefined) continue;
    saved.set(dir, pkg.publishConfig.provenance);
    delete pkg.publishConfig.provenance;
    writePkg(dir, pkg);
  }
  return () => {
    for (const [dir, value] of saved) {
      const pkg = readPkg(dir);
      pkg.publishConfig = { ...pkg.publishConfig, provenance: value };
      writePkg(dir, pkg);
    }
  };
}

console.log('Publishing to npm…');
const restoreProvenance = stripProvenance();
try {
  for (const dir of PACKAGES) {
    const name = readPkg(dir).name;
    console.log(`  → ${name}@${target}`);
    execSync(`npm publish --tag latest --access public --provenance=false${otpFlag}`, {
      stdio: 'inherit',
      cwd: resolve(root, dir),
      env: { ...process.env, NPM_CONFIG_PROVENANCE: 'false' },
    });
  }
} finally {
  restoreProvenance();
}

console.log('Forcing dist-tag latest (overrides registry ghosts)…');
for (const dir of PACKAGES) {
  const name = readPkg(dir).name;
  execSync(`npm dist-tag add ${name}@${target} latest`, { stdio: 'inherit', cwd: root });
}

console.log(`\nDone. All ${PACKAGES.length} packages published at ${target}.`);
console.log('Next: commit the package.json bumps + git push.');
