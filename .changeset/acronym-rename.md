---
'thai-qr-payment': minor
'@thai-qr-payment/payload': minor
'@thai-qr-payment/qr': minor
'@thai-qr-payment/assets': minor
'@thai-qr-payment/render': minor
'@thai-qr-payment/cli': minor
'@thai-qr-payment/react': minor
---

**Breaking rename** of every public type, class, interface, and exported function whose name contained a lowercase acronym (`Qr`, `Crc`, `Tlv`, `Svg`, `Vat`, `Tqrc`, `Bot`). Acronyms are now uppercased in the standalone-name position to match the BoT / EMVCo / ISO spec writing convention and the JavaScript native style for acronym types (`URL`, `JSON`, `XMLHttpRequest`).

Treating this as a `minor` bump instead of `major` because the lib is fresh — there are effectively no external consumers yet, and a same-day `2.0.0` after the `1.0.0` reset would be cosmetic noise.

| Before | After |
| --- | --- |
| `ThaiQrPaymentBuilder` | `ThaiQRPaymentBuilder` |
| `ParsedCrc` | `ParsedCRC` |
| `TlvField` | `TLVField` |
| `QrMatrix` | `QRMatrix` |
| `QrSvgOptions` | `QRSvgOptions` |
| `VatTqrcInput` | `VATTQRCInput` |
| `ParsedVatTqrc` | `ParsedVATTQRC` |
| `BotBarcodeInput` | `BOTBarcodeInput` |
| `ParsedBotBarcode` | `ParsedBOTBarcode` |
| `ThaiQrPayment` (React) | `ThaiQRPayment` |
| `ThaiQrPaymentMatrix` (React) | `ThaiQRPaymentMatrix` |
| `ThaiQrPaymentProps` (React) | `ThaiQRPaymentProps` |
| `ThaiQrPaymentMatrixProps` (React) | `ThaiQRPaymentMatrixProps` |
| `renderThaiQrPayment` | `renderThaiQRPayment` |
| `renderThaiQrPaymentMatrix` | `renderThaiQRPaymentMatrix` |
| `renderQrSvg` | `renderQRSvg` |
| `buildBotBarcode` | `buildBOTBarcode` |
| `parseBotBarcode` | `parseBOTBarcode` |

Methods on the builder (`.vatTqrc()`, `.bankAccount()`, `.ota()`, …) keep camelCase per TypeScript's standard library convention (`.toString`, `.getElementById`). Constants (`TAG_VAT_TQRC`, `GUID_PROMPTPAY`, …) were already SCREAMING_SNAKE so they didn't move.

To migrate, run a single regex pass on your codebase using the table above. No behaviour or wire-format changes.
