/**
 * Run on the union of staged files. Pre-commit pipeline.
 *
 * - oxfmt formats only the staged files in-place; lint-staged then
 *   re-stages the formatted versions so the commit picks them up.
 * - oxlint checks every staged TS/JS for correctness/suspicious patterns.
 * - JSON/MD files are formatted by oxfmt as well.
 *
 * The hook intentionally does NOT run `tsc` or `vitest` here — the
 * full type-check fires once afterwards in .husky/pre-commit, and
 * the test suite runs in .husky/pre-push so the staged-file pass
 * stays fast (<2 s).
 */
module.exports = {
  '*.{ts,tsx,js,jsx,mjs,cjs}': ['oxfmt', 'oxlint --fix'],
  '*.{json,md,yml,yaml}': ['oxfmt'],
};
