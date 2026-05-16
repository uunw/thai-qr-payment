/**
 * Fluent builder for the Thai QR Payment wire payload.
 *
 * The builder collects field assignments in an ordered list, then renders
 * the final string in one pass with the CRC computed over the body plus
 * the CRC tag header (`6304`) — that header is part of the hashed input
 * per EMVCo §4, which surprises everyone who reads the spec for the
 * first time.
 *
 * Order on the wire is fixed by tag id (lowest first). The builder
 * stores fields in a Map keyed by tag id and emits them sorted at
 * `build()`-time so callers can set them in any order without breaking
 * the resulting checksum.
 */

import { formatAmount, type FormatAmountOptions } from './amount.js';
import { checksum } from './crc.js';
import { encodePersonalMessage } from './message.js';
import { normaliseRecipient, type PromptPayRecipientType } from './recipient.js';
import {
  COUNTRY_TH,
  CURRENCY_THB,
  GUID_BILL_PAYMENT,
  GUID_BILL_PAYMENT_CROSS_BORDER,
  GUID_PROMPTPAY,
  PAYLOAD_FORMAT_VERSION,
  POI_DYNAMIC,
  POI_STATIC,
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
  TAG_TIP_FIXED,
  TAG_TIP_OR_CONVENIENCE_INDICATOR,
  TAG_TIP_PERCENTAGE,
  TAG_TRANSACTION_AMOUNT,
  TAG_TRANSACTION_CURRENCY,
  TIP_FIXED,
  TIP_PERCENTAGE,
  TIP_PROMPT,
  TRUE_MONEY_PREFIX,
} from './tags.js';
import { encodeField, encodeFields } from './tlv.js';

export interface AdditionalDataFields {
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

export type TipMode =
  | { mode: 'prompt' }
  | { mode: 'fixed'; value: number; fromSatang?: boolean }
  | { mode: 'percentage'; value: number };

export interface MerchantInfo {
  /** Up to 25 alphanumeric characters; truncated by the builder. */
  name?: string;
  /** Up to 15 alphanumeric characters. */
  city?: string;
  /** Up to 10 chars. */
  postalCode?: string;
  /** 4-digit Merchant Category Code from ISO 18245. */
  categoryCode?: string;
}

/**
 * Thai QR Payment payload builder.
 *
 * Three terminal methods:
 *  - `.build()` returns the wire-format string ready for QR encoding.
 *  - `.buildWithChecksum()` returns both the body and the checksum
 *    separately — useful for debugging the CRC step.
 *  - `.toBytes()` returns a `Uint8Array` of the ASCII-encoded payload
 *    for callers that want to hash or sign it.
 */
export class ThaiQrPaymentBuilder {
  private readonly fields = new Map<string, string>();
  private readonly additional: AdditionalDataFields = {};
  private tip: TipMode | undefined;
  private personalMessage: string | undefined;

  constructor() {
    this.fields.set(TAG_PAYLOAD_FORMAT, PAYLOAD_FORMAT_VERSION);
    this.fields.set(TAG_POINT_OF_INITIATION, POI_STATIC);
    this.fields.set(TAG_COUNTRY_CODE, COUNTRY_TH);
    this.fields.set(TAG_TRANSACTION_CURRENCY, CURRENCY_THB);
  }

  /**
   * Configure a PromptPay recipient (mobile, national ID, or e-wallet).
   * Overrides any previously-set BillPayment / KShop template.
   */
  promptpay(recipient: string, type?: PromptPayRecipientType): this {
    const normalised = normaliseRecipient(recipient, type);
    const template = encodeFields([
      [SUB_GUID, GUID_PROMPTPAY],
      [normalised.subTag, normalised.value],
    ]);
    this.fields.set(TAG_MERCHANT_ACCOUNT_PROMPTPAY, template);
    this.fields.delete(TAG_MERCHANT_ACCOUNT_BILL_PAYMENT);
    return this;
  }

