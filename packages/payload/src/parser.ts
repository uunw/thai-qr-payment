/**
 * Decoder for Thai QR Payment wire payloads.
 *
 * Validates the trailing CRC, walks the TLV tree, and surfaces a typed
 * view of the merchant template + amount + additional-data sub-fields.
 * Useful for tests, debugging, and reading back QR codes captured by a
 * scanner.
 */

import { checksum } from './crc.js';
import type { PromptPayRecipientType } from './recipient.js';
import {
  COUNTRY_TH,
  CURRENCY_THB,
  GUID_BILL_PAYMENT,
  GUID_PROMPTPAY,
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
  SUB_PROMPTPAY_EWALLET,
  SUB_PROMPTPAY_MOBILE,
  SUB_PROMPTPAY_NATIONAL_ID,
  TAG_ADDITIONAL_DATA,
  TAG_COUNTRY_CODE,
  TAG_MERCHANT_ACCOUNT_BILL_PAYMENT,
  TAG_MERCHANT_ACCOUNT_PROMPTPAY,
  TAG_MERCHANT_CATEGORY_CODE,
  TAG_MERCHANT_CITY,
  TAG_MERCHANT_NAME,
  TAG_PAYLOAD_FORMAT,
  TAG_POINT_OF_INITIATION,
  TAG_POSTAL_CODE,
  TAG_TRANSACTION_AMOUNT,
  TAG_TRANSACTION_CURRENCY,
} from './tags.js';
import { parseFields } from './tlv.js';

export interface ParsedPromptPay {
  readonly kind: 'promptpay';
  readonly recipientType: PromptPayRecipientType;
  readonly recipient: string;
}

export interface ParsedBillPayment {
  readonly kind: 'billPayment';
  readonly billerId: string;
  readonly reference1?: string;
  readonly reference2?: string;
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

export interface ParsedPayload {
  readonly payloadFormat: string;
  readonly pointOfInitiation: 'static' | 'dynamic';
  readonly merchant: ParsedPromptPay | ParsedBillPayment | null;
  readonly amount: number | null;
  readonly currency: string;
  readonly country: string;
  readonly merchantName?: string;
  readonly merchantCity?: string;
  readonly merchantCategoryCode?: string;
  readonly postalCode?: string;
  readonly additionalData?: ParsedAdditionalData;
}

/** Recover the human-readable mobile (drop the `0066` prefix and re-add `0`). */
function fromMobileWire(wire: string): string {
  // Wire: 13-char zero-padded, starts with 0066 for THB. Strip leading
  // zeros, drop the 66 country code, prepend a 0.
  const trimmed = wire.replace(/^0+/, '');
  if (trimmed.startsWith('66')) return `0${trimmed.slice(2)}`;
  return trimmed;
}

function parsePromptPayTemplate(template: string): ParsedPromptPay | null {
  const sub = parseFields(template);
  const guid = sub.get(SUB_GUID);
  if (guid !== GUID_PROMPTPAY) return null;
  const mobile = sub.get(SUB_PROMPTPAY_MOBILE);
  if (mobile != null) {
    return { kind: 'promptpay', recipientType: 'mobile', recipient: fromMobileWire(mobile) };
  }
  const nationalId = sub.get(SUB_PROMPTPAY_NATIONAL_ID);
  if (nationalId != null) {
    return { kind: 'promptpay', recipientType: 'nationalId', recipient: nationalId };
  }
  const eWallet = sub.get(SUB_PROMPTPAY_EWALLET);
  if (eWallet != null) {
    return { kind: 'promptpay', recipientType: 'eWallet', recipient: eWallet };
  }
  return null;
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
 * Parse a wire-format payload. Throws if the CRC check fails or the
 * structure is malformed; returns a typed view otherwise.
 */
export function parsePayload(payload: string): ParsedPayload {
  if (payload.length < 8) {
    throw new SyntaxError(
      `Payload too short (${payload.length} chars); not a Thai QR Payment string`,
    );
  }
  const expected = payload.slice(-4);
  const seed = payload.slice(0, -4);
  const computed = checksum(seed);
  if (computed !== expected) {
    throw new Error(
      `Checksum mismatch: payload trails "${expected}" but recomputes to "${computed}"`,
    );
  }
  const body = seed.slice(0, -4); // strip the "6304" header
  const root = parseFields(body);

  const promptpay = root.get(TAG_MERCHANT_ACCOUNT_PROMPTPAY);
  const billPayment = root.get(TAG_MERCHANT_ACCOUNT_BILL_PAYMENT);
  let merchant: ParsedPromptPay | ParsedBillPayment | null = null;
  if (promptpay != null) merchant = parsePromptPayTemplate(promptpay);
  else if (billPayment != null) merchant = parseBillPaymentTemplate(billPayment);

  const amountText = root.get(TAG_TRANSACTION_AMOUNT);
  const additional = root.get(TAG_ADDITIONAL_DATA);

  return {
    payloadFormat: root.get(TAG_PAYLOAD_FORMAT) ?? '',
    pointOfInitiation: root.get(TAG_POINT_OF_INITIATION) === POI_DYNAMIC ? 'dynamic' : 'static',
    merchant,
    amount: amountText != null ? Number.parseFloat(amountText) : null,
    currency: root.get(TAG_TRANSACTION_CURRENCY) ?? CURRENCY_THB,
    country: root.get(TAG_COUNTRY_CODE) ?? COUNTRY_TH,
    merchantName: root.get(TAG_MERCHANT_NAME),
    merchantCity: root.get(TAG_MERCHANT_CITY),
    merchantCategoryCode: root.get(TAG_MERCHANT_CATEGORY_CODE),
    postalCode: root.get(TAG_POSTAL_CODE),
    additionalData: additional != null ? parseAdditionalDataTemplate(additional) : undefined,
  };
}
