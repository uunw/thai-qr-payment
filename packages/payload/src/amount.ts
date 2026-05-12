/**
 * Amount formatting for tag 54 (Transaction Amount).
 *
 * EMVCo allows up to 13 chars including the decimal point — Thai banks
 * cap the integer part at 10 digits + 2 decimals. We accept either a
 * number (in baht) or a satang-int + flag, and always emit 2 decimals
 * because that's what every Thai banking app re-displays consistently.
 */

const MAX_BAHT = 9_999_999_999.99; // 13 chars: "9999999999.99"

export interface FormatAmountOptions {
  /** When true, treat the input as integer satang (1 baht = 100 satang). */
  fromSatang?: boolean;
}

/**
 * Format an amount for the wire. Returns `null` for static QR (caller
 * intends a "scan and enter any amount" code).
 */
export function formatAmount(
  value: number | bigint | undefined | null,
  options: FormatAmountOptions = {},
): string | null {
  if (value == null) return null;

  let baht: number;
  if (typeof value === 'bigint') {
    baht = options.fromSatang ? Number(value) / 100 : Number(value);
  } else {
    baht = options.fromSatang ? value / 100 : value;
  }

  if (!Number.isFinite(baht)) {
    throw new TypeError('Amount must be a finite number');
  }
  if (baht <= 0) return null;
  if (baht > MAX_BAHT) {
    throw new RangeError(`Amount ${baht} exceeds max wire value ${MAX_BAHT}`);
  }

  // Round to 2 decimals using integer math to dodge float-printout
  // surprises like 0.1 + 0.2 → "0.30000000000000004".
  const cents = Math.round(baht * 100);
  const baht10 = Math.floor(cents / 100);
  const sub = cents - baht10 * 100;
  return `${baht10}.${sub.toString(10).padStart(2, '0')}`;
}
