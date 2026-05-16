/**
 * Decoder for Thai QR Payment wire payloads.
 *
 * Validates the trailing CRC, walks the TLV tree, and surfaces a typed
 * view of the merchant template + amount + additional-data sub-fields.
 * Useful for tests, debugging, and reading back QR codes captured by a
 * scanner.
 *
 * Two non-obvious behaviours live here:
 *  - `strict` opt-in surfaces a CRC failure as an exception instead of a
 *    silent pass; older code without the flag stays backwards-compatible.
 *  - Truncated-CRC auto-fix recovers payloads that some Thai banking
 *    apps emit with the last 1–2 hex chars chopped off. We left-pad the
 *    chopped value with zeros and accept it if the result hashes back to
 *    the same body. The flag survives on the parsed object so callers
 *    can warn the user about the source app's bug.
 */

import { checksum } from './crc.js';
import { decodePersonalMessage } from './message.js';
import type { PromptPayRecipientType } from './recipient.js';
import {
  COUNTRY_TH,
  CURRENCY_THB,
  GUID_BILL_PAYMENT,
  GUID_PROMPTPAY,
  GUID_PROMPTPAY_OTA,
  POI_DYNAMIC,
  SUB_ADD_BILL_NUMBER,
  SUB_ADD_CONSUMER_DATA_REQUEST,
  SUB_ADD_CUSTOMER_LABEL,
  SUB_ADD_LOYALTY_NUMBER,
  SUB_ADD_MOBILE_NUMBER,
  SUB_ADD_PURPOSE_OF_TRANSACTION,
  SUB_ADD_REFERENCE_LABEL,
  SUB_ADD_STORE_LABEL,
  SUB_ADD_TERMINAL_LABEL,
  SUB_BILL_BILLER_ID,
  SUB_BILL_REFERENCE_1,
  SUB_BILL_REFERENCE_2,
  SUB_GUID,
  SUB_PROMPTPAY_BANK_ACCOUNT,
  SUB_PROMPTPAY_EWALLET,
  SUB_PROMPTPAY_MOBILE,
  SUB_PROMPTPAY_NATIONAL_ID,
  SUB_PROMPTPAY_OTA,
  SUB_TRUE_MONEY,
  TAG_ADDITIONAL_DATA,
  TAG_CHECKSUM,
  TAG_COUNTRY_CODE,
  TAG_MERCHANT_ACCOUNT_BILL_PAYMENT,
  TAG_MERCHANT_ACCOUNT_PROMPTPAY,
  TAG_MERCHANT_CATEGORY_CODE,
  TAG_MERCHANT_CITY,
  TAG_MERCHANT_NAME,
  TAG_PAYLOAD_FORMAT,
  TAG_PERSONAL_MESSAGE,
  TAG_POINT_OF_INITIATION,
  TAG_POSTAL_CODE,
  TAG_TRANSACTION_AMOUNT,
  TAG_TRANSACTION_CURRENCY,
  TRUE_MONEY_PREFIX,
} from './tags.js';
import { iterateFields, parseFields, type TlvField } from './tlv.js';

const BANK_CODE_LENGTH = 3;

export interface ParsedPromptPay {
  readonly kind: 'promptpay';
  readonly recipientType: PromptPayRecipientType;
  /**
   * Wire value for the recipient sub-tag. For `bankAccount` this is the
   * full `bankCode + accountNo` concatenation — split fields are exposed
   * separately below.
   */
  readonly recipient: string;
  /** Bank code (3 digits). Present only when `recipientType === 'bankAccount'`. */
  readonly bankCode?: string;
  /** Account number. Present only when `recipientType === 'bankAccount'`. */
  readonly accountNo?: string;
  /** One-Time Authorization code from sub-tag 05. Present only on OTA payloads. */
  readonly ota?: string;
}

export interface ParsedBillPayment {
  readonly kind: 'billPayment';
  readonly billerId: string;
  readonly reference1?: string;
  readonly reference2?: string;
}

export interface ParsedTrueMoney {
  readonly kind: 'trueMoney';
  readonly mobileNo: string;
  readonly message?: string;
}

export interface ParsedAdditionalData {
  billNumber?: string;
  mobileNumber?: string;
  storeLabel?: string;
  loyaltyNumber?: string;
  referenceLabel?: string;
  customerLabel?: string;
  terminalLabel?: string;
  purposeOfTransaction?: string;
  consumerDataRequest?: string;
}

