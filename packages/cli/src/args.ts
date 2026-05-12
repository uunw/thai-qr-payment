/**
 * Argv parser for the CLI. Intentionally tiny — no commander/yargs
 * dependency to keep the bundle slim and the start-up time low.
 */

export interface ParsedArgs {
  recipient?: string;
  amount?: number;
  type?: 'mobile' | 'nationalId' | 'eWallet';
  fromSatang?: boolean;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  format?: 'card' | 'matrix' | 'payload';
  theme?: 'color' | 'silhouette';
  merchantName?: string;
  output?: string;
  size?: number;
  help?: boolean;
  version?: boolean;
}

const TYPE_VALUES = new Set(['mobile', 'nationalId', 'eWallet']);
const ECC_VALUES = new Set(['L', 'M', 'Q', 'H']);
const FORMAT_VALUES = new Set(['card', 'matrix', 'payload']);
const THEME_VALUES = new Set(['color', 'silhouette']);

/** Pull the value for `--flag value` or `--flag=value`. */
function takeValue(args: string[], i: number): { value: string; next: number } {
  const current = args[i] ?? '';
  const eq = current.indexOf('=');
  if (eq !== -1) {
    return { value: current.slice(eq + 1), next: i + 1 };
  }
  const next = args[i + 1];
  if (next == null) throw new TypeError(`Flag ${current} expects a value`);
  return { value: next, next: i + 2 };
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i] ?? '';
    if (arg === '-h' || arg === '--help') {
      out.help = true;
      i += 1;
      continue;
    }
    if (arg === '-v' || arg === '--version') {
      out.version = true;
      i += 1;
      continue;
    }
    if (arg.startsWith('--recipient') || arg === '-r') {
      const { value, next } = takeValue(argv as string[], i);
      out.recipient = value;
      i = next;
      continue;
    }
    if (arg.startsWith('--amount') || arg === '-a') {
      const { value, next } = takeValue(argv as string[], i);
      out.amount = Number.parseFloat(value);
      i = next;
      continue;
    }
    if (arg.startsWith('--type')) {
      const { value, next } = takeValue(argv as string[], i);
      if (!TYPE_VALUES.has(value)) throw new TypeError(`Unknown --type "${value}"`);
      out.type = value as ParsedArgs['type'];
      i = next;
      continue;
    }
    if (arg === '--satang') {
      out.fromSatang = true;
      i += 1;
      continue;
    }
    if (arg.startsWith('--ecc') || arg.startsWith('--error-correction')) {
      const { value, next } = takeValue(argv as string[], i);
      const upper = value.toUpperCase();
      if (!ECC_VALUES.has(upper)) throw new TypeError(`Unknown --ecc "${value}"`);
      out.errorCorrection = upper as ParsedArgs['errorCorrection'];
      i = next;
      continue;
    }
    if (arg.startsWith('--format') || arg === '-f') {
      const { value, next } = takeValue(argv as string[], i);
      if (!FORMAT_VALUES.has(value)) throw new TypeError(`Unknown --format "${value}"`);
      out.format = value as ParsedArgs['format'];
      i = next;
      continue;
    }
    if (arg.startsWith('--theme')) {
      const { value, next } = takeValue(argv as string[], i);
      if (!THEME_VALUES.has(value)) throw new TypeError(`Unknown --theme "${value}"`);
      out.theme = value as ParsedArgs['theme'];
      i = next;
      continue;
    }
    if (arg.startsWith('--merchant') || arg === '-m') {
      const { value, next } = takeValue(argv as string[], i);
      out.merchantName = value;
      i = next;
      continue;
    }
    if (arg.startsWith('--output') || arg === '-o') {
      const { value, next } = takeValue(argv as string[], i);
      out.output = value;
      i = next;
      continue;
    }
    if (arg.startsWith('--size')) {
      const { value, next } = takeValue(argv as string[], i);
      out.size = Number.parseInt(value, 10);
      i = next;
      continue;
    }
    if (!out.recipient && !arg.startsWith('-')) {
      // Positional recipient if not yet set.
      out.recipient = arg;
      i += 1;
      continue;
    }
    throw new TypeError(`Unknown flag: ${arg}`);
  }
  return out;
}

export const HELP_TEXT = `thai-qr-payment — generate a Thai QR Payment / PromptPay SVG

USAGE
  thai-qr-payment [options] <recipient>

OPTIONS
  -r, --recipient <id>       Phone (0812345678), national ID (13 digits), or e-wallet ID (15 digits)
  -a, --amount <thb>         Transaction amount in baht. Omit for static QR.
      --satang               Treat --amount as integer satang
      --type <kind>          mobile | nationalId | eWallet (auto-detected by default)
      --ecc <level>          QR error correction: L | M | Q | H (default: M)
  -f, --format <kind>        card (default) | matrix | payload
      --theme <kind>         color (default) | silhouette
  -m, --merchant <name>      Optional merchant name above the QR
      --size <px>            Output size in pixels (matrix format only)
  -o, --output <path>        Write output to file instead of stdout
  -h, --help                 Show this help
  -v, --version              Show CLI version

EXAMPLES
  # Static PromptPay card to stdout
  thai-qr-payment 0812345678

  # Dynamic 50 THB card written to file
  thai-qr-payment 0812345678 --amount 50 -o qr.svg

  # Bare QR matrix, 512 px, with H ECC
  thai-qr-payment 0812345678 --format matrix --ecc H --size 512

  # Print just the EMVCo wire payload
  thai-qr-payment 0812345678 --amount 50 --format payload
`;
