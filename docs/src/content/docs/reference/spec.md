---
title: Spec coverage
description: EMVCo + Bank of Thailand Thai QR Payment tag-by-tag implementation status.
---

Following the **Bank of Thailand / Thai Bankers' Association / KASIKORN BANK Thai QR Payment supplement** layered on top of EMVCo Merchant-Presented-Mode QR Code Specification v1.1:

## Root TLV tags

| Tag | Field | Status | Notes |
|---|---|---|---|
| 00 | Payload Format Indicator | ✓ | always `01` |
| 01 | Point of Initiation | ✓ | `11` static / `12` dynamic, auto-flipped on amount presence |
| 29 | Merchant Account Info — PromptPay | ✓ | GUID `A000000677010111` |
| 30 | Merchant Account Info — BillPayment | ✓ | GUID `A000000677010112` |
| 31 | Merchant Account Info — KShop | reserved | constant exported; no builder helper yet |
| 52 | Merchant Category Code | ✓ | 4-digit ISO 18245 |
| 53 | Transaction Currency | ✓ | always `764` (THB) |
| 54 | Transaction Amount | ✓ | up to 9,999,999,999.99 — 2 decimals — satang input also supported |
| 55 | Tip / Convenience Indicator | ✓ | `01` prompt / `02` fixed / `03` percentage |
| 56 | Tip Fixed | ✓ | THB |
| 57 | Tip Percentage | ✓ | 2 decimals |
| 58 | Country Code | ✓ | always `TH` |
| 59 | Merchant Name | ✓ | up to 25 chars (auto-truncated) |
| 60 | Merchant City | ✓ | up to 15 chars |
| 61 | Postal Code | ✓ | up to 10 chars |
| 62 | Additional Data Field Template | ✓ | all 9 sub-fields |
| 63 | CRC-16/CCITT-FALSE | ✓ | poly `0x1021`, init `0xFFFF`, no reflect, no XOR out |
| 64 | Merchant Information Language Template | not implemented | open issue if you need it |

## PromptPay merchant template (under tag 29)

| Sub-tag | Field | Status |
|---|---|---|
| 00 | GUID `A000000677010111` | ✓ |
| 01 | Mobile Number — 13 chars `0066xxxxxxxxxx` | ✓ |
| 02 | National ID — 13 chars | ✓ |
| 03 | e-Wallet ID — 15 chars | ✓ |

## BillPayment merchant template (under tag 30)

| Sub-tag | Field | Status |
|---|---|---|
| 00 | GUID `A000000677010112` | ✓ |
| 01 | Biller ID | ✓ |
| 02 | Reference 1 | ✓ |
| 03 | Reference 2 | ✓ |

## Additional Data Field Template (under tag 62)

| Sub-tag | Field | Builder method |
|---|---|---|
| 01 | Bill Number | `additionalData({ billNumber })` |
| 02 | Mobile Number | `additionalData({ mobileNumber })` |
| 03 | Store Label | `additionalData({ storeLabel })` |
| 04 | Loyalty Number | `additionalData({ loyaltyNumber })` |
| 05 | Reference Label | `additionalData({ referenceLabel })` |
| 06 | Customer Label | `additionalData({ customerLabel })` |
| 07 | Terminal Label | `additionalData({ terminalLabel })` |
| 08 | Purpose of Transaction | `additionalData({ purposeOfTransaction })` |
| 09 | Additional Consumer Data Request | `additionalData({ consumerDataRequest })` |

## QR Code spec (ISO/IEC 18004 Model 2)

| Aspect | Status |
|---|---|
| Versions 1-40 | ✓ all |
| Error correction L / M / Q / H | ✓ all |
| Encoding modes (numeric / alphanumeric / byte) | ✓ all + auto-detect |
| Reed-Solomon over GF(2^8) with primitive `0x11D` | ✓ |
| Mask patterns 0-7 + penalty scoring | ✓ |
| Format info (BCH 15,5) | ✓ |
| Version info (BCH 18,6) for v7+ | ✓ |
| Alignment patterns per Annex E | ✓ pinned via regression tests after v0.1.0 bug |
| Quiet zone | configurable (default 4 modules) |

## Reference standards

- [EMVCo QR Code Specification for Payment Systems — Merchant Presented Mode v1.1](https://www.emvco.com/specifications/)
- [ISO/IEC 18004:2015 — Information technology — Automatic identification and data capture techniques — QR Code bar code symbology specification](https://www.iso.org/standard/62021.html)
- Bank of Thailand "Thai QR Payment" supplement (referenced via the KBank API portal — not publicly indexed)
