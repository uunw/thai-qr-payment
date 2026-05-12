# AGENT.md

Project context for AI coding agents (Claude Code, Cursor, Continue, Cline, …). Read this first before touching anything.

## TL;DR

Zero-dependency Thai QR Payment / EMVCo MPM toolkit. Monorepo with **7 packages** (`packages/*`) plus 1 umbrella + 5 scoped libs + 1 CLI + 1 React adapter. Browser + Node ≥ 18 + edge-runtime compatible.

```bash
pnpm install
pnpm build         # 7 packages, ~3 s with cache
pnpm test          # 489 vitest assertions across 12 turbo tasks
pnpm check-types
pnpm exec oxlint packages/*/src
pnpm size          # bundle-size budgets via size-limit
pnpm format        # oxfmt write
pnpm format:check
```

## Layout

```
packages/
  thai-qr-payment/   Umbrella — re-exports payload+qr+render, ships CLI bin
  payload/           EMVCo TLV builder + parser (zero dep)
  qr/                ISO/IEC 18004 QR encoder (zero dep)
  render/            High-level SVG card composer
  assets/            Thai QR Payment + PromptPay vector SVGs
  react/             <ThaiQrPayment /> + <ThaiQrPaymentMatrix /> (peer-dep React)
  cli/               thai-qr-payment / tqp bin
scripts/
  build-assets.sh        vtracer + potrace + svgo pipeline (regen logos)
  build-svg-module.mjs   Inline every SVG into a TS module
  compress-dist.mjs      brotli + gzip every dist/*.js (post-build)
  patch-package-meta.mjs Regenerate package.json metadata across workspace
```

Each `packages/*/` has its own `rspack.config.ts`, `tsconfig.json`, `vitest.config.ts`, README, and (for libs) test files. Cross-package boundaries are explicit — every dep lives in the consumer's `package.json` as `workspace:^`.

## Hard rules (do not violate)

1. **Zero runtime deps** in `payload`, `qr`, `render`, `assets`. No `npm install` to add a dep. Write it inline.
2. **No `node:*` imports** outside `@thai-qr-payment/cli`. Everything else must run in browsers + Cloudflare Workers + Deno.
3. **Match existing comment style.** Each module starts with a short top-level rationale block explaining _why_ the file exists, not what each line does.
4. **Don't add features speculatively.** Defer anything that can be added later non-breakingly.
5. **CRC + Reed-Solomon are hot paths.** Profile with `vitest bench` before optimising; don't trust intuition.
6. **Never strip the `.` from "about you." or write the word "AI" into customer-facing strings.** (Inherited from the parent iris repo's brand convention; doesn't strictly apply here but keep generic / brand-neutral language in shipped strings.)
7. **No personal fingerprints in shipped code.** `author` field is `uunw` (no email). Merchant examples use `Acme Coffee`, not real businesses.

## Tooling stack (don't substitute without permission)

| Concern       | Tool                                | Version                   |
| ------------- | ----------------------------------- | ------------------------- |
| Bundle        | rspack + builtin:swc-loader         | ^2.0                      |
| Bundle target | `target: ['web', 'es2022']`         | —                         |
| Format        | **oxfmt** (NOT prettier or biome)   | ^0.48                     |
| Lint          | **oxlint** (NOT eslint)             | ^1.63                     |
| Type-check    | TypeScript composite project refs   | ^6.0                      |
| Tests         | **Vitest**                          | ^4.1                      |
| Versioning    | Changesets (linked across packages) | ^2.31                     |
| Monorepo      | pnpm workspaces + Turborepo         | pnpm 10.33.x / turbo ^2.9 |
| Bundle budget | size-limit + @size-limit/esbuild    | ^12.1                     |
| Pre-commit    | husky + lint-staged + commitlint    | husky ^9                  |

**Notes:**

- pnpm pinned at 10.33.4 (not 11.x — its `verify-deps-before-run` default fights local dev).
- `oxfmt --migrate=prettier|biome` exists if you ever swap upstream tools.
- `@biomejs/biome` was tried + removed in commit `1c5c24e`. Don't reintroduce.

## Builds

`pnpm build` runs turbo with the following per-package pipeline:

