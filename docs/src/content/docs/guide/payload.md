---
title: Payload (EMVCo TLV)
description: Build + parse Thai QR Payment wire payloads with @thai-qr-payment/payload.
---

`@thai-qr-payment/payload` implements the **EMVCo Merchant-Presented-Mode v1.1** TLV grammar plus the **Bank of Thailand Thai QR Payment supplement** (PromptPay, BillPayment, TrueMoney, OTA, VAT TQRC, cross-border ASEAN remittance). Zero dependencies, every JS runtime.

## One-shot helper

```ts
import { payloadFor } from 'thai-qr-payment';

const wire = payloadFor({ recipient: '0812345678', amount: 50 });
// 00020101021229370016A000000677010111011300668123456785303764540550.005802TH6304XXXX
```

Reach for `ThaiQrPaymentBuilder` when you need merchant info, references, OTA, bank-account credit transfer, TrueMoney, VAT TQRC, or cross-border.

## Builder

```ts
import { ThaiQrPaymentBuilder } from 'thai-qr-payment';
```

Three terminal methods regardless of what you configure: `.build()` returns the wire string, `.buildWithChecksum()` splits the body / CRC for inspection, `.toBytes()` returns a `Uint8Array` for hashing or transport.

### `.promptpay(recipient, type?)`

Mobile, national ID, or e-wallet recipient. Type is inferred from digit length when omitted: 9–12 → `mobile`, 13 → `nationalId`, 15 → `eWallet`. The override exists for the (rare) ambiguous case.

```ts
new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50).build();
new ThaiQrPaymentBuilder().promptpay('1234567890123', 'nationalId').amount(50).build();
new ThaiQrPaymentBuilder().promptpay('123456789012345', 'eWallet').amount(50).build();
```

Mobile recipients are zero-padded to the 13-char `0066xxxxxxxxxx` wire form before encoding.

### `.bankAccount(bankCode, accountNo)`

PromptPay credit transfer to a bank account (sub-tag 04 under tag 29). `bankCode` is the 3-digit BoT bank identifier (`'002'` Bangkok Bank, `'014'` SCB, …); `accountNo` is the variable-length numeric account. Combined wire value is capped at 43 chars per the EMVCo sub-tag limit.

```ts
new ThaiQrPaymentBuilder().bankAccount('014', '1234567890').amount(100).build();
// 00020101021229370016A0000006770101110413014123456789053037645406100.005802TH6304901D
```

This method exists separately from `.promptpay(..., 'bankAccount')` because the wire value needs the (bankCode, accountNo) split a single string can't carry — calling `.promptpay(x, 'bankAccount')` throws.

### `.ota(otaCode)`

Attach a **One-Time Authorization** code (sub-tag 05, exactly 10 chars). The AID swap is the whole point: the builder flips tag 29's GUID from `A000000677010111` (standard PromptPay) to `A000000677010114` (PromptPay OTA) so the receiving bank routes the payload through the single-use credit-transfer flow instead of the repeatable PromptPay merchant flow.

```ts
new ThaiQrPaymentBuilder().promptpay('0812345678').ota('1234567890').amount(50).build();
// 00020101021229510016A00000067701011401130066812345678051012345678905303764540550.005802TH63048856
```

Combines cleanly with `.bankAccount()` for an OTA bank-account transfer.

### `.trueMoney(mobileNo, { amount?, message? })`

TrueMoney Wallet QR. Same merchant template tag as PromptPay (29) but with the literal `'14'` prefix on sub-tag 03 — that prefix is how the TrueMoney app discriminates its own payloads from a plain e-wallet QR. Mobile is zero-padded left to 13 digits, then prefixed; final sub-tag 03 value is always 15 chars.

```ts
new ThaiQrPaymentBuilder().trueMoney('0801111111').build();
// 00020101021129390016A000000677010111031514000080111111153037645802TH63047C0F

new ThaiQrPaymentBuilder().trueMoney('0801111111', { amount: 10, message: 'Hello World!' }).build();
// includes tag 81: '814800480065006C006C006F00200057006F0072006C00640021'
```

