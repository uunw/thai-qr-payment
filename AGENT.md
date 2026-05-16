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
  react/             <ThaiQRPayment /> + <ThaiQRPaymentMatrix /> (peer-dep React)
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

| Concern       | Tool                                                                                                     | Version                   |
| ------------- | -------------------------------------------------------------------------------------------------------- | ------------------------- |
| Bundle        | rspack + builtin:swc-loader                                                                              | ^2.0                      |
| Bundle target | `target: ['web', 'es2022']`                                                                              | —                         |
| Format        | **oxfmt** (NOT prettier or biome)                                                                        | ^0.48                     |
| Lint          | **oxlint** (NOT eslint)                                                                                  | ^1.63                     |
| Type-check    | TypeScript composite project refs                                                                        | ^6.0                      |
| Tests         | **Vitest**                                                                                               | ^4.1                      |
| Versioning    | Manual lockstep via `scripts/release.mjs` (major pinned at 1). Changesets kept only for changelog notes. | ^2.31                     |
| Monorepo      | pnpm workspaces + Turborepo                                                                              | pnpm 10.33.x / turbo ^2.9 |
| Bundle budget | size-limit + @size-limit/esbuild                                                                         | ^12.1                     |
| Pre-commit    | husky + lint-staged + commitlint                                                                         | husky ^9                  |

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
| `thai-qr-payment` (renderThaiQRPayment)      |  25 KB |         13.6 KB |
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
| `.husky/pre-push`   | `check-types` + `build` + `test` + `oxlint` + `format:check` (full suite) | ~10-20 s |

Bypass any: `--no-verify`. Use sparingly.

## Commit conventions

Conventional Commits, validated by `commitlint`. Allowed types: `build chore ci docs feat fix perf refactor release revert style test wip`. Subject ≤ 100 chars. Lowercase first word (per `pr-title.yml`).

Examples from repo history:

- `feat(thai-qr-payment): add umbrella package for single-install ergonomics`
- `fix(thai-qr-payment): preserve every re-export via tsc-based build`
- `perf(assets): vectorize logos via vtracer — umbrella 202 KB → 18.5 KB`
- `chore(deps): blanket bump every major to latest`

## GitHub Actions (13 workflows)

| Workflow                    | Triggers                                                                          |
| --------------------------- | --------------------------------------------------------------------------------- |
| `ci.yml`                    | PR + push — Node 20/22 matrix: lint+format+types+build+test+CLI smoke             |
| `release.yml`               | **disabled** — manual `workflow_dispatch` stub. Use `pnpm release:minor` locally. |
| `codeql.yml`                | PR + weekly cron — security-and-quality scan                                      |
| `pr-title.yml`              | PR — Conventional Commits title check                                             |
| `commitlint.yml`            | PR — validate every commit in range                                               |
| `size-limit.yml`            | PR — comment bundle size delta                                                    |
| `coverage.yml`              | PR + push — vitest --coverage → Codecov                                           |
| `stale.yml`                 | daily — close stale issues/PRs                                                    |
| `dependabot-auto-merge.yml` | dependabot PRs — auto-merge patch + minor                                         |
| `bench.yml`                 | weekly + dispatch — vitest bench                                                  |
| `lockfile-lint.yml`         | PR — pnpm-lock.yaml integrity                                                     |
| `smoke-published.yml`       | release + dispatch — install from npm + smoke                                     |
| `labeler.yml`               | PR — auto-label by changed paths                                                  |

**Dropped (commit `5c9b2db`):**

- `pkg-pr-new.yml` — needs the `pkg-pr-new` GitHub App installed on the repo; re-enable by installing <https://github.com/apps/pkg-pr-new> + restoring the workflow.
- `typedoc.yml` — typedoc CLI didn't produce a `docs-site/` artifact under our config + GitHub Pages wasn't enabled. Re-wire when you actually want hosted API docs.

## Brand asset policy

`@thai-qr-payment/assets` ships:

- `Thai_QR_Payment_Logo-01` — color + silhouette (vectorised via vtracer, colours unified to brand spec `#00427A` + `#00A796`)
- `PromptPay1` — color + silhouette (mono w/ rounded border frame)
- `PromptPay2` — **color only** (navy bg, pairs with the navy header). Ships as an **embedded PNG** inside an SVG `<image>` wrapper because vtracer turns wordmark glyphs into jagged polygons; the raster keeps fonts smooth at every render size. Re-added in v0.1.2 after the original drop in commit `bdadef3`.