- `payload`, `qr`, `render`, `assets`, `cli`, `react` → `rspack build && tsc -p tsconfig.json --emitDeclarationOnly`
- `thai-qr-payment` (umbrella) → same rspack pipeline, but its source imports siblings via **relative paths** (`../../payload/src/index.js`) rather than `@thai-qr-payment/payload`. That way rspack bundles every sibling's source inline, the published tarball has `dependencies: {}`, and npm shows "0 Dependencies". The workspace siblings stay in `devDependencies` for build-time symlink resolution only.

Then a single `node scripts/compress-dist.mjs` precompresses every `dist/*.{js,cjs,d.ts}` with brotli (q=11) + gzip (level 9) so CDNs and self-hosters can serve the smaller variant without runtime work.

**Earlier attempt** (commit `7d2938b`) tried `node scripts/build-umbrella.mjs` (tsc-direct) because rspack-with-externals dropped `export *` from external modules. After removing externals (commit `2d1ed7c`), the rspack pipeline works again with inlined source. Don't reintroduce tsc-direct — it can't bundle.

Output per scoped package:

```
dist/
  index.js       ESM
  index.cjs      CJS
  index.d.ts     Types
  *.js.br        Brotli pre-compressed
  *.js.gz        Gzip pre-compressed
```

Umbrella adds sub-path entries: `payload.js`, `qr.js`, `render.js`, `assets.js`, `cli.js`.

## Testing

**Total: 489 vitest assertions** across 12 turbo tasks. Coverage focuses on:

- **Best-path**: builder fluent surface, round-trip parser, EMVCo wire format, real Thai QR Payment payloads
- **Worst-path**: truncated TLV, tampered CRC, over-cap amounts, NaN/Infinity inputs, XSS in `merchantName`, v40-size matrices
- **Properties**: RS linearity (`enc(a) ⊕ enc(b) = enc(a ⊕ b)`), GF distributivity, CRC determinism
- **Fuzz**: 200 random CRC inputs, 30+30+50 random RS/GF triples, 30 random PromptPay sweeps
- **Spec table pinning**: alignment-pattern centres for v2/3/4/5/6/7/10/14/20/40 match ISO/IEC 18004 Annex E exactly (added after the v0.1.0 scanner-rejection bug)

Per-package counts:

- payload 171 · qr 148 · render 49 · cli 48 · assets 28 · react 19 · umbrella 26

Add tests as `packages/*/src/*.test.ts(x)`. Vitest globs auto-discover them.

**React tests** use `react-dom/server.renderToStaticMarkup` (node env, no jsdom needed).

## Bundle-size budgets (`.size-limit.json`)

| Entry                                        | Budget | Actual (brotli) |
| -------------------------------------------- | -----: | --------------: |
| `thai-qr-payment` (full)                     |  25 KB |     **13.7 KB** |
| `thai-qr-payment` (renderThaiQrPayment)      |  25 KB |         13.6 KB |
| `thai-qr-payment/payload` sub-path           |   5 KB |         3.09 KB |
| `thai-qr-payment/qr` sub-path                |   6 KB |         4.74 KB |
| `@thai-qr-payment/payload` (full)            |   5 KB |         3.09 KB |
| `@thai-qr-payment/payload` (payloadFor only) |   4 KB |         2.98 KB |
| `@thai-qr-payment/qr`                        |   6 KB |         4.75 KB |
| `@thai-qr-payment/render`                    |   2 KB |         1.24 KB |
| `@thai-qr-payment/react`                     |   1 KB |           256 B |
| `@thai-qr-payment/assets`                    |  20 KB |         4.83 KB |

Note: After umbrella inlined siblings, tree-shaking a single helper from `thai-qr-payment` no longer beats the sub-path entry. For consumers who only want one slice, point them at `thai-qr-payment/payload` (or the scoped package directly).

CI runs `andresz1/size-limit-action@v1` on every PR + comments size delta. Keep budgets tight — bumping them needs a one-line justification in the commit.

## Husky hooks

Auto-installed via `prepare: husky` script.

