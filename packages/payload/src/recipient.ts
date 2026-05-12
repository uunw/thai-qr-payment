/**
 * Recipient normalisation for the PromptPay merchant template.
 *
 * The wire format under tag 29 has three sub-tags (01 phone, 02 national ID,
 * 03 e-wallet). The expected length determines which sub-tag the value
 * lands in, and phone numbers get the country prefix swap `0` → `66`.
 */

import { SUB_PROMPTPAY_EWALLET, SUB_PROMPTPAY_MOBILE, SUB_PROMPTPAY_NATIONAL_ID } from './tags.js';

export type PromptPayRecipientType = 'mobile' | 'nationalId' | 'eWallet';

export interface NormalisedRecipient {
  readonly subTag:
    | typeof SUB_PROMPTPAY_MOBILE
    | typeof SUB_PROMPTPAY_NATIONAL_ID
    | typeof SUB_PROMPTPAY_EWALLET;
  readonly value: string;
  readonly type: PromptPayRecipientType;
}

/** Strip every non-digit character. */
function stripNonDigits(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code >= 0x30 && code <= 0x39) out += input[i];
  }
  return out;
}

/** Convert a mobile number to the 13-char `0066xxxxxxxxxx` wire form. */
function toMobileWire(digits: string): string {
  // Phones in Thailand are 9-10 digits (e.g. 0812345678). Replace the
  // leading 0 with 66 (Thailand country code), then zero-pad to 13.
  const trimmed = digits.replace(/^0/, '66');
  return trimmed.padStart(13, '0');
}

/**
 * Decide the recipient type from the digit count, then format the wire
 * value. Explicit `type` arg overrides the inference — useful if a
 * national ID happens to look like a long e-wallet id or vice versa.
 */
export function normaliseRecipient(
  raw: string,
  explicit?: PromptPayRecipientType,
): NormalisedRecipient {
  const digits = stripNonDigits(raw);
  if (digits.length === 0) {
    throw new TypeError('PromptPay recipient must contain at least one digit');
  }

  const inferred: PromptPayRecipientType =
    explicit ?? (digits.length >= 15 ? 'eWallet' : digits.length >= 13 ? 'nationalId' : 'mobile');

  switch (inferred) {
    case 'mobile':
      return { subTag: SUB_PROMPTPAY_MOBILE, value: toMobileWire(digits), type: 'mobile' };
    case 'nationalId':
      if (digits.length !== 13) {
        throw new RangeError(`National ID must be 13 digits, got ${digits.length}`);
      }
      return { subTag: SUB_PROMPTPAY_NATIONAL_ID, value: digits, type: 'nationalId' };
    case 'eWallet':
      if (digits.length !== 15) {
        throw new RangeError(`e-Wallet ID must be 15 digits, got ${digits.length}`);
      }
      return { subTag: SUB_PROMPTPAY_EWALLET, value: digits, type: 'eWallet' };
  }
}
