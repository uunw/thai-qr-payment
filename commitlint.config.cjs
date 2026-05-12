/**
 * Conventional Commits validation.
 *
 * Allowed types come from @commitlint/config-conventional; we add a
 * few project-specific types ('release', 'wip') and a slightly more
 * generous subject length cap (100 chars) so the gate doesn't block
 * legitimate messages.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'release',
        'revert',
        'style',
        'test',
        'wip',
      ],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