The silhouette registry is allowed to be a **subset** of the color registry — marks without a silhouette twin (PromptPay2) fall back to their color version when the silhouette theme is requested.

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
  import { renderThaiQRPayment } from 'https://unpkg.com/thai-qr-payment/dist/index.js';
</script>
```

## Live deploys

| Where   | What                             | Version                                                      |
| ------- | -------------------------------- | ------------------------------------------------------------ |
| npm     | `thai-qr-payment` (umbrella)     | 1.1.0 (major pinned at 1 — see release script)               |
| npm     | `@thai-qr-payment/payload`       | 1.1.0                                                        |
| npm     | `@thai-qr-payment/qr`            | 1.1.0                                                        |
| npm     | `@thai-qr-payment/render`        | 1.1.0                                                        |
| npm     | `@thai-qr-payment/assets`        | 1.1.0                                                        |
| npm     | `@thai-qr-payment/react`         | 1.1.0                                                        |
| npm     | `@thai-qr-payment/cli`           | 1.1.0                                                        |
| Docs    | <https://thai-qr-payment.js.org> | Astro Starlight, 16 pages, served via js.org → CF → GH Pages |
| GitHub  | `uunw/thai-qr-payment`           | public, default branch `main`                                |
| npm org | `thai-qr-payment`                | free tier (created 2026-05-12)                               |

CI builds previously signed publishes with **provenance** via Sigstore (GitHub Actions OIDC). After the cascade reset (see landmines below) releases now go through `scripts/release.mjs` from a local machine — provenance is disabled there because there is no OIDC token off-CI. Re-enable provenance only if you put publish back inside GitHub Actions.

## Releasing

Manual, deliberate, locked at `major=1`.

```bash
pnpm release:patch    # 1.1.0 → 1.1.1
pnpm release:minor    # 1.1.0 → 1.2.0
```

`scripts/release.mjs` bumps every `packages/*/package.json` to the same `1.MINOR.PATCH`, builds, runs the test suite, then `npm publish --tag latest --provenance=false` for each package in dependency order. After publish it issues `npm dist-tag add @pkg@<new> latest` for every package — required because the registry ghosts (`2.0.0` / `3.0.0` / `4.0.0`) are higher in semver order than any new `1.x` release and npm would otherwise leave `latest` pointing at the ghost. The script refuses to run if `package.json` has slipped off the `1.x` line — major bumps must be done by editing the script and acknowledging the rule break.

The `release.yml` GitHub Action is intentionally a no-op stub (`workflow_dispatch` only, prints a hint) so a stray push can't restart the cascade. Re-enable it only if the upstream changesets behaviour around `linked` / `fixed` is proven drift-proof — see the landmines.

The `.changeset/` directory is kept around for CHANGELOG generation only. Add a changeset for the human-readable note (`pnpm changeset`) and let the release script handle the versioning — do **not** run `pnpm changeset version` or merge a changesets release PR.

## Migration history (what's been bumped)

- **Commits `546a0e8` + `3601d99` → docs polish, no version bump** (2026-05-16): Demo crashed on every render after the v1.1.0 rename because the new `QrDemo.tsx` passed `{ wire }` to `renderThaiQRPayment` — which expects `{ recipient }`, not the pre-built wire. Fixed by switching the demo to `encodeQR(wire)` + `renderCard(matrix, …)` so every application path (PromptPay / BankAccount / BillPayment / TrueMoney) renders the exact bytes the builder emitted. Same commit window also added a "For LLMs" sidebar group with collapsible external links to `/llms.txt`, `/llms-full.txt`, `/llms-small.txt` (opens in new tabs via `attrs.target=_blank`). Docs-only — no npm publish.
- **Commit `15f5251` → published v1.1.0 (all 7 packages) + deprecated 2.x / 3.x / 4.x ghosts** (2026-05-16): Hard rename of every PascalCase acronym (Qr→QR, Crc→CRC, Tlv→TLV, Svg→SVG, Vat→VAT, Tqrc→TQRC, Bot→BOT) across the public surface — `ThaiQRPaymentBuilder`, `ParsedCRC`, `TLVField`, `QRMatrix`, `QRSvgOptions`, `VATTQRCInput`, `ParsedVATTQRC`, `BOTBarcodeInput`, `ParsedBOTBarcode`, the React `<ThaiQRPayment />` / `<ThaiQRPaymentMatrix />` (+ their `*Props`), `renderThaiQRPayment` / `…Matrix`, `renderQRSvg`, `buildBOTBarcode`, `parseBOTBarcode`. Methods kept camelCase per TS norm (`.vatTqrc()`, `.ota()`). Also disabled the `release.yml` automation, introduced `scripts/release.mjs` that pins `major=1`, expanded the live demo to three tabs (Payment QR / Slip Verify / BOT Barcode), and deprecated the `2.0.0` / `3.0.0` / `4.0.0` ghost versions with an explanatory message pointing at the `1.x` line.
- **Commits `7ae8f9d` + `5a5a62e` + manual dist-tag reset + `e65ca90` → published v1.0.0 (all 7 packages, with 2.0.0 + 3.0.0 ghost versions stranded)** (2026-05-16): Two rounds of feature work shipped seven new wire-format surfaces (`parsePayload({ strict })`, truncated-CRC auto-fix, raw-tag accessors, `.trueMoney()`, `.bankAccount()`, `.ota()`, `.vatTqrc()`, `.billPayment({ crossBorder })`, plus Slip Verify Mini-QR, TrueMoney Slip Verify, BOT 1D barcode). Docs site grew to 16 pages with new guide pages for slip-verify + barcode and an updated reference/spec table covering tag 80 + the new sub-tags. Tests: payload package 290 → 337 + new modules (28 slip-verify + 42 barcode + 7 message codec). Bundle: 5.37 KB brotli payload, 22.42 KB umbrella. **Versions then went chaotic** — see the "linked-changesets cascade" landmine below; final state is all seven packages aligned at 1.0.0 via `npm dist-tag` + a manual qr/assets publish, with 2.0.0 / 3.0.0 left on the registry as un-unpublishable ghosts. Changesets config switched from `linked` → `fixed` to lock future releases in lockstep.
- **Commits `ba9e8e8` + `7d07f64` → published v0.1.3 (all 7 packages) + v0.1.4 (`thai-qr-payment` + `@thai-qr-payment/render`)** (2026-05-15): Docs site moved from `https://uunw.github.io/thai-qr-payment/` to `https://thai-qr-payment.js.org` (js.org subdomain merged in [js-org/js.org#11306](https://github.com/js-org/js.org/pull/11306)); `astro.config.mjs` dropped its `/thai-qr-payment` base path; every package.json `homepage` repointed at the new domain (sub-packages link to `/guide/<name>/`). rspack configs now ship `.js.map` sourcemaps (`devtool: 'source-map'`) and keep original function/class names through SWC minification (`mangle: { keep_classnames: true, keep_fnames: true }`) — published bundles are now traceable to source and no longer trip Socket's "Obfuscated code" supply-chain alert. `renderQRSvg()` numeric attributes (`size`, `quietZone`, `matrix.size`) routed through a `toSafeUint()` finite-non-negative-integer guard before HTML interpolation — closes 7 CodeQL `js/html-constructed-from-input` alerts on `packages/render/src/matrix-svg.ts`. Bundle sizes unchanged (umbrella 20.82 KB / 25 KB budget).
- **Commits `c3b199d` + `c46857d` → published v0.1.2** (2026-05-13): Brand-spec card redesign — full-width navy header strip, TQR Maximum Blue (`#00427A`) unified across `Thai_QR_Payment_Logo-01.svg` (replacing vtracer's `#0e3d67` + six auxiliary shades), `PromptPay2` (navy) is now the default sub-mark for `theme: 'color'` shipped as an embedded PNG inside an SVG `<image>` wrapper, QR fill decoupled from accent via new `qrColor` option (defaults to `#000000` for scanner contrast). CI matrix bumped to Node 22 + 24 because the Astro docs build needs Node >= 22.12.
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
- **vtracer turns wordmark glyphs into jagged polygons.** For text-heavy assets (PromptPay2), embed the source PNG inside an SVG `<image>` wrapper instead of vector-tracing it. ~9 KB base64 vs ~12 KB jagged trace; renders smooth at every scale. Pure-vector marks (icons + simple logos) trace fine. Generate via `base64 -i logo.png | tr -d '\n'` then wrap with `<svg width=... height=...><image href="data:image/png;base64,..."/></svg>`.
- **`unwrapSvg` must fall back to width/height when `viewBox` is absent.** Hand-authored / Illustrator-exported SVGs often omit `viewBox` and rely on `width=` + `height=` alone. Without the fallback the `<symbol>` defaults to `0 0 100 100` and the artwork renders 0.5-px tall. Implemented in `packages/render/src/card.ts unwrapSvg`.
- **`unwrapSvg` must strip `<?xml ?>` AND leading `<!-- -->` comments before the outer `<svg>`.** vtracer output starts with `<?xml ... ?>\n<!-- Generator: visioncortex VTracer ... -->\n<svg>`. The naive `^<svg` regex fails because comments push the `<svg>` off the line start; result is 2 `<svg>` tags in the final composite SVG. Three-step strip handles it.
- **Stale `.tsbuildinfo` in `dist/` blocks TSC project-reference resolution.** After regenerating `src/generated.ts` (e.g. adding a new SVG → new exported const), `tsc --emitDeclarationOnly` may keep emitting the old `dist/generated.d.ts` because the buildinfo says "nothing changed". Wipe `packages/*/dist/.tsbuildinfo` and rebuild deps in dependency order (assets → payload → qr → render).
- **Brand color is `#00427A` ("TQR Maximum Blue"), NOT `#0e3d67`.** vtracer's default colour clustering picked `#0e3d67` + six auxiliary shades (`#103e68`, `#113f68`, `#124069`, `#19446d`, `#1a456d`, `#1b466e`, `#0f3e67`) as approximations. The brand book §4 specifies CMYK 100/60/0/40 = RGB 0/66/122 = `#00427A`. Unify all variants to the canonical hex; same goes for the iris glyph `#1ba997` → `#00A796` (brand secondary green). `perl -i -pe 's/#0e3d67/#00427A/gi; …'` on the source SVG is the fix.
- **Astro docs toolchain requires Node >= 22.12.** CI matrix `node: ['20', '22']` failed on Node 20 because `pnpm build` includes the Astro docs site via turbo. Either drop Node 20 from CI matrix or filter docs out of the build pipeline. Lib runtime still works on Node 18+ per `engines` field.
- **js.org subdomains sit behind Cloudflare's proxy by default — GH Pages cert never provisions.** GH's Let's Encrypt DCV checks the public IP, sees Cloudflare's IPs (104.26.x.x / 172.67.x.x), and fails. `gh api -X PUT repos/<owner>/<repo>/pages -F https_enforced=true` returns `404 The certificate does not exist yet` indefinitely. **HTTPS works regardless** — Cloudflare's Universal SSL terminates TLS at the edge and 301-redirects HTTP. Don't try to "fix" the missing GH cert; it's by design. The only opt-out is adding `// noCF` to your `cnames_active.js` entry via a follow-up js.org PR, which costs you the CDN. Pages CNAME was set via `gh api -X PUT repos/uunw/thai-qr-payment/pages -f cname=thai-qr-payment.js.org` (the `https_enforced` flag stays `false`).
- **rspack/swc default `mangle: true` triggers Socket "Obfuscated code" supply-chain alert.** SWC's `SwcJsMinimizerRspackPlugin` with `mangle: true` renames every function and class to single letters; Socket flags this as obfuscation regardless of intent. Two-line fix per `rspack.config.ts`: `devtool: 'source-map'` + `mangle: { keep_classnames: true, keep_fnames: true }`. Bundle size impact is negligible (umbrella 20.82 KB on a 25 KB budget). Published `.tgz` now ships `.js.map` next to every entrypoint — set in commit `ba9e8e8`.
- **CodeQL `js/html-constructed-from-input` flags numeric values too, not just strings.** Even integers from a typed options object trigger the alert when interpolated into HTML attributes (`width="${size}"`). TypeScript types don't enforce at runtime, so JS callers can still pass `NaN` / `Infinity` / strings. Coerce through `Number.isFinite` + `Math.floor` + non-negative gate at the renderer boundary; CodeQL recognises this as a sanitizer barrier and the alerts auto-close on the next scan. Pattern in `packages/render/src/matrix-svg.ts toSafeUint()`.
- **js.org PR validator demands the EXACT template — paraphrasing or reordering kills the bot check.** The `jsorg-validation` GitHub Action greps the PR description for literal phrases from `PULL_REQUEST_TEMPLATE.md`; missing-checkbox / missing-content-URL / wrong-format errors all surface as "PR description validation failed". Fetch the template raw (`curl https://raw.githubusercontent.com/js-org/js.org/master/PULL_REQUEST_TEMPLATE.md`) and edit only the fillable bits. Once the bot passes, MattIPv4 reviews → indus / a maintainer merges (turnaround was ~30 min for #11306 after the description fix).
- **Changesets `linked` / `fixed` both cascade into runaway major bumps when a tag-along package lacks a changeset.** With seven packages in one `linked` array a `minor` changeset that lists only two of them bumped those two AND auto-promoted the other five — but only the linked siblings already at the same version, so stragglers stayed put. The next round trying to "catch up" the straggler then bumped the entire family past its current peak, so `0.1.x → 0.2.0` overshot to `1.0.0`, then `2.0.0`, then `3.0.0`, then `4.0.0` over four cycles. Switching to `fixed` did not help — `fixed` enforces uniform versions but escalates to the next major above the registry peak when current versions disagree. Net: the changesets release loop is structurally incompatible with this workspace's lockstep + registry-ghost situation. **Permanent fix**: `release.yml` automation is disabled; `scripts/release.mjs` is the only release path and pins `major=1`. Changesets is kept only for human-readable changelog notes (`pnpm changeset`) — never run `pnpm changeset version` or merge a "Version Packages" PR. The 2.0.0 / 3.0.0 / 4.0.0 ghosts are deprecated on npm with an explanatory message and can never be removed (`npm unpublish` is blocked by registry dependent checks).
- **`npm unpublish` is blocked for any version with registry dependents — including transitive devDependency edges from already-unpublished packages.** Trying to remove `@thai-qr-payment/cli@3.0.0` returned `E405 has dependent packages in the registry` even after the only candidate dependent (umbrella `thai-qr-payment@3.0.0`) was already gone. The registry's dependent-counter lags by an indefinite amount and may never refresh. Don't plan recoveries around `unpublish`; rely on `npm dist-tag add <pkg>@<good-version> latest` to redirect installs, and accept the ghost versions stay live forever for anyone explicitly pinned.
- **Granular `bypass 2FA` token is required for any non-OTP npm write operation, even with 2FA disabled on the account.** `npm profile set tfa disabled` removes the OTP prompt from `npm login` but does NOT remove it from `npm publish` / `npm unpublish` / `npm dist-tag` — the registry still returns `E403 Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages`. Real path: create a Granular Access Token at <https://www.npmjs.com/settings/uunw/tokens/new> with `Bypass 2FA` checked, export it as `NPM_CONFIG_USERCONFIG=/tmp/npmrc` pointing at a file with `//registry.npmjs.org/:_authToken=npm_…`, do the batch, then revoke immediately. The token is invisible to `npm token list` (CLI only sees classic tokens) so revocation has to go through the web UI.
- **Manual `npm publish` from local needs `--provenance=false` even though `package.json` has `publishConfig.provenance: true`.** The provenance attestation comes from a GitHub Actions OIDC token — locally there's no provider, so the CLI errors with `EUSAGE Automatic provenance generation not supported for provider: null`. Override per-call with `--provenance=false` or globally with `NPM_CONFIG_PROVENANCE=false`. The CI path (`.github/workflows/release.yml`) always has the OIDC token, so leave the `publishConfig.provenance: true` in `package.json` and only override on local fire-drill publishes.

## Adding a new package

1. Mkdir `packages/<name>/src/`, copy `tsconfig.json` from a sibling, write `package.json` with `workspace:^` deps + canonical key order (use `scripts/patch-package-meta.mjs` to enforce metadata)
2. Add a `rspack.config.ts` mirroring the closest sibling
3. Add to `tsconfig.json` (root) `references` array
4. Add the new package's directory to the `PACKAGES` array at the top of `scripts/release.mjs` — that's how a new package joins the lockstep release. The `.changeset/config.json` `fixed` array is also updated for changelog continuity but does not drive the actual versioning (see "linked / fixed cascade" landmine).
5. `pnpm install` to wire workspace links
6. Write tests in `src/*.test.ts`
7. `pnpm build && pnpm test` to verify

## Adding a feature to an existing package

1. Branch off `main`. Conventional commit style.
2. Code + tests in the same commit.
3. Run gates locally: `pnpm test`, `pnpm exec oxlint packages/*/src`, `pnpm build`, `pnpm check-types`, `pnpm size`.
4. `pnpm changeset` to record the bump (patch/minor/major). The CLI writes a markdown file under `.changeset/`. Commit it.
5. PR. CI runs the same gates.

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
import { renderThaiQRPayment, payloadFor, ThaiQRPaymentBuilder } from 'thai-qr-payment';
import { COLOR_LOGOS } from 'thai-qr-payment/assets';   # sub-path opt-in
```

## Where to ask

- Issues: <https://github.com/uunw/thai-qr-payment/issues>
- Security: GitHub Private Vulnerability Reporting
- Spec questions: EMVCo MPM v1.1 public spec + Bank of Thailand Thai QR Payment supplement (linked from README)
