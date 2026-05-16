/**
 * Bank of Thailand 1D barcode (bill-payment, counter-scanned).
 *
 * This is intentionally not part of the EMVCo TLV machinery in the rest
 * of the package. The BOT barcode is a `|`-led, `\r`-delimited ASCII
 * string scanned at bank counters and 7-Eleven cashier stations for
 * over-the-counter bill payments — not a QR, not TLV, no CRC. It shares
 * the cross-bank biller-id concept with EMVCo tag 30 but the wire
 * format is otherwise unrelated, so it lives in its own module to keep
 * the TLV builder + parser tree-shake cleanly when callers only need
 * one or the other.
 *
 * Wire shape:  `|<billerId>\r<ref1>\r<ref2>\r<amount>`
 *   - leading pipe is a fixed sentinel
 *   - billerId is 15 chars (Tax ID + suffix), zero-padded if shorter
 *   - ref1 is mandatory (customer/invoice number)
 *   - ref2 may be the empty string if unused
 *   - amount is integer satang (baht × 100), or the literal "0" when
 *     the cashier is expected to key the amount in by hand
 */

const FIELD_SEPARATOR = '\r';
const PAYLOAD_PREFIX = '|';
const BILLER_ID_LENGTH = 15;
const NO_AMOUNT_SENTINEL = '0';
/** 13 chars: "9999999999.99" — matches `formatAmount`'s cap for consistency. */
const MAX_BAHT = 9_999_999_999.99;

export interface BotBarcodeInput {
  /** Cross-bank biller id (Tax ID + suffix). ≤ 15 chars, zero-padded on emit. */
  billerId: string;
  /** Customer / invoice reference. Must be non-empty. */
  ref1: string;
  /** Optional secondary reference. Empty string on the wire if omitted. */
  ref2?: string;
  /**
   * Baht amount. Omit (or pass `undefined`) for a counter-keyed total —
   * the literal "0" is then written and the cashier types the amount.
   */
  amount?: number;
}

export interface ParsedBotBarcode {
  billerId: string;
  ref1: string;
  ref2?: string;
  amount?: number;
}

/**
 * Build a BOT 1D bill-payment barcode payload.
 *
 * Throws `TypeError` / `RangeError` for malformed input — the caller
 * never silently produces an unscannable barcode.
 *
 * @example
 *   buildBotBarcode({ billerId: '099999999999990', ref1: '111222333444' })
 *   // → '|099999999999990\r111222333444\r\r0'
 *
 * @example
 *   buildBotBarcode({
 *     billerId: '099400016550100',
 *     ref1: '123456789012',
 *     ref2: '670429',
 *     amount: 3649.22,
 *   })
 *   // → '|099400016550100\r123456789012\r670429\r364922'
 */
export function buildBotBarcode(input: BotBarcodeInput): string {
  const billerId = normaliseBillerId(input.billerId);
  const ref1 = ensureRef('ref1', input.ref1, { allowEmpty: false });
  const ref2 = ensureRef('ref2', input.ref2 ?? '', { allowEmpty: true });
  const amountField = formatAmountField(input.amount);

  return (
    PAYLOAD_PREFIX +
    billerId +
    FIELD_SEPARATOR +
    ref1 +
    FIELD_SEPARATOR +
    ref2 +
    FIELD_SEPARATOR +
    amountField
  );
}

/**
 * Parse a BOT 1D bill-payment barcode back into its component fields.
 *
 * Returns `null` for any structural issue (missing prefix, wrong field
 * count, biller-id too short) so callers can branch without `try/catch`.
 * The trailing amount is decoded back to baht (e.g. `'364922'` → `3649.22`),
 * and the literal "0" sentinel surfaces as `undefined`.
 *
 * @example
 *   parseBotBarcode('|099999999999990\r111222333444\r\r0')
 *   // → { billerId: '099999999999990', ref1: '111222333444' }
 *
 * @example
 *   parseBotBarcode('|099400016550100\r123456789012\r670429\r364922')
 *   // → {
 *   //     billerId: '099400016550100',
 *   //     ref1: '123456789012',
 *   //     ref2: '670429',
 *   //     amount: 3649.22,
 *   //   }
 */