  /**
   * Configure a TrueMoney Wallet recipient. Same merchant template tag
   * (29) as PromptPay but with the literal `14` prefix on sub-tag 03 so
   * the TrueMoney app can disambiguate its own payloads from a plain
   * e-wallet QR. The mobile is zero-padded on the left to 13 digits
   * before the prefix is added (final value length is always 15).
   *
   * The optional `message` is carried in tag 81 (UTF-16BE hex) and is
   * surfaced inside the TrueMoney app only; other scanners ignore it.
   */
  trueMoney(mobileNo: string, options: { amount?: number; message?: string } = {}): this {
    const digits = mobileNo.replace(/\D/g, '');
    if (digits.length === 0) {
      throw new TypeError('TrueMoney mobile number must contain at least one digit');
    }
    if (digits.length > 13) {
      throw new RangeError(`TrueMoney mobile number too long (${digits.length} digits)`);
    }
    const wireMobile = TRUE_MONEY_PREFIX + digits.padStart(13, '0');
    const template = encodeFields([
      [SUB_GUID, GUID_PROMPTPAY],
      [SUB_TRUE_MONEY, wireMobile],
    ]);
    this.fields.set(TAG_MERCHANT_ACCOUNT_PROMPTPAY, template);
    this.fields.delete(TAG_MERCHANT_ACCOUNT_BILL_PAYMENT);
    this.personalMessage = options.message;
    if (options.amount != null) {
      this.amount(options.amount);
    } else {
      this.amount(undefined);
    }
    return this;
  }

  /**
   * Configure a BillPayment recipient (Cross-Bank BillPayment / R-Bill).
   *
   * Pass `crossBorder: true` to emit the ASEAN-region remittance AID
   * (`A000000677012006`) instead of the domestic one (`A000000677010112`).
   * The template layout is otherwise identical — same sub-tags, same
   * value rules. Pair with the `purposeOfTransaction` additional-data
   * field (tag 62 sub-tag 08), which carries an 18-char triple in this
   * mode: currencyCode (3 digits) + localAmount (13 digits) +
   * countryCode (2 digits). The builder treats that field as opaque;
   * compose / parse the triple at the call site.
   */
  billPayment(input: {
    billerId: string;
    reference1?: string;
    reference2?: string;
    crossBorder?: boolean;
  }): this {
    const aid = input.crossBorder === true ? GUID_BILL_PAYMENT_CROSS_BORDER : GUID_BILL_PAYMENT;
    const template = encodeFields([
      [SUB_GUID, aid],
      [SUB_BILL_BILLER_ID, input.billerId],
      [SUB_BILL_REFERENCE_1, input.reference1],
      [SUB_BILL_REFERENCE_2, input.reference2],
    ]);
    this.fields.set(TAG_MERCHANT_ACCOUNT_BILL_PAYMENT, template);
    this.fields.delete(TAG_MERCHANT_ACCOUNT_PROMPTPAY);
    return this;
  }

  /**
   * Set the transaction amount in baht. Pass `{fromSatang: true}` to
   * supply integer satang instead. Omit / pass `undefined` to keep the
   * QR static (the consumer's banking app will prompt for an amount).
   */
  amount(value: number | bigint | undefined, options?: FormatAmountOptions): this {
    const formatted = formatAmount(value, options);
    if (formatted == null) {
      this.fields.delete(TAG_TRANSACTION_AMOUNT);
      this.fields.set(TAG_POINT_OF_INITIATION, POI_STATIC);
    } else {
      this.fields.set(TAG_TRANSACTION_AMOUNT, formatted);
      this.fields.set(TAG_POINT_OF_INITIATION, POI_DYNAMIC);
    }
    return this;
  }

  /** Set the tip / convenience-fee policy (tags 55-57). */
  tipPolicy(mode: TipMode | undefined): this {
    this.tip = mode;
    return this;
  }

  /** Set merchant display info (tags 52, 59, 60, 61). */
  merchant(info: MerchantInfo): this {
    if (info.categoryCode != null) this.fields.set(TAG_MERCHANT_CATEGORY_CODE, info.categoryCode);
    if (info.name != null) this.fields.set(TAG_MERCHANT_NAME, info.name.slice(0, 25));
    if (info.city != null) this.fields.set(TAG_MERCHANT_CITY, info.city.slice(0, 15));
    if (info.postalCode != null) this.fields.set(TAG_POSTAL_CODE, info.postalCode);
    return this;
  }

  /** Set sub-fields of the additional-data template (tag 62). */
  additionalData(fields: AdditionalDataFields): this {
    Object.assign(this.additional, fields);
    return this;
  }

  /** Force the point-of-initiation flag regardless of amount presence. */
  pointOfInitiation(method: 'static' | 'dynamic'): this {
    this.fields.set(TAG_POINT_OF_INITIATION, method === 'static' ? POI_STATIC : POI_DYNAMIC);
    return this;
  }