| Hook                | Action                                                                    | Speed    |
| ------------------- | ------------------------------------------------------------------------- | -------- |
| `.husky/pre-commit` | `lint-staged` (oxfmt + oxlint --fix on staged files) + `pnpm check-types` | ~3 s     |
| `.husky/commit-msg` | `commitlint` Conventional Commits validate                                | <100 ms  |
| `.husky/pre-push`   | `check-types` + `build` + `test` + `oxlint` (full suite)                  | ~10-20 s |

Bypass any: `--no-verify`. Use sparingly.

## Commit conventions

Conventional Commits, validated by `commitlint`. Allowed types: `build chore ci docs feat fix perf refactor release revert style test wip`. Subject ≤ 100 chars. Lowercase first word (per `pr-title.yml`).

Examples from repo history:

- `feat(thai-qr-payment): add umbrella package for single-install ergonomics`
- `fix(thai-qr-payment): preserve every re-export via tsc-based build`
- `perf(assets): vectorize logos via vtracer — umbrella 202 KB → 18.5 KB`
- `chore(deps): blanket bump every major to latest`

## GitHub Actions (13 workflows)

| Workflow                    | Triggers                                                              |
| --------------------------- | --------------------------------------------------------------------- |
| `ci.yml`                    | PR + push — Node 20/22 matrix: lint+format+types+build+test+CLI smoke |
| `release.yml`               | push main — Changesets → npm + GitHub Packages with provenance        |
| `codeql.yml`                | PR + weekly cron — security-and-quality scan                          |
| `pr-title.yml`              | PR — Conventional Commits title check                                 |
| `commitlint.yml`            | PR — validate every commit in range                                   |
| `size-limit.yml`            | PR — comment bundle size delta                                        |
| `coverage.yml`              | PR + push — vitest --coverage → Codecov                               |
| `stale.yml`                 | daily — close stale issues/PRs                                        |
| `dependabot-auto-merge.yml` | dependabot PRs — auto-merge patch + minor                             |
| `bench.yml`                 | weekly + dispatch — vitest bench                                      |
| `lockfile-lint.yml`         | PR — pnpm-lock.yaml integrity                                         |
| `smoke-published.yml`       | release + dispatch — install from npm + smoke                         |
| `labeler.yml`               | PR — auto-label by changed paths                                      |

**Dropped (commit `5c9b2db`):**

- `pkg-pr-new.yml` — needs the `pkg-pr-new` GitHub App installed on the repo; re-enable by installing <https://github.com/apps/pkg-pr-new> + restoring the workflow.
- `typedoc.yml` — typedoc CLI didn't produce a `docs-site/` artifact under our config + GitHub Pages wasn't enabled. Re-wire when you actually want hosted API docs.

## Brand asset policy

`@thai-qr-payment/assets` ships only the **canonical** marks (`Thai_QR_Payment_Logo-01` + `PromptPay1`, each in color + silhouette flavors). Logo variants 02-06 + PromptPay2 were dropped in commit `bdadef3` to keep the bundle small.

If you need a specific layout, re-trace via:

```bash
./scripts/build-assets.sh /path/to/raster/source
# produces packages/assets/src/svg/<Name>.svg + <Name>.silhouette.svg
node scripts/build-svg-module.mjs   # regenerates src/generated.ts
```

vtracer (Rust, `cargo install vtracer`) handles colour. potrace (`brew install potrace`) handles silhouette. SVGO multipass runs last.

The marks belong to **Bank of Thailand**, **Thai Bankers' Association**, and **National ITMX**. This repo claims no rights to the marks themselves — only the converter scripts and bundling. Downstream apps must comply with the official Thai QR Payment Brand Guidelines.

## CDN distribution

Pre-compressed `.br` + `.gz` ship inside every published package's `dist/`. CDNs (unpkg, JSDelivr) auto-serve the smaller variant via `Accept-Encoding`.

```html
<script type="module">
  import { renderThaiQrPayment } from 'https://unpkg.com/thai-qr-payment/dist/index.js';
</script>
```

## Live deploys

