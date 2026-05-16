/**
 * Slip Verify Mini-QR — a different envelope from PromptPay payments.
 *
 * Banks print a small "Mini-QR" on transfer slips (and inside the PromptPay
 * mobile-app slip view) so an Open API lookup can resolve the transaction
 * after an OCR / scan. The envelope shares the EMVCo TLV grammar but uses
 * its own root tags: a single nested template at tag 00, a country tag 51,
 * and a CRC at tag 91 — not tag 63 like a payment QR. This module wraps
 * the build / parse round-trip for the standard slip-verify shape and the
 * TrueMoney variant (different sub-fields, lowercase CRC hex).
 *
 * The parsers reject any payload that doesn't carry the slip-verify
 * envelope, and tolerate banks that ship a 1-3 character CRC by padding
 * with leading zeros until the checksum matches.
 */

import { checksum } from './crc.js';
import { encodeField, encodeFields, parseFields } from './tlv.js';

// ── Envelope tags shared by both slip-verify variants ───────────────────
const TAG_ROOT_TEMPLATE = '00';
const TAG_COUNTRY = '51';
const TAG_CRC = '91';

// ── Standard slip-verify sub-tags (under root template) ─────────────────
const SUB_API_TYPE = '00';
const SUB_SENDING_BANK = '01';
const SUB_TRANS_REF = '02';
const SLIP_VERIFY_API_TYPE = '000001';
const COUNTRY_TH = 'TH';

// ── TrueMoney variant sub-tags (under root template) ────────────────────
const SUB_TM_MARKER_A = '00';
const SUB_TM_MARKER_B = '01';
const SUB_TM_EVENT_TYPE = '02';
const SUB_TM_TRANSACTION_ID = '03';
const SUB_TM_DATE = '04';
const TM_MARKER_VALUE = '01';

const CRC_HEADER = TAG_CRC + '04';
const TM_DATE_LENGTH = 8;

/** Input for `buildSlipVerify`. */
export interface SlipVerifyInput {
  /** Bank code that issued the slip (e.g. `'002'` for Bangkok Bank). */
  readonly sendingBank: string;
  /** Transaction reference printed on the slip. */
  readonly transRef: string;
}

/** Decoded payload from `parseSlipVerify`. */
export interface ParsedSlipVerify {
  readonly sendingBank: string;
  readonly transRef: string;
}

/** Input for `buildTrueMoneySlipVerify`. */
export interface TrueMoneySlipVerifyInput {
  /** Event classification (e.g. `'P2P'`). */
  readonly eventType: string;
  /** Wallet transaction identifier. */
  readonly transactionId: string;
  /** Transfer date as a `DDMMYYYY` 8-character string. */
  readonly date: string;
}

/** Decoded payload from `parseTrueMoneySlipVerify`. */
export interface ParsedTrueMoneySlipVerify {
  readonly eventType: string;
  readonly transactionId: string;
  readonly date: string;
}

/**
 * Build a Slip Verify Mini-QR payload. The output is a TLV string ending
 * in a tag-91 CRC (uppercase hex), suitable for embedding in a printed
 * slip and looking the transaction up via bank Open APIs.
 *
 * @example
 *   buildSlipVerify({ sendingBank: '002', transRef: '0002123123121200011' })
 *   // → '004000060000010103002021900021231231212000115102TH91049C30'
 */
export function buildSlipVerify(input: SlipVerifyInput): string {
  const inner = encodeFields([
    [SUB_API_TYPE, SLIP_VERIFY_API_TYPE],
    [SUB_SENDING_BANK, input.sendingBank],
    [SUB_TRANS_REF, input.transRef],
  ]);
  const body = encodeField(TAG_ROOT_TEMPLATE, inner) + encodeField(TAG_COUNTRY, COUNTRY_TH);
  const seed = body + CRC_HEADER;
  return seed + checksum(seed);
}

/**
 * Parse a Slip Verify Mini-QR payload. Returns `null` for any string that
 * isn't a valid slip-verify envelope — wrong root tag, wrong CRC tag, or
 * checksum mismatch. CRCs of 1-3 hex chars are auto-padded with leading
 * zeros (some bank apps drop characters when re-encoding).
 *
 * @example
 *   parseSlipVerify('004000060000010103002021900021231231212000115102TH91049C30')
 *   // → { sendingBank: '002', transRef: '0002123123121200011' }
 */
