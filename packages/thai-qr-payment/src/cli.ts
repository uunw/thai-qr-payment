#!/usr/bin/env node
/**
 * CLI bin — inline copy of the `@thai-qr-payment/cli` runner so the
 * umbrella stays zero-runtime-dep. Bundler inlines the actual CLI
 * source via this import; the published tarball ships a single
 * self-contained dist/cli.js with no transitive lookups.
 */
import '../../cli/src/cli.js';
