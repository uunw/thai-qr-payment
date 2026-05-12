# Contributing to thai-qr-payment

Thanks for your interest! This document covers the practical bits: how to get the repo running, how the monorepo is laid out, what's expected before a PR can land.

## Quickstart

```bash
# 1. Fork + clone
git clone https://github.com/<your-fork>/thai-qr-payment.git
cd thai-qr-payment

# 2. Install (pnpm 10+, Node 22+ recommended)
corepack enable
pnpm install

# 3. Verify your checkout builds
pnpm build
pnpm test
pnpm exec oxlint packages/*/src

# 4. Try the CLI
node packages/cli/dist/cli.js 0812345678 --amount 50 -o /tmp/test.svg
open /tmp/test.svg
```

## Layout

```
packages/
  payload/   EMVCo TLV builder + parser (zero dep)
  qr/        QR Code (ISO/IEC 18004) encoder (zero dep)
  assets/    SVG brand marks (Thai QR Payment + PromptPay)
  render/    High-level SVG card composer
  react/     React component bindings
  cli/       thai-qr-payment / tqp CLI
scripts/
  build-assets.sh         Raster → SVG via potrace + magick
  build-svg-module.mjs    Inline every SVG into a TS module
```

Cross-package boundaries are explicit: every dependency lives in the consumer's `package.json` (`workspace:^` for siblings).

## Tooling

| Concern       | Tool                                    | Why                                                                            |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| Build         | rspack + swc                            | Fast, ESM + CJS in one config, swc minifier (smaller than terser for our code) |
| Bundle target | `target: ['web', 'es2022']`             | Works in browsers, Node ≥ 18, Bun, Deno, edge runtimes                         |
| Format        | oxfmt                                   | Prettier-compatible config, Rust-fast, single binary, no plugin matrix         |
| Lint          | oxlint                                  | Fast Rust-based replacement for ESLint; CI gate                                |
| Types         | TypeScript composite project references | Per-package builds + cross-references                                          |
| Tests         | Vitest                                  | Same syntax as Jest, faster, ESM-native                                        |
| Versioning    | Changesets                              | Linked versions across packages; markdown-driven changelogs                    |
| Monorepo      | pnpm workspaces + Turborepo             | Cached parallel task graph                                                     |

## Workflows

### Adding a feature

1. Branch off `main`. Conventional commit style: `feat(payload): add tip-percentage support`.
2. Write the code + tests in the same commit.
3. Run `pnpm test`, `pnpm exec oxlint packages/*/src`, `pnpm build`, `pnpm check-types`.
4. Record a changeset: `pnpm changeset`. Choose the affected packages and the bump level. The CLI writes a markdown file under `.changeset/`. Commit it.
5. Open a PR. CI runs the same gates.

### Releasing

You don't release directly. When PRs with changeset files land on `main`, the **Release** workflow (`.github/workflows/release.yml`) opens a "Version Packages" PR that consumes them. Merging that PR publishes the new versions to npm + GitHub Packages and creates GitHub Releases.

All six `@thai-qr-payment/*` packages are version-linked — bumping one bumps all of them.

### Updating brand assets

If the upstream artwork changes (or you want to add another mark):

1. Drop the new raster into the source folder. Default is `/Users/uunw/Downloads/Thai_QR_Payment_Logo/Thai QR`; pass a different path as the first arg to the script.
2. `pnpm --filter @thai-qr-payment/assets clean`
3. `./scripts/build-assets.sh [/path/to/raster/dir]`
4. `pnpm --filter @thai-qr-payment/assets build`
5. Commit both the new `packages/assets/src/svg/*.svg` files and the regenerated `packages/assets/src/generated.ts`.

## Coding guidelines

- **Zero runtime deps** in `payload`, `qr`, `assets`, `render`. The whole point. Never reach for an npm install — write it inline.
- **No `Node:` imports** outside of `@thai-qr-payment/cli`. The other packages must run in browsers and edge runtimes.
- **Match existing comment style.** Each module has a short top-level rationale block explaining _why_ the file exists (not what each line does).
- **Don't add features speculatively.** If the user-facing API can be added later without a breaking change, defer it.
- **CRC + RS-ECC are hot paths.** When optimising the QR encoder, profile with Vitest's `bench` first; don't trust your gut.

## Brand asset policy

`@thai-qr-payment/assets` redistributes Thai QR Payment + PromptPay artwork in SVG form. The marks belong to the **Bank of Thailand**, **Thai Bankers' Association**, and **National ITMX**. This repo claims **no rights to the marks themselves** — only the converter scripts and bundling. Downstream apps must comply with the official Thai QR Payment Brand Guidelines.

If a rights-holder requests removal of a specific mark, open an issue or email the maintainer. We will remove it from the next published version within 7 days.

## Reporting security issues

Do **not** open a public issue. Use [GitHub Private Vulnerability Reporting](https://github.com/uunw/thai-qr-payment/security/advisories/new) with the details. Affected versions will get a patched release + GitHub Security Advisory within 14 days.

## License

By contributing you agree your changes are licensed under the project's MIT license. See [LICENSE](./LICENSE).