  /** Compose the additional-data template if any sub-fields are set. */
  private composeAdditionalData(): string | null {
    const pairs: ReadonlyArray<readonly [string, string | undefined]> = [
      [SUB_ADD_BILL_NUMBER, this.additional.billNumber],
      [SUB_ADD_MOBILE_NUMBER, this.additional.mobileNumber],
      [SUB_ADD_STORE_LABEL, this.additional.storeLabel],
      [SUB_ADD_LOYALTY_NUMBER, this.additional.loyaltyNumber],
      [SUB_ADD_REFERENCE_LABEL, this.additional.referenceLabel],
      [SUB_ADD_CUSTOMER_LABEL, this.additional.customerLabel],
      [SUB_ADD_TERMINAL_LABEL, this.additional.terminalLabel],
      [SUB_ADD_PURPOSE_OF_TRANSACTION, this.additional.purposeOfTransaction],
      [SUB_ADD_CONSUMER_DATA_REQUEST, this.additional.consumerDataRequest],
    ];
    const body = encodeFields(pairs);
    return body === '' ? null : body;
  }

  /** Apply the tip policy to tags 55-57 just before emit. */
  private applyTip(): void {
    if (this.tip == null) {
      this.fields.delete(TAG_TIP_OR_CONVENIENCE_INDICATOR);
      this.fields.delete(TAG_TIP_FIXED);
      this.fields.delete(TAG_TIP_PERCENTAGE);
      return;
    }
    switch (this.tip.mode) {
      case 'prompt':
        this.fields.set(TAG_TIP_OR_CONVENIENCE_INDICATOR, TIP_PROMPT);
        this.fields.delete(TAG_TIP_FIXED);
        this.fields.delete(TAG_TIP_PERCENTAGE);
        break;
      case 'fixed': {
        const formatted = formatAmount(this.tip.value, { fromSatang: this.tip.fromSatang });
        if (formatted == null) {
          throw new TypeError('Tip fixed amount must be positive');
        }
        this.fields.set(TAG_TIP_OR_CONVENIENCE_INDICATOR, TIP_FIXED);
        this.fields.set(TAG_TIP_FIXED, formatted);
        this.fields.delete(TAG_TIP_PERCENTAGE);
        break;
      }
      case 'percentage':
        this.fields.set(TAG_TIP_OR_CONVENIENCE_INDICATOR, TIP_PERCENTAGE);
        this.fields.set(TAG_TIP_PERCENTAGE, this.tip.value.toFixed(2));
        this.fields.delete(TAG_TIP_FIXED);
        break;
    }
  }

  /** Render the full wire-format payload with checksum appended. */
  build(): string {
    this.applyTip();
    const additional = this.composeAdditionalData();
    if (additional != null) {
      this.fields.set(TAG_ADDITIONAL_DATA, additional);
    } else {
      this.fields.delete(TAG_ADDITIONAL_DATA);
    }
    if (this.personalMessage != null && this.personalMessage !== '') {
      this.fields.set(TAG_PERSONAL_MESSAGE, encodePersonalMessage(this.personalMessage));
    } else {
      this.fields.delete(TAG_PERSONAL_MESSAGE);
    }

    // Spec mandates ascending tag order on the wire. Map iteration
    // preserves insertion order, so we sort explicitly here instead.
    const sorted = [...this.fields.entries()]
      .filter(([tag]) => tag !== TAG_CHECKSUM)
      .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    let body = '';
    for (const [tag, value] of sorted) {
      body += encodeField(tag, value);
    }

    // The CRC is taken over `body + "6304"` — the tag header for the
    // checksum is part of the hashed input. Off-by-one if you miss it.
    const seed = body + TAG_CHECKSUM + '04';
    return seed + checksum(seed);
  }

  /** Render and split the body/CRC for inspection. */
  buildWithChecksum(): { body: string; checksum: string; payload: string } {
    const payload = this.build();
    return {
      body: payload.slice(0, -4),
      checksum: payload.slice(-4),
      payload,
    };
  }

  /** UTF-8 byte view of the payload — useful for hashing or transport. */
  toBytes(): Uint8Array {
    const text = this.build();
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
      out[i] = text.charCodeAt(i) & 0xff;
    }
    return out;
  }
}
