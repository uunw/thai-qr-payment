---
title: Spec coverage
description: EMVCo + Bank of Thailand Thai QR Payment tag-by-tag implementation status.
---

Following the **Bank of Thailand / Thai Bankers' Association / KASIKORN BANK Thai QR Payment supplement** layered on top of EMVCo Merchant-Presented-Mode QR Code Specification v1.1:

## Root TLV tags

| Tag | Field                                  | Status          | Notes                                                                 |
| --- | -------------------------------------- | --------------- | --------------------------------------------------------------------- |
| 00  | Payload Format Indicator               | ✓               | always `01`                                                           |
| 01  | Point of Initiation                    | ✓               | `11` static / `12` dynamic, auto-flipped on amount presence           |
| 29  | Merchant Account Info — PromptPay      | ✓               | GUID `…0111` (standard), `…0114` (OTA); shared by TrueMoney Wallet QR |
| 30  | Merchant Account Info — BillPayment    | ✓               | GUID `…0112` (domestic), `…012006` (cross-border)                     |
| 31  | Merchant Account Info — KShop          | reserved        | constant exported; no builder helper yet                              |
| 52  | Merchant Category Code                 | ✓               | 4-digit ISO 18245                                                     |
| 53  | Transaction Currency                   | ✓               | always `764` (THB)                                                    |
| 54  | Transaction Amount                     | ✓               | up to 9,999,999,999.99 — 2 decimals — satang input also supported     |
| 55  | Tip / Convenience Indicator            | ✓               | `01` prompt / `02` fixed / `03` percentage                            |
| 56  | Tip Fixed                              | ✓               | THB                                                                   |
| 57  | Tip Percentage                         | ✓               | 2 decimals                                                            |
| 58  | Country Code                           | ✓               | always `TH`                                                           |
| 59  | Merchant Name                          | ✓               | up to 25 chars (auto-truncated)                                       |
| 60  | Merchant City                          | ✓               | up to 15 chars                                                        |
| 61  | Postal Code                            | ✓               | up to 10 chars                                                        |
| 62  | Additional Data Field Template         | ✓               | all 9 sub-fields                                                      |
| 63  | CRC-16/CCITT-FALSE                     | ✓               | poly `0x1021`, init `0xFFFF`, no reflect, no XOR out                  |
| 64  | Merchant Information Language Template | not implemented | open issue if you need it                                             |
| 80  | VAT TQRC (BoT tax-qualified extension) | ✓               | 3 sub-fields — promotes a payment QR to an e-tax-receipt source       |
| 81  | Personal message                       | ✓               | UTF-16BE-as-hex; carried by TrueMoney Wallet QR                       |

## PromptPay merchant template (under tag 29)

Sub-tag 00 carries one of two AIDs:

- `A000000677010111` — standard PromptPay credit transfer
- `A000000677010114` — PromptPay credit transfer with One-Time Authorization (OTA)

The OTA AID is auto-selected when `.ota(code)` is set on the builder. Scanners route the payload through the single-use flow.

| Sub-tag | Field                                                     | Status |
| ------- | --------------------------------------------------------- | ------ |
| 00      | GUID — `A000000677010111` or `A000000677010114` (OTA)     | ✓      |
| 01      | Mobile Number — 13 chars `0066xxxxxxxxxx`                 | ✓      |
| 02      | National ID — 13 chars                                    | ✓      |
| 03      | e-Wallet ID — 15 chars                                    | ✓      |
| 04      | Bank Account — 3-digit bank code + account no, 1–43 chars | ✓      |
| 05      | OTA code — fixed 10 chars                                 | ✓      |

### TrueMoney Wallet layout (also tag 29)

Shares the PromptPay AID (`A000000677010111`) but the e-wallet sub-tag 03 carries a `14`-prefixed 15-char identifier (`14` + 13-char zero-padded mobile). The literal `14` prefix is the sole disambiguator at parse time. The optional personal message rides on tag 81 as UTF-16BE-encoded hex.

## BillPayment merchant template (under tag 30)

Sub-tag 00 carries one of two AIDs:

- `A000000677010112` — domestic cross-bank bill payment
- `A000000677012006` — cross-border bill payment (ASEAN PayNow / DuitNow / QRIS interop)

When the cross-border AID is set, the additional-data `purposeOfTransaction` (tag 62 sub-tag 08) carries an opaque 18-char triple — currencyCode (3) + localAmount (13) + countryCode (2). The builder treats it as a raw string; compose / parse at the call site.

