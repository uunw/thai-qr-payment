/**
 * Recipient normalisation for the PromptPay merchant template.
 *
 * The wire format under tag 29 has four sub-tags (01 phone, 02 national
 * ID, 03 e-wallet, 04 bank account). The expected length determines which
 * sub-tag a single-string recipient lands in, and phone numbers get the
 * country prefix swap `0` → `66`. Bank account values are composed from
 * two pieces (bank code + account number) and have their own helper.
 */

import {
  SUB_PROMPTPAY_BANK_ACCOUNT,
  SUB_PROMPTPAY_EWALLET,
  SUB_PROMPTPAY_MOBILE,
  SUB_PROMPTPAY_NATIONAL_ID,
} from './tags.js';

export type PromptPayRecipientType = 'mobile' | 'nationalId' | 'eWallet' | 'bankAccount';

export interface NormalisedRecipient {
  readonly subTag:
    | typeof SUB_PROMPTPAY_MOBILE
    | typeof SUB_PROMPTPAY_NATIONAL_ID
    | typeof SUB_PROMPTPAY_EWALLET
    | typeof SUB_PROMPTPAY_BANK_ACCOUNT;
  readonly value: string;
  readonly type: PromptPayRecipientType;
}

const BANK_CODE_LENGTH = 3;
const BANK_ACCOUNT_MAX_LENGTH = 43;

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
 * Pass `'bankAccount'` to `normaliseBankAccount` instead; it needs two
 * pieces (bank code + account number) the single-string form can't carry.
 */
export function normaliseRecipient(
  raw: string,
  explicit?: Exclude<PromptPayRecipientType, 'bankAccount'>,
): NormalisedRecipient {
  const digits = stripNonDigits(raw);
  if (digits.length === 0) {
    throw new TypeError('PromptPay recipient must contain at least one digit');
  }

  const inferred: Exclude<PromptPayRecipientType, 'bankAccount'> =
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

/**
 * Format a bank-account recipient for sub-tag 04 under the PromptPay
 * merchant template. The wire value is the 3-digit bank code followed by
 * the (variable-length, numeric) account number; total length must fit
 * EMVCo's 1–43-character cap on the sub-tag.
 *
 * @example
 *   normaliseBankAccount('014', '1234567890')
 *   // → { subTag: '04', value: '0141234567890', type: 'bankAccount' }
 */
export function normaliseBankAccount(bankCode: string, accountNo: string): NormalisedRecipient {
  const codeDigits = stripNonDigits(bankCode);
  const accountDigits = stripNonDigits(accountNo);
  if (codeDigits.length !== BANK_CODE_LENGTH) {
    throw new RangeError(`Bank code must be ${BANK_CODE_LENGTH} digits, got ${codeDigits.length}`);
  }
  if (accountDigits.length === 0) {
    throw new TypeError('Bank account number must contain at least one digit');
  }
  const value = codeDigits + accountDigits;
  if (value.length > BANK_ACCOUNT_MAX_LENGTH) {
    throw new RangeError(
      `Bank account wire value exceeds ${BANK_ACCOUNT_MAX_LENGTH} chars (got ${value.length})`,
    );
  }
  return { subTag: SUB_PROMPTPAY_BANK_ACCOUNT, value, type: 'bankAccount' };
}
