/**
 * Re-export the CLI internals so the package can be consumed as a
 * library too (`import { parseArgs } from '@thai-qr-payment/cli'`).
 */

export { parseArgs, HELP_TEXT } from './args.js';
export type { ParsedArgs } from './args.js';