/** Bookkeeping for the trailing checksum — useful when reporting auto-fix. */
export interface ParsedCrc {
  /** The CRC text as it appeared on the wire (may be 1–4 chars). */
  readonly value: string;
  /** True when the wire CRC matches the recomputed value (possibly after padding). */
  readonly valid: boolean;
  /** True when zero-padding was needed to recover a valid CRC. */
  readonly truncated: boolean;
}

export interface ParsedPayload {
  readonly payloadFormat: string;
  readonly pointOfInitiation: 'static' | 'dynamic';
  readonly merchant: ParsedPromptPay | ParsedBillPayment | ParsedTrueMoney | null;
  readonly amount: number | null;
  readonly currency: string;
  readonly country: string;
  readonly merchantName?: string;
  readonly merchantCity?: string;
  readonly merchantCategoryCode?: string;
  readonly postalCode?: string;
  readonly additionalData?: ParsedAdditionalData;
  readonly crc: ParsedCrc;
  /** All top-level TLV fields, in wire order. Use for unknown / future tags. */
  readonly rawTags: readonly TlvField[];
  /** Lookup a top-level TLV field by id. Returns `undefined` if absent. */
  getTag(id: string): TlvField | undefined;
  /**
   * Lookup a value by id. Pass `subId` to descend one level into a nested
   * template (tags 29–31, 62, 64 are templated). Returns `undefined` if
   * either the parent or the sub-field is missing.
   */
  getTagValue(id: string, subId?: string): string | undefined;
}

export interface ParsePayloadOptions {
  /**
   * When true, throw if the CRC tag is missing or its on-wire value
   * doesn't match the recomputed checksum. Defaults to false for
   * backwards compatibility with callers that need to consume the
   * truncated-CRC auto-fix path.
   */
  readonly strict?: boolean;
}

/** Recover the human-readable mobile (drop the `0066` prefix and re-add `0`). */
function fromMobileWire(wire: string): string {
  // Wire: 13-char zero-padded, starts with 0066 for THB. Strip leading
  // zeros, drop the 66 country code, prepend a 0.
  const trimmed = wire.replace(/^0+/, '');
  if (trimmed.startsWith('66')) return `0${trimmed.slice(2)}`;
  return trimmed;
}

/** Reverse the TrueMoney mobile-wire transform (drop `14` + restore the leading 0). */
function fromTrueMoneyWire(wire: string): string {
  // Wire layout: "14" + 13-char zero-padded mobile. Thai mobiles
  // canonically start with a leading 0, so strip the zero-padding and
  // re-add the 0 the same way `fromMobileWire` does for PromptPay.
  const trimmed = wire.slice(TRUE_MONEY_PREFIX.length).replace(/^0+/, '');
  return trimmed === '' ? '0' : `0${trimmed}`;
}

function parsePromptPayTemplate(template: string): ParsedPromptPay | null {
  const sub = parseFields(template);
  const guid = sub.get(SUB_GUID);
  // OTA payloads use the `…0114` AID; everything else rides the standard
  // PromptPay `…0111` AID. The AID is the sole discriminator — sub-tags
  // 01-04 carry the same recipient shapes in either envelope.
  const isOta = guid === GUID_PROMPTPAY_OTA;
  if (guid !== GUID_PROMPTPAY && !isOta) return null;
  const ota = isOta ? sub.get(SUB_PROMPTPAY_OTA) : undefined;

  const bankAccount = sub.get(SUB_PROMPTPAY_BANK_ACCOUNT);
  if (bankAccount != null) {
    return {
      kind: 'promptpay',
      recipientType: 'bankAccount',
      recipient: bankAccount,
      bankCode: bankAccount.slice(0, BANK_CODE_LENGTH),
      accountNo: bankAccount.slice(BANK_CODE_LENGTH),
      ...(ota != null ? { ota } : {}),
    };
  }
  const mobile = sub.get(SUB_PROMPTPAY_MOBILE);
  if (mobile != null) {
    return {
      kind: 'promptpay',
      recipientType: 'mobile',
      recipient: fromMobileWire(mobile),
      ...(ota != null ? { ota } : {}),
    };
  }
  const nationalId = sub.get(SUB_PROMPTPAY_NATIONAL_ID);
  if (nationalId != null) {
    return {
      kind: 'promptpay',
      recipientType: 'nationalId',
      recipient: nationalId,
      ...(ota != null ? { ota } : {}),
    };
  }
  const eWallet = sub.get(SUB_PROMPTPAY_EWALLET);
  if (eWallet != null) {
    return {
      kind: 'promptpay',
      recipientType: 'eWallet',
      recipient: eWallet,
      ...(ota != null ? { ota } : {}),
    };
  }
  return null;
}

