#!/usr/bin/env node
/**
 * CLI shim — delegates to `@thai-qr-payment/cli` so `npx thai-qr-payment`
 * and `npx tqp` both work after a top-level install.
 *
 * The downstream CLI module self-executes on import (it calls `main()`
 * at top level), so a bare import is sufficient. We reach for the
 * package's `./bin` sub-path entry rather than `./dist/cli.js` so we
 * don't depend on internal layout.
 */
import '@thai-qr-payment/cli/bin';