export function parseBotBarcode(barcode: string): ParsedBotBarcode | null {
  if (typeof barcode !== 'string') return null;
  if (!barcode.startsWith(PAYLOAD_PREFIX)) return null;

  // `\r` delimiters resolve the otherwise-ambiguous variable-length
  // ref1/ref2/amount tail. Four parts exactly — no more, no less.
  const parts = barcode.slice(PAYLOAD_PREFIX.length).split(FIELD_SEPARATOR);
  if (parts.length !== 4) return null;

  const billerId = parts[0]!;
  const ref1 = parts[1]!;
  const ref2 = parts[2]!;
  const amountField = parts[3]!;

  if (billerId.length < BILLER_ID_LENGTH) return null;
  if (ref1.length === 0) return null;

  const result: ParsedBotBarcode = { billerId, ref1 };
  if (ref2.length > 0) result.ref2 = ref2;

  const amount = decodeAmountField(amountField);
  if (amount === 'invalid') return null;
  if (amount != null) result.amount = amount;

  return result;
}

/** Pad short biller ids to the 15-char wire width; reject overlong ones. */
function normaliseBillerId(raw: string): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new TypeError('billerId must be a non-empty string');
  }
  if (raw.includes(FIELD_SEPARATOR)) {
    throw new TypeError('billerId must not contain a carriage return');
  }
  if (raw.length > BILLER_ID_LENGTH) {
    throw new RangeError(`billerId is ${raw.length} chars; max is ${BILLER_ID_LENGTH}`);
  }
  return raw.padStart(BILLER_ID_LENGTH, '0');
}

/** Reject CR and (optionally) empty refs without inventing extra rules. */
function ensureRef(name: 'ref1' | 'ref2', value: string, options: { allowEmpty: boolean }): string {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string`);
  }
  if (!options.allowEmpty && value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  if (value.includes(FIELD_SEPARATOR)) {
    throw new TypeError(`${name} must not contain a carriage return`);
  }
  return value;
}

/** Encode the trailing amount field as integer satang, or the "0" sentinel. */
function formatAmountField(amount: number | undefined): string {
  if (amount == null) return NO_AMOUNT_SENTINEL;
  if (!Number.isFinite(amount)) {
    throw new TypeError('amount must be a finite number');
  }
  if (amount < 0) {
    throw new RangeError('amount must be non-negative');
  }
  if (amount > MAX_BAHT) {
    throw new RangeError(`amount ${amount} exceeds max wire value ${MAX_BAHT}`);
  }
  // Integer math so 0.1 + 0.2 → "30" instead of "30.0000000004".
  const satang = Math.round(amount * 100);
  return satang === 0 ? NO_AMOUNT_SENTINEL : satang.toString(10);
}

/**
 * Decode the trailing amount field.
 *
 * Returns `'invalid'` (a discriminator, not a value) for malformed input,
 * `null` for the "amount entered at counter" sentinel, or the decoded
 * baht number otherwise.
 */
function decodeAmountField(field: string): number | null | 'invalid' {
  if (field.length === 0) return 'invalid';
  if (field === NO_AMOUNT_SENTINEL) return null;
  // BOT spec specifies the amount field as integer satang. Reject any
  // non-digit content (including a stray decimal point or sign).
  for (let i = 0; i < field.length; i += 1) {
    const code = field.charCodeAt(i);
    if (code < 0x30 || code > 0x39) return 'invalid';
  }
  const satang = Number.parseInt(field, 10);
  if (!Number.isFinite(satang)) return 'invalid';
  if (satang === 0) return null;
  // Round-trip through integer math to keep the baht side exact.
  const baht = Math.floor(satang / 100);
  const sub = satang - baht * 100;
  return baht + sub / 100;
}