| Where   | What                         | Version                        |
| ------- | ---------------------------- | ------------------------------ |
| npm     | `thai-qr-payment` (umbrella) | 0.1.1                          |
| npm     | `@thai-qr-payment/payload`   | 0.1.1                          |
| npm     | `@thai-qr-payment/qr`        | 0.1.1                          |
| npm     | `@thai-qr-payment/render`    | 0.1.1                          |
| npm     | `@thai-qr-payment/assets`    | 0.1.1                          |
| npm     | `@thai-qr-payment/react`     | 0.1.1                          |
| npm     | `@thai-qr-payment/cli`       | 0.1.1                          |
| GitHub  | `uunw/thai-qr-payment`       | public, default branch `main`  |
| npm org | `thai-qr-payment`            | free tier (created 2026-05-12) |

All packages signed with **provenance** via Sigstore (GitHub Actions OIDC). Tagged in git as `<pkg>@<version>` by changesets/action on each release.

## Migration history (what's been bumped)

- **Commit `e4af92f` → published v0.1.1** (2026-05-12): Critical fix — `alignmentCentres()` for QR v2-v40 was returning wrong positions, every scanner rejected the output as "invalid QR". The published v0.1.0 had this bug. Verified post-fix by round-tripping every (version, ECC, mask) combo through `jsQR`.
- **Commit `2d1ed7c` → still v0.1.1** (2026-05-12): Inlined scoped siblings into the umbrella. npm UI now correctly shows "0 Dependencies" instead of "5 Dependencies". Moved deps → devDeps in umbrella's `package.json`.
- **Commit `80fe990`** (2026-05-11): Rspack 1→2, Vitest 3→4, TS 5→6, React 18→19, @types/node 22→25, @changesets/changelog-github 0.5→0.7, oxlint 1.0→1.63, turbo 2.5→2.9. Each major was cross-checked against its Context7 migration guide before applying.

**Known gotchas from those bumps:**

- **Rspack 2**: `experiments.outputModule` removed. ESM emission now via `output.module: true` + `output.library.type: 'module' | 'commonjs2'`. We don't use `EsmLibraryPlugin` (removed). Filename uses explicit `.js`/`.cjs` (not `[ext]`).
- **Vitest 4**: removed `poolMatchGlobs`, `environmentMatchGlobs`, `coverage.all`, `coverage.extensions`, `workspace` → `projects`. Options-before-callback in `test()` signature.
- **TS 6**: deprecates `baseUrl`, `outFile`, `module=AMD`, `moduleResolution=classic`, `target=ES5`. Add `ignoreDeprecations: "6.0"` to silence if needed. We don't use any.
- **React 19**: removed string refs, `propTypes`/`defaultProps` for function components, legacy context API. JSX namespace — type return as `ReactElement` (not `JSX.Element`).
- **pnpm**: stays at 10.33.4. pnpm 11's `verify-deps-before-run` + stricter `onlyBuiltDependencies` default blocks dev when esbuild's post-install isn't whitelisted. `.npmrc` carries `verify-deps-before-run=false` and `manage-package-manager-versions=false` as a hedge for future pnpm 11 trial.

## Known landmines (npm + release)

- **npm scope needs an org pre-created.** First publish of `@thai-qr-payment/*` fails with `404 Scope not found` until <https://www.npmjs.com/org/create> is used to make the org. Free tier is fine. The unscoped `thai-qr-payment` umbrella publishes regardless.
- **`npm token create` CLI is broken on npm 11.** It demands a `--description=<name>` flag that older docs don't mention; you'll get `400 Bad Request — Token name is required` otherwise. Easiest workaround: generate a **Granular Access Token via the npm web UI** at <https://www.npmjs.com/settings/<user>/tokens>. Set bypass-2FA on the token + scope it to the packages.
- **`.gitignore` must NOT exclude `.changeset/*.md`.** A previous version of this repo's `.gitignore` had a "Changesets temporary" rule that ignored every changeset markdown — but changesets/action expects those committed. Removed in commit `4083ec5`; don't reintroduce.
- **Dependabot `@dependabot rebase` comments sometimes silently no-op** when there are many outstanding rebases. If a PR still shows stale CI 30 min after the rebase comment, just close it + let dependabot recreate against fresh main.
- **Author email must be `<id>+<username>@users.noreply.github.com`.** Bare `noreply@users.noreply.github.com` (without the GitHub user ID prefix) leaves commits unlinked to your profile on GitHub. Get the ID via `gh api user --jq .id`. Set per-repo via `git config user.email "<id>+<user>@users.noreply.github.com"`.
- **Vitest 4 `--coverage` flag needs an explicit provider package.** `@vitest/coverage-v8` is a devDep here; `vitest.config.ts` declares `coverage.provider: 'v8'`. Without the package, `pnpm test:coverage` errors with `Module not found`.
- **`packages/assets/src/generated.ts` flip-flops between `JSON.stringify`'s double-quote style and oxfmt's single-quote style** every build. Added to `.oxfmtrc.json` `ignorePatterns` to prevent diff churn; if you add another generated file, ignore it too.
- **The PR title check rejects uppercase first word** by default in `amannn/action-semantic-pull-request@v5`. Dependabot uses `"Bump …"` (capital B), so we removed `subjectPattern` from `pr-title.yml` to accept both.
- **`.tmp-test-modules/` and similar scratch dirs** can sneak into commits if you `cp -r node_modules` for local smoke tests. Listed in `.gitignore`; if you do this trick elsewhere, add the path explicitly.