The optional `message` is carried in tag 81 as **UTF-16BE** hex (each Unicode code unit becomes 4 uppercase hex chars). It surfaces only inside the TrueMoney app — other wallets ignore it. See [personal message codec](#personal-message-codec) below for the raw encoder.

### `.billPayment({ billerId, reference1?, reference2?, crossBorder? })`

BillPayment merchant template (tag 30). `billerId` is the cross-bank biller identifier (15 chars on the wire); references are application-defined.

```ts
new ThaiQrPaymentBuilder()
  .billPayment({
    billerId: '123456789012345',
    reference1: 'INV001',
    reference2: 'CUST42',
  })
  .amount(250.5)
  .build();
```

Pass `crossBorder: true` to emit the **ASEAN-region remittance AID** (`A000000677012006`) instead of the domestic one (`A000000677010112`) — same sub-tag layout, but receivers route the payment through the ASEAN PayNow / DuitNow / QRIS interop rails instead of the local PromptPay biller switch.

```ts
new ThaiQrPaymentBuilder()
  .billPayment({ billerId: '099400016550100', reference1: '123456789012', crossBorder: true })
  .amount(100)
  .build();
// 00020101021230550016A0000006770120060115099400016550100021212345678901253037645406100.005802TH63049D1C
```

Cross-border payloads pair with the `purposeOfTransaction` additional-data sub-field (tag 62 sub-tag 08), which carries an 18-char triple: currency code (3 digits) + local amount (13 digits) + country code (2 chars). The builder treats that triple opaquely — compose and parse it at the call site.

### `.amount(value, opts?)`

THB amount. Two-decimal output, integer-math rounding (no `0.30000000000000004` surprises). Omit / pass `undefined` for a static QR — the consumer's banking app then prompts for the amount.

```ts
.amount(50)                            // 50.00
.amount(99.5)                          // 99.50
.amount(12345, { fromSatang: true })   // 123.45 — integer satang input
.amount(12345n, { fromSatang: true })  // BigInt also works
.amount(undefined)                     // static QR (no tag 54)
.amount(0)                             // same — zero collapses to static
```

Max wire value: 9,999,999,999.99 THB. Negative, `NaN`, or `Infinity` throws.

Setting any non-zero amount flips the point-of-initiation tag from `11` (static) to `12` (dynamic) automatically. Override with `.pointOfInitiation('static' | 'dynamic')` if you need to force one.

### `.merchant({ name?, city?, postalCode?, categoryCode? })`

Display fields. `name` is truncated to 25 chars, `city` to 15. `categoryCode` is the 4-digit ISO 18245 MCC.

```ts
.merchant({
  name: 'Acme Coffee',
  city: 'BANGKOK',
  postalCode: '10310',
  categoryCode: '5814',  // Fast Food Restaurants
})
```

### `.additionalData({...})`

Sub-fields of tag 62. All nine slots:

```ts
.additionalData({
  billNumber:           'INV-2026-001',   // sub-tag 01
  mobileNumber:         '02-123-4567',    // sub-tag 02
  storeLabel:           'STR01',          // sub-tag 03
  loyaltyNumber:        'LOY42',          // sub-tag 04
  referenceLabel:       'REF99',          // sub-tag 05
  customerLabel:        'CUST42',         // sub-tag 06
  terminalLabel:        'T01',            // sub-tag 07
  purposeOfTransaction: 'PURCHASE',       // sub-tag 08 (or cross-border triple)
  consumerDataRequest:  'EMAIL',          // sub-tag 09
})
```

Multiple `.additionalData()` calls merge — later keys overwrite earlier ones for the same slot.

### `.tipPolicy({...})`

Tags 55–57.

```ts
.tipPolicy({ mode: 'prompt' })                       // app asks the payer
.tipPolicy({ mode: 'fixed', value: 10 })             // 10.00 THB
.tipPolicy({ mode: 'fixed', value: 1000, fromSatang: true })
.tipPolicy({ mode: 'percentage', value: 5 })         // 5.00 %
.tipPolicy(undefined)                                // clear
```

A zero fixed tip throws — pass `undefined` instead.

### `.vatTqrc({ sellerTaxBranchId, vatRate?, vatAmount })`

Bank of Thailand **VAT TQRC** extension (top-level tag 80). Promotes a regular PromptPay payment QR into a **Tax-Qualified-QR-Code** source for Thai e-tax-receipt integrations — the receiving system reads the VAT split off the QR and emits a compliant electronic receipt without a separate API call.

```ts
new ThaiQrPaymentBuilder()
  .promptpay('0812345678')
  .amount(107)
  .vatTqrc({ sellerTaxBranchId: '0001', vatRate: '7', vatAmount: '7.00' })
  .build();
// …8021000400010101702047.00 6304XXXX
```

Field-length rules from the BoT extension spec:

- `sellerTaxBranchId` — exactly 4 chars
- `vatRate` — 1–5 chars when present (e.g. `'7'` or `'7.00'`); omit for VAT-inclusive receipts that don't display a rate
- `vatAmount` — 1–13 chars, required

Pass `undefined` to clear.

### `.build()` / `.buildWithChecksum()` / `.toBytes()`

```ts
const wire = builder.build();
// "00020101…6304XXXX"

const { body, checksum, payload } = builder.buildWithChecksum();
// body ends with "6304" (the CRC tag header is part of the hashed input)
// checksum is the 4-char uppercase hex CRC
// payload === body + checksum

const bytes = builder.toBytes();
// Uint8Array — one byte per ASCII char in payload
```

CRC is **CRC-16/CCITT-FALSE** (poly `0x1021`, init `0xFFFF`, no reflect, no XOR out), computed over the body **plus** the `6304` tag header. Missing that header in your verifier is the classic off-by-spec mistake.

## Parser

```ts
import { parsePayload } from 'thai-qr-payment';
```

### `parsePayload(payload, { strict? })`

```ts
const parsed = parsePayload(wire);
// {
//   payloadFormat: '01',
//   pointOfInitiation: 'dynamic',
//   merchant: { kind: 'promptpay', recipientType: 'mobile', recipient: '0812345678' },
//   amount: 50,
//   currency: '764',
//   country: 'TH',
//   merchantName: 'Acme Coffee',
//   crc: { value: '901D', valid: true, truncated: false },
//   rawTags: [...],
//   getTag(id), getTagValue(id, subId?),
//   ...
// }
```

Default behaviour:

- Verifies the trailing CRC. If the 4-char tail matches the recomputed checksum, returns `crc: { valid: true, truncated: false }`.
- If the tail is 1–3 chars (some Thai banking apps strip leading zeros when re-encoding), tries left-padding with `0` until the checksum matches. On success returns `crc: { valid: true, truncated: true }` — the parsed merchant data is correct; surface a warning to the user if you care about reporting the source app's bug.
- On unrecoverable mismatch: throws.

Pass `{ strict: true }` to refuse the truncated-CRC auto-fix and throw on missing / mismatched CRC immediately. Use strict for trust-boundary parses (slip OCR, payment-link inputs); leave it off when consuming the output of a known-buggy app.

### `ParsedPayload` shape

The `merchant` field is a discriminated union — narrow on `.kind`:

```ts
type Merchant = ParsedPromptPay | ParsedBillPayment | ParsedTrueMoney | null;

interface ParsedPromptPay {
  kind: 'promptpay';
  recipientType: 'mobile' | 'nationalId' | 'eWallet' | 'bankAccount';
  recipient: string;
  bankCode?: string; // set when recipientType === 'bankAccount'
  accountNo?: string; // set when recipientType === 'bankAccount'
  ota?: string; // 10-char OTA code when present
}

interface ParsedBillPayment {
  kind: 'billPayment';
  billerId: string;
  reference1?: string;
  reference2?: string;
  crossBorder: boolean; // true when AID is A000000677012006
}

interface ParsedTrueMoney {
  kind: 'trueMoney';
  mobileNo: string;
  message?: string; // decoded from tag 81 UTF-16BE hex
}
```

`merchant` is `null` only for payloads that lack a recognised merchant template — every PromptPay / BillPayment / TrueMoney shape resolves to a concrete kind.

VAT TQRC, when present, lands at the top level:

```ts
parsed.vatTqrc;
// { sellerTaxBranchId: '0001', vatRate: '7', vatAmount: '7.00' }
```

In strict mode, a tag 80 with a malformed sub-template throws; otherwise it silently degrades to `vatTqrc: undefined`.

### Raw tag accessors

For unknown / future tags, drop down to the raw TLV view:

```ts
parsed.rawTags;
// readonly [{ tag: '00', value: '01' }, { tag: '01', value: '12' }, …]

parsed.getTag('58');
// { tag: '58', value: 'TH' }

parsed.getTagValue('29', '00');
// 'A000000677010111'  — the AID inside the merchant template

parsed.getTagValue('62', '01');
// 'INV-2026-001'  — billNumber sub-field
```

`getTagValue(id, subId?)` descends one level — pass just `id` for a top-level value, `(id, subId)` for nested templates (tags 29–31, 62, 64, 80).

## Low-level TLV helpers

For tools that need to introspect / synthesise raw TLV runs without the full builder:

```ts
import {
  encodeField, // (tag, value) → 'IILLDDDD…'
  encodeFields, // ([tag, value][]) → concatenated, null/empty entries dropped
  parseFields, // (input) → Map<tag, value>
  iterateFields, // (input) → IterableIterator<{tag, value}>
  checksum, // (input) → 4-char uppercase hex CRC-16/CCITT-FALSE
  Tags, // namespace of every spec-defined tag id constant
} from 'thai-qr-payment';

encodeField('58', 'TH'); // '5802TH'
encodeFields([
  ['00', '01'],
  ['01', null],
]); // '000201'

parseFields('5802TH5303764').get('53'); // '764'

checksum('00020101…6304'); // 'ABCD'

Tags.TAG_TRANSACTION_AMOUNT; // '54'
Tags.GUID_PROMPTPAY; // 'A000000677010111'
```

`encodeField` throws if the value exceeds 99 bytes (the EMVCo 2-digit length cap); split across multiple tags at the call site.

## Personal message codec

Tag 81's wire format is the UTF-16BE encoding of the message expressed as uppercase hex. Each Unicode code unit produces 4 hex chars.

```ts
import { encodePersonalMessage, decodePersonalMessage } from 'thai-qr-payment';

encodePersonalMessage('Hello');
// '00480065006C006C006F'

decodePersonalMessage('00480065006C006C006F');
// 'Hello'
```

`.trueMoney(mobile, { message })` calls `encodePersonalMessage` internally; `parsePayload` calls `decodePersonalMessage` for any tag 81 attached to a TrueMoney merchant. The raw codec is exported for callers that want to put the message on a different envelope.

## Tag coverage

See the [spec coverage reference](/reference/spec/) for the complete tag-by-tag implementation table.