| Sub-tag | Field                                                          | Status |
| ------- | -------------------------------------------------------------- | ------ |
| 00      | GUID — `A000000677010112` or `A000000677012006` (cross-border) | ✓      |
| 01      | Biller ID                                                      | ✓      |
| 02      | Reference 1                                                    | ✓      |
| 03      | Reference 2                                                    | ✓      |

## VAT TQRC template (under tag 80)

Bank of Thailand tax-qualified extension. Promotes the surrounding payment QR to an e-tax-receipt source. Sub-tag order on the wire is 00 → 01 → 02.

| Sub-tag | Field             | Notes                |
| ------- | ----------------- | -------------------- |
| 00      | sellerTaxBranchId | exactly 4 chars      |
| 01      | vatRate           | 1–5 chars (optional) |
| 02      | vatAmount         | 1–13 chars           |

## Additional Data Field Template (under tag 62)

| Sub-tag | Field                            | Builder method                             |
| ------- | -------------------------------- | ------------------------------------------ |
| 01      | Bill Number                      | `additionalData({ billNumber })`           |
| 02      | Mobile Number                    | `additionalData({ mobileNumber })`         |
| 03      | Store Label                      | `additionalData({ storeLabel })`           |
| 04      | Loyalty Number                   | `additionalData({ loyaltyNumber })`        |
| 05      | Reference Label                  | `additionalData({ referenceLabel })`       |
| 06      | Customer Label                   | `additionalData({ customerLabel })`        |
| 07      | Terminal Label                   | `additionalData({ terminalLabel })`        |
| 08      | Purpose of Transaction           | `additionalData({ purposeOfTransaction })` |
| 09      | Additional Consumer Data Request | `additionalData({ consumerDataRequest })`  |

## QR Code spec (ISO/IEC 18004 Model 2)

| Aspect                                           | Status                                         |
| ------------------------------------------------ | ---------------------------------------------- |
| Versions 1-40                                    | ✓ all                                          |
| Error correction L / M / Q / H                   | ✓ all                                          |
| Encoding modes (numeric / alphanumeric / byte)   | ✓ all + auto-detect                            |
| Reed-Solomon over GF(2^8) with primitive `0x11D` | ✓                                              |
| Mask patterns 0-7 + penalty scoring              | ✓                                              |
| Format info (BCH 15,5)                           | ✓                                              |
| Version info (BCH 18,6) for v7+                  | ✓                                              |
| Alignment patterns per Annex E                   | ✓ pinned via regression tests after v0.1.0 bug |
| Quiet zone                                       | configurable (default 4 modules)               |

## Non-EMVCo envelopes

These wire formats share no tag space with the payment QR — different envelopes, different CRC tags (or none). They live in `@thai-qr-payment/payload` alongside the main TLV machinery.

### Slip Verify Mini-QR

Printed on bank transfer slips. Resolves a transaction via bank Open APIs after slip OCR. Same EMVCo TLV grammar, different root tags.

| Tag | Field                  | Notes                                                              |
| --- | ---------------------- | ------------------------------------------------------------------ |
| 00  | Root template (nested) | carries sub-fields `00` API type, `01` sending bank, `02` transRef |
| 51  | Country code           | always `TH`                                                        |
| 91  | CRC-16/CCITT-FALSE     | same algorithm as tag 63; positioned at tag 91 here                |

A TrueMoney variant uses a different sub-field layout under tag 00 and emits a **lowercase** hex CRC. See [Slip Verify](/guide/slip-verify/) for the builder / parser API.

### Bank of Thailand 1D bill-payment barcode

Counter-payment barcode scanned at bank tellers and 7-Eleven cashier stations. **Not EMVCo TLV** — a `|`-prefixed, `\r`-delimited ASCII string with no CRC.

```
|<billerId>\r<ref1>\r<ref2>\r<amount>
```

- `billerId` — 15 chars (Tax ID + suffix), zero-padded on emit
- `ref1` — mandatory customer / invoice reference
- `ref2` — empty string when unused
- `amount` — integer satang, or literal `0` when the cashier keys it in

See [BOT barcode](/guide/barcode/) for the builder / parser API.

## Reference standards

- [EMVCo QR Code Specification for Payment Systems — Merchant Presented Mode v1.1](https://www.emvco.com/specifications/)
- [ISO/IEC 18004:2015 — Information technology — Automatic identification and data capture techniques — QR Code bar code symbology specification](https://www.iso.org/standard/62021.html)
- Bank of Thailand "Thai QR Payment" supplement (referenced via the KBank API portal — not publicly indexed)