function parseTrueMoneyTemplate(template: string): ParsedTrueMoney | null {
  const sub = parseFields(template);
  const guid = sub.get(SUB_GUID);
  if (guid !== GUID_PROMPTPAY) return null;
  const wireValue = sub.get(SUB_TRUE_MONEY);
  if (wireValue == null) return null;
  if (!wireValue.startsWith(TRUE_MONEY_PREFIX)) return null;
  return { kind: 'trueMoney', mobileNo: fromTrueMoneyWire(wireValue) };
}

function parseBillPaymentTemplate(template: string): ParsedBillPayment | null {
  const sub = parseFields(template);
  const guid = sub.get(SUB_GUID);
  if (guid !== GUID_BILL_PAYMENT) return null;
  const billerId = sub.get(SUB_BILL_BILLER_ID);
  if (billerId == null) return null;
  return {
    kind: 'billPayment',
    billerId,
    reference1: sub.get(SUB_BILL_REFERENCE_1) ?? undefined,
    reference2: sub.get(SUB_BILL_REFERENCE_2) ?? undefined,
  };
}

function parseAdditionalDataTemplate(template: string): ParsedAdditionalData {
  const sub = parseFields(template);
  return {
    billNumber: sub.get(SUB_ADD_BILL_NUMBER),
    mobileNumber: sub.get(SUB_ADD_MOBILE_NUMBER),
    storeLabel: sub.get(SUB_ADD_STORE_LABEL),
    loyaltyNumber: sub.get(SUB_ADD_LOYALTY_NUMBER),
    referenceLabel: sub.get(SUB_ADD_REFERENCE_LABEL),
    customerLabel: sub.get(SUB_ADD_CUSTOMER_LABEL),
    terminalLabel: sub.get(SUB_ADD_TERMINAL_LABEL),
    purposeOfTransaction: sub.get(SUB_ADD_PURPOSE_OF_TRANSACTION),
    consumerDataRequest: sub.get(SUB_ADD_CONSUMER_DATA_REQUEST),
  };
}

/**
 * Split off the CRC. Returns the canonical (possibly zero-padded) wire
 * representation when an auto-fix landed; downstream TLV parsing always
 * sees a well-formed `6304XXXX` tail so it never needs to special-case
 * the truncated path.
 */
function extractCrc(payload: string, strict: boolean): { canonical: string; crc: ParsedCrc } {
  // Standard case: payload ends with "6304XXXX" where XXXX is the CRC.
  // Verify first because it's the >99% path.
  const fullCrc = payload.slice(-4);
  const fullSeed = payload.slice(0, -4);
  if (fullSeed.endsWith(TAG_CHECKSUM + '04')) {
    const expected = checksum(fullSeed);
    if (expected === fullCrc) {
      return {
        canonical: payload,
        crc: { value: fullCrc, valid: true, truncated: false },
      };
    }
    if (strict) {
      throw new Error('Invalid CRC');
    }
  }

  // Truncated-CRC fallback: walk back 1, 2, 3 chars and try padding the
  // tail with leading zeros. The seed includes the `6304` header per the
  // EMVCo spec, so it stays constant and only the value grows back.
  if (!strict) {
    for (let dropped = 1; dropped <= 3; dropped += 1) {
      const candidateEnd = payload.length - (4 - dropped);
      const candidateSeed = payload.slice(0, candidateEnd);
      if (!candidateSeed.endsWith(TAG_CHECKSUM + '04')) continue;
      const wireCrc = payload.slice(candidateEnd);
      const padded = wireCrc.padStart(4, '0');
      if (checksum(candidateSeed) === padded) {
        return {
          canonical: candidateSeed + padded,
          crc: { value: wireCrc, valid: true, truncated: true },
        };
      }
    }
  }

  if (strict) {
    throw new Error('Invalid CRC');
  }

  // Non-strict fall-through: surface the original checksum-mismatch
  // error for backwards compatibility with the previous parser.
  throw new Error(
    `Checksum mismatch: payload trails "${fullCrc}" but recomputes to "${checksum(fullSeed)}"`,
  );
}

