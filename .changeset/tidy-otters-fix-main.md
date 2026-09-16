---
'thai-qr-payment': patch
'@thai-qr-payment/react': patch
---

Fix broken `pnpm install --frozen-lockfile` and React version mismatch on `main`

Two regressions landed via dependabot PRs and left the default branch red:

- The rspack group bump (#108) rewrote `@rspack/core` in `pnpm-lock.yaml` to
  `catalog:` without changing `pnpm-workspace.yaml`'s catalog block or the root
  manifest, so every CI install aborted with `ERR_PNPM_OUTDATED_LOCKFILE`.
  Root `package.json` now uses `catalog:` to match the lockfile.
- The react-dom bump (#115) split the workspace between `react@19.2.8` and
  `react-dom@19.3.0`; `react-dom@19.3.0` peers `react@^19.3.0`, so the docs
  build and the React package tests both crashed with a version-mismatch error.
  `react` is pinned to `^19.3.0` in `docs`, `packages/react`, and `examples/node`.

Together these unblock CI for the six dependabot PRs that were stuck with
`CONFLICTING` merge state and no checks ever starting.
