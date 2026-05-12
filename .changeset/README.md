# Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) to manage versions, changelogs, and publishing.

## Adding a changeset

```bash
pnpm changeset
```

Pick the packages you changed, choose a bump (`patch` / `minor` / `major`), and write a short summary. The CLI saves a markdown file in this directory.

## Releasing

The GitHub Action `.github/workflows/release.yml` consumes accumulated changeset markdown files, bumps versions, regenerates `CHANGELOG.md` per package, and publishes to npm + GitHub Packages on every push to `main`.

All six `@thai-qr-payment/*` packages are **linked** (config: `linked`). They always share the same version number — bumping one bumps all of them.
