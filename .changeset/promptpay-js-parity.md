---
'@thai-qr-payment/payload': minor
'thai-qr-payment': minor
---

Close the second feature parity gap (vs `promptpay-js`). Four new wire-format surfaces:

- **`.bankAccount(bankCode, accountNo)`** — PromptPay credit transfer to a bank account (sub-tag 04 under tag 29). Adds `'bankAccount'` to `PromptPayRecipientType`. Parser exposes optional `bankCode` + `accountNo` on the parsed merchant.
- **`.ota(otaCode)`** — One-Time Authorization PromptPay credit transfer (sub-tag 05, fixed 10 chars). Builder swaps the merchant AID from `A000000677010111` to `A000000677010114` so scanners route the payload through the single-use flow. Parser surfaces the OTA code on `ParsedPromptPay.ota`.
- **`.vatTqrc({ sellerTaxBranchId, vatRate?, vatAmount })`** — VAT TQRC (top-level tag 80). Turns a regular PromptPay payment QR into a Bank-of-Thailand-Tax-Qualified-QR-Code source for e-tax-receipt integrations. Parser exposes `vatTqrc` on `ParsedPayload`.
- **`.billPayment({ ..., crossBorder: true })`** — cross-border bill payment (ASEAN PayNow / DuitNow / QRIS interop). Same tag-30 envelope, different AID (`A000000677012006`). Parser flags `ParsedBillPayment.crossBorder: boolean`. The 18-char `purposeOfTransaction` triple (currencyCode + localAmount + countryCode) round-trips opaquely.

Bundle impact: `@thai-qr-payment/payload` 4.65 → 5.37 KB brotli; sub-path entry 4.61 → 5.33 KB; `payloadFor`-only entry 4.48 → 5.20 KB. All three budgets bumped 5 → 6 KB to absorb the new class methods (which don't tree-shake).
