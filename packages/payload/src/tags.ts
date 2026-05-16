/**
 * EMVCo Merchant-Presented-Mode QR Code Specification — tag registry.
 *
 * Source: EMVCo MPM v1.1 §3 — public spec; Bank of Thailand and KASIKORN
 * adopt the same numbering with Thai-specific GUIDs under templates 29-31.
 *
 * Tags are stringly-typed (two-character zero-padded decimal) on the wire
 * but exposed here as named constants so call sites stay readable.
 */

// ── Primary tags (root TLVs) ────────────────────────────────────────────
export const TAG_PAYLOAD_FORMAT = '00';
export const TAG_POINT_OF_INITIATION = '01';
export const TAG_MERCHANT_ACCOUNT_PROMPTPAY = '29';
export const TAG_MERCHANT_ACCOUNT_BILL_PAYMENT = '30';
export const TAG_MERCHANT_ACCOUNT_KSHOP = '31';
export const TAG_MERCHANT_CATEGORY_CODE = '52';
export const TAG_TRANSACTION_CURRENCY = '53';
export const TAG_TRANSACTION_AMOUNT = '54';
export const TAG_TIP_OR_CONVENIENCE_INDICATOR = '55';
export const TAG_TIP_FIXED = '56';
export const TAG_TIP_PERCENTAGE = '57';
export const TAG_COUNTRY_CODE = '58';
export const TAG_MERCHANT_NAME = '59';
export const TAG_MERCHANT_CITY = '60';
export const TAG_POSTAL_CODE = '61';
export const TAG_ADDITIONAL_DATA = '62';
export const TAG_CHECKSUM = '63';
export const TAG_LANGUAGE_TEMPLATE = '64';
export const TAG_PERSONAL_MESSAGE = '81';

// ── PromptPay merchant template (under tag 29) sub-fields ──────────────
export const SUB_GUID = '00';
export const SUB_PROMPTPAY_MOBILE = '01';
export const SUB_PROMPTPAY_NATIONAL_ID = '02';
export const SUB_PROMPTPAY_EWALLET = '03';
export const SUB_PROMPTPAY_BANK_ACCOUNT = '04';
export const SUB_PROMPTPAY_OTA = '05';

// ── TrueMoney Wallet (also under tag 29, shares the PromptPay AID) ─────
// Distinguished from PromptPay e-wallet by the literal "14" prefix in
// sub-tag 03's value. The remaining 13 chars are the merchant's mobile,
// zero-padded on the left.
export const SUB_TRUE_MONEY = '03';
export const TRUE_MONEY_PREFIX = '14';

// ── BillPayment merchant template (under tag 30) sub-fields ────────────
export const SUB_BILL_BILLER_ID = '01';
export const SUB_BILL_REFERENCE_1 = '02';
export const SUB_BILL_REFERENCE_2 = '03';

// ── Additional-data template (under tag 62) sub-fields ──────────────────
export const SUB_ADD_BILL_NUMBER = '01';
export const SUB_ADD_MOBILE_NUMBER = '02';
export const SUB_ADD_STORE_LABEL = '03';
export const SUB_ADD_LOYALTY_NUMBER = '04';
export const SUB_ADD_REFERENCE_LABEL = '05';
export const SUB_ADD_CUSTOMER_LABEL = '06';
export const SUB_ADD_TERMINAL_LABEL = '07';
export const SUB_ADD_PURPOSE_OF_TRANSACTION = '08';
export const SUB_ADD_CONSUMER_DATA_REQUEST = '09';

// ── Constants from the Thai QR Payment supplement ──────────────────────
export const PAYLOAD_FORMAT_VERSION = '01';
export const POI_STATIC = '11';
export const POI_DYNAMIC = '12';
export const CURRENCY_THB = '764';
export const COUNTRY_TH = 'TH';
export const GUID_PROMPTPAY = 'A000000677010111';
export const GUID_BILL_PAYMENT = 'A000000677010112';
// One-Time Authorization rides the PromptPay envelope but swaps the AID
// so scanners can distinguish a single-use credit transfer from a
// repeatable PromptPay payment.
export const GUID_PROMPTPAY_OTA = 'A000000677010114';

// ── Tip handling ────────────────────────────────────────────────────────
export const TIP_PROMPT = '01';
export const TIP_FIXED = '02';
export const TIP_PERCENTAGE = '03';