/**
 * Parse a wire-format payload. By default throws on structural errors or
 * a hard checksum mismatch (with truncated-CRC auto-fix applied when
 * possible). In `strict: true` mode also throws when the CRC tag is
 * missing or its value fails to match.
 */
export function parsePayload(payload: string, options: ParsePayloadOptions = {}): ParsedPayload {
  if (payload.length < 8) {
    throw new SyntaxError(
      `Payload too short (${payload.length} chars); not a Thai QR Payment string`,
    );
  }

  const strict = options.strict === true;
  const { canonical, crc } = extractCrc(payload, strict);

  // Iterate the canonical (possibly zero-padded) payload so rawTags
  // reflect what the spec says the merchant intended, not the truncated
  // wire byte-for-byte. Tag 63 still appears in rawTags for completeness.
  const rawTags = [...iterateFields(canonical)];
  const root = new Map<string, string>();
  for (const field of rawTags) {
    if (field.tag !== TAG_CHECKSUM) root.set(field.tag, field.value);
  }

  const promptpayTemplate = root.get(TAG_MERCHANT_ACCOUNT_PROMPTPAY);
  const billPaymentTemplate = root.get(TAG_MERCHANT_ACCOUNT_BILL_PAYMENT);
  let merchant: ParsedPromptPay | ParsedBillPayment | ParsedTrueMoney | null = null;
  if (promptpayTemplate != null) {
    // TrueMoney rides on the same AID as PromptPay; the literal "14"
    // prefix on sub-tag 03 is the disambiguator.
    merchant =
      parseTrueMoneyTemplate(promptpayTemplate) ?? parsePromptPayTemplate(promptpayTemplate);
  } else if (billPaymentTemplate != null) {
    merchant = parseBillPaymentTemplate(billPaymentTemplate);
  }

  // Personal message lives at tag 81 — TrueMoney's only place to put a
  // human-readable note. Other wallets ignore it.
  let trueMoneyWithMessage: ParsedTrueMoney | null = null;
  if (merchant != null && merchant.kind === 'trueMoney') {
    const messageHex = root.get(TAG_PERSONAL_MESSAGE);
    if (messageHex != null && messageHex !== '') {
      try {
        trueMoneyWithMessage = { ...merchant, message: decodePersonalMessage(messageHex) };
      } catch {
        // Malformed message hex shouldn't kill the whole parse — drop
        // silently and surface via `rawTags` for callers that care.
      }
    }
  }

  const amountText = root.get(TAG_TRANSACTION_AMOUNT);
  const additional = root.get(TAG_ADDITIONAL_DATA);

  const result: ParsedPayload = {
    payloadFormat: root.get(TAG_PAYLOAD_FORMAT) ?? '',
    pointOfInitiation: root.get(TAG_POINT_OF_INITIATION) === POI_DYNAMIC ? 'dynamic' : 'static',
    merchant: trueMoneyWithMessage ?? merchant,
    amount: amountText != null ? Number.parseFloat(amountText) : null,
    currency: root.get(TAG_TRANSACTION_CURRENCY) ?? CURRENCY_THB,
    country: root.get(TAG_COUNTRY_CODE) ?? COUNTRY_TH,
    merchantName: root.get(TAG_MERCHANT_NAME),
    merchantCity: root.get(TAG_MERCHANT_CITY),
    merchantCategoryCode: root.get(TAG_MERCHANT_CATEGORY_CODE),
    postalCode: root.get(TAG_POSTAL_CODE),
    additionalData: additional != null ? parseAdditionalDataTemplate(additional) : undefined,
    crc,
    rawTags,
    getTag(id: string): TlvField | undefined {
      for (const field of rawTags) {
        if (field.tag === id) return field;
      }
      return undefined;
    },
    getTagValue(id: string, subId?: string): string | undefined {
      const parent = this.getTag(id);
      if (parent == null) return undefined;
      if (subId == null) return parent.value;
      for (const sub of iterateFields(parent.value)) {
        if (sub.tag === subId) return sub.value;
      }
      return undefined;
    },
  };
  return result;
}