## Adding a new package

1. Mkdir `packages/<name>/src/`, copy `tsconfig.json` from a sibling, write `package.json` with `workspace:^` deps + canonical key order (use `scripts/patch-package-meta.mjs` to enforce metadata)
2. Add a `rspack.config.ts` mirroring the closest sibling
3. Add to `tsconfig.json` (root) `references` array
4. Add to `.changeset/config.json` `linked` array if it should version together
5. `pnpm install` to wire workspace links
6. Write tests in `src/*.test.ts`
7. `pnpm build && pnpm test` to verify

## Adding a feature to an existing package

1. Branch off `main`. Conventional commit style.
2. Code + tests in the same commit.
3. Run gates locally: `pnpm test`, `pnpm exec oxlint packages/*/src`, `pnpm build`, `pnpm check-types`, `pnpm size`.
4. `pnpm changeset` to record the bump (patch/minor/major). The CLI writes a markdown file under `.changeset/`. Commit it.
5. PR. CI runs the same gates.

## Releasing

You don't release directly. When PRs with changeset markdown files land on `main`, the **Release** workflow opens a "Version Packages" PR that consumes them. Merging that PR publishes new versions to npm + GitHub Packages and creates GitHub Releases. All `@thai-qr-payment/*` packages + the unscoped `thai-qr-payment` umbrella are version-linked — bumping one bumps all of them.

## Pivoting tooling? Read first

- `oxfmt` is preview but already shipped (v0.48). If oxfmt regresses, fall back to prettier via `oxfmt --migrate=prettier`; do NOT reintroduce biome (commit `1c5c24e` removed it for a reason — overlapping with oxlint/oxfmt).
- `vtracer` install is `cargo install vtracer` (Rust). Brew has no formula yet. Script falls back to `$HOME/.cargo/bin/vtracer`.
- `pkg-pr-new` workflow was removed (needs GitHub App install). To re-enable: install <https://github.com/apps/pkg-pr-new> on the repo + restore the workflow file from git history.

## Quick reference

```bash
# Generate a QR card via CLI
./packages/thai-qr-payment/dist/cli.js 0812345678 --amount 50 -o /tmp/qr.svg

# Just the payload
./packages/thai-qr-payment/dist/cli.js 0812345678 --amount 50 --format payload

# Just the QR matrix (no card chrome)
./packages/thai-qr-payment/dist/cli.js 0812345678 --amount 50 --format matrix --size 512 -o /tmp/qr.svg

# Library usage from Node / browser / edge
import { renderThaiQrPayment, payloadFor, ThaiQrPaymentBuilder } from 'thai-qr-payment';
import { COLOR_LOGOS } from 'thai-qr-payment/assets';   # sub-path opt-in
```

## Where to ask

- Issues: <https://github.com/uunw/thai-qr-payment/issues>
- Security: GitHub Private Vulnerability Reporting
- Spec questions: EMVCo MPM v1.1 public spec + Bank of Thailand Thai QR Payment supplement (linked from README)
