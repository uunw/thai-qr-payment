---
title: Payload (EMVCo TLV)
description: Build + parse Thai QR Payment wire payloads with @thai-qr-payment/payload.
---

The `@thai-qr-payment/payload` package implements the **EMVCo Merchant-Presented-Mode** QR specification layered with the **Bank of Thailand / Thai Bankers' Association / KASIKORN Thai QR Payment supplement**. Zero dependencies, works in every JS runtime.

## One-shot helper

```ts
import { payloadFor } from 'thai-qr-payment';

const wire = payloadFor({ recipient: '0812345678', amount: 50 });
// 00020101021229370016A00000067701011101130066812345678530376454065000.005802TH6304ABCD
```

## Builder for full control

```ts
import { ThaiQrPaymentBuilder } from 'thai-qr-payment';

const wire = new ThaiQrPaymentBuilder()
  .promptpay('0812345678')
  .amount(120.5)
  .merchant({ name: 'Acme Coffee', city: 'BANGKOK', categoryCode: '5814', postalCode: '10310' })
  .additionalData({ billNumber: 'INV-2026-001', terminalLabel: 'T01' })
  .tipPolicy({ mode: 'prompt' })
  .build();
```

Terminal methods:

- `.build()` — wire string with CRC appended
- `.buildWithChecksum()` — `{ body, checksum, payload }`
- `.toBytes()` — `Uint8Array` for hashing / transport

## Recipient types

| Input length (digits) | Default type                             | Wire sub-tag |
| --------------------- | ---------------------------------------- | ------------ |
| 9-12                  | `mobile` (formatted to `0066xxxxxxxxxx`) | `01`         |
| 13                    | `nationalId` (passed verbatim)           | `02`         |
| 15                    | `eWallet` (passed verbatim)              | `03`         |

Override the inference explicitly:

```ts
builder.promptpay('1234567890123', 'nationalId');
builder.promptpay('123456789012345', 'eWallet');
```

## BillPayment

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

## Tip policy

```ts
.tipPolicy({ mode: 'prompt' })            // app asks payer
.tipPolicy({ mode: 'fixed', value: 10 })  // fixed THB
.tipPolicy({ mode: 'percentage', value: 5 })
```

## Parsing captured QR strings

```ts
import { parsePayload } from 'thai-qr-payment';

const parsed = parsePayload(wire);
// {
//   payloadFormat: '01',
//   pointOfInitiation: 'dynamic',
//   merchant: { kind: 'promptpay', recipientType: 'mobile', recipient: '0812345678' },
//   amount: 50,
//   currency: '764',
//   country: 'TH',
//   merchantName: 'Acme Coffee',
//   ...
// }
```

`parsePayload` verifies the trailing **CRC-16/CCITT-FALSE** checksum and throws on tamper.

## Amount formatting

```ts
.amount(50)                          // 50.00
.amount(99.5)                        // 99.50
.amount(12345, { fromSatang: true }) // 123.45 — integer satang input
.amount(12345n, { fromSatang: true }) // BigInt also works
.amount(undefined)                   // static QR (no amount tag)
.amount(0)                           // static (zero ignored)
```

Max wire value: 9,999,999,999.99 THB. Negative or `NaN` throws.

## Tag coverage

See the [spec coverage reference](/thai-qr-payment/reference/spec/) for the complete tag-by-tag table.