export function parseSlipVerify(payload: string): ParsedSlipVerify | null {
  const repaired = repairCrcEnvelope(payload, true);
  if (repaired == null) return null;

  let root: Map<string, string>;
  try {
    root = parseFields(repaired.body);
  } catch {
    return null;
  }

  const template = root.get(TAG_ROOT_TEMPLATE);
  if (template == null) return null;

  let sub: Map<string, string>;
  try {
    sub = parseFields(template);
  } catch {
    return null;
  }

  if (sub.get(SUB_API_TYPE) !== SLIP_VERIFY_API_TYPE) return null;
  const sendingBank = sub.get(SUB_SENDING_BANK);
  const transRef = sub.get(SUB_TRANS_REF);
  if (sendingBank == null || transRef == null) return null;

  return { sendingBank, transRef };
}

/**
 * Build a TrueMoney Slip Verify Mini-QR payload. Uses the same TLV
 * envelope as the standard variant but with a different sub-tag layout
 * and a **lowercase** hex CRC at tag 91.
 *
 * @example
 *   buildTrueMoneySlipVerify({ eventType: 'P2P', transactionId: 'TXN0001234567', date: '25012024' })
 *   // → '00480002010102010203P2P0313TXN00012345670408250120249104b425'
 */
export function buildTrueMoneySlipVerify(input: TrueMoneySlipVerifyInput): string {
  if (input.date.length !== TM_DATE_LENGTH) {
    throw new RangeError(
      `TrueMoney slip-verify date must be ${TM_DATE_LENGTH} chars (DDMMYYYY); got ${input.date.length}`,
    );
  }
  const inner = encodeFields([
    [SUB_TM_MARKER_A, TM_MARKER_VALUE],
    [SUB_TM_MARKER_B, TM_MARKER_VALUE],
    [SUB_TM_EVENT_TYPE, input.eventType],
    [SUB_TM_TRANSACTION_ID, input.transactionId],
    [SUB_TM_DATE, input.date],
  ]);
  const body = encodeField(TAG_ROOT_TEMPLATE, inner);
  const seed = body + CRC_HEADER;
  return seed + checksum(seed).toLowerCase();
}

/**
 * Parse a TrueMoney Slip Verify Mini-QR payload. Returns `null` for any
 * string that doesn't carry the TrueMoney marker pair (sub-tags 00 + 01
 * both `'01'`) or whose CRC fails to verify. Comparison is
 * case-insensitive; truncated CRCs (1-3 chars) are auto-padded.
 *
 * @example
 *   parseTrueMoneySlipVerify('00480002010102010203P2P0313TXN00012345670408250120249104b425')
 *   // → { eventType: 'P2P', transactionId: 'TXN0001234567', date: '25012024' }
 */
export function parseTrueMoneySlipVerify(payload: string): ParsedTrueMoneySlipVerify | null {
  const repaired = repairCrcEnvelope(payload, false);
  if (repaired == null) return null;

  let root: Map<string, string>;
  try {
    root = parseFields(repaired.body);
  } catch {
    return null;
  }

  const template = root.get(TAG_ROOT_TEMPLATE);
  if (template == null) return null;

  let sub: Map<string, string>;
  try {
    sub = parseFields(template);
  } catch {
    return null;
  }

  if (sub.get(SUB_TM_MARKER_A) !== TM_MARKER_VALUE) return null;
  if (sub.get(SUB_TM_MARKER_B) !== TM_MARKER_VALUE) return null;
  const eventType = sub.get(SUB_TM_EVENT_TYPE);
  const transactionId = sub.get(SUB_TM_TRANSACTION_ID);
  const date = sub.get(SUB_TM_DATE);
  if (eventType == null || transactionId == null || date == null) return null;

  return { eventType, transactionId, date };
}

/**
 * Locate the tag-91 CRC at the tail of the payload, repair a truncated
 * checksum (1-3 hex chars get padded with leading zeros until a candidate
 * matches), and return the verified body. Returns `null` if no candidate
 * passes the CRC check.
 *
 * `caseSensitive=true` enforces uppercase hex equality (standard slip
 * verify). `false` lower-cases both sides before comparing (TrueMoney
 * accepts either case on the wire).
 */
function repairCrcEnvelope(payload: string, caseSensitive: boolean): { body: string } | null {
  const headerIdx = payload.lastIndexOf(CRC_HEADER);
  if (headerIdx === -1) return null;

  const seedEnd = headerIdx + CRC_HEADER.length;
  const seed = payload.slice(0, seedEnd);
  const tail = payload.slice(seedEnd);
  if (tail.length === 0 || tail.length > 4) return null;

  const expected = caseSensitive ? checksum(seed) : checksum(seed).toLowerCase();
  const padded = tail.padStart(4, '0');
  const normalised = caseSensitive ? padded : padded.toLowerCase();
  if (normalised === expected) {
    return { body: payload.slice(0, headerIdx) };
  }
  return null;
}
