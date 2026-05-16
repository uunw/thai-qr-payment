# @thai-qr-payment/payload

## 1.0.0

### Minor Changes

- [`7ae8f9d`](https://github.com/uunw/thai-qr-payment/commit/7ae8f9d32bbcaf6cddffa825c885766887487e4f) Thanks [@uunw](https://github.com/uunw)! - Close the feature parity gap with reference Thai QR libraries. New surface:
  - **`parsePayload(payload, { strict })`** — opt-in strict CRC mode throws on a missing or mismatched checksum tag. Default stays backwards-compatible.
  - **Truncated-CRC auto-fix** — non-strict parses now recover payloads whose CRC was clipped to 1–3 hex chars (some Thai banking apps emit these). The parsed result exposes a `crc: { value, valid, truncated }` bookkeeping field so callers can warn on the source app's bug.
  - **Raw tag accessors on `ParsedPayload`** — `getTag(id)` and `getTagValue(id, subId?)` let callers read unknown / future TLV tags without re-parsing. The full `rawTags` list is also exposed.
  - **TrueMoney Wallet QR** — `ThaiQrPaymentBuilder.trueMoney(mobileNo, { amount, message })` plus parser support for the matching wire format. UTF-16BE personal-message tag 81 round-trips through `encodePersonalMessage` / `decodePersonalMessage`.
  - **Slip Verify Mini-QR** — `buildSlipVerify` / `parseSlipVerify` for the slip-verify envelope (root tag 00, country 51, CRC tag 91 — different from a payment QR). Used by bank Open APIs to look up transactions after slip OCR.
  - **TrueMoney Slip Verify** — `buildTrueMoneySlipVerify` / `parseTrueMoneySlipVerify`, including the lowercase-CRC quirk that TrueMoney emits.
  - **BOT 1D Barcode** — `buildBotBarcode` / `parseBotBarcode` for the `\r`-delimited counter-payment barcode scanned at bank tellers and 7-Eleven counters. Not EMVCo TLV — a separate wire format entirely.

  Bundle impact: payload package 3.09 KB → 4.65 KB brotli (still inside the 5 KB budget). The `payloadFor`-only entrypoint grew 2.98 → 4.48 KB because class methods aren't tree-shaken; budget bumped 4 → 5 KB to match.

- [`5a5a62e`](https://github.com/uunw/thai-qr-payment/commit/5a5a62eb40c20dfb5c92c4a198bcbef0f7de0238) Thanks [@uunw](https://github.com/uunw)! - Close the second feature parity gap (vs `promptpay-js`). Four new wire-format surfaces:
  - **`.bankAccount(bankCode, accountNo)`** — PromptPay credit transfer to a bank account (sub-tag 04 under tag 29). Adds `'bankAccount'` to `PromptPayRecipientType`. Parser exposes optional `bankCode` + `accountNo` on the parsed merchant.
  - **`.ota(otaCode)`** — One-Time Authorization PromptPay credit transfer (sub-tag 05, fixed 10 chars). Builder swaps the merchant AID from `A000000677010111` to `A000000677010114` so scanners route the payload through the single-use flow. Parser surfaces the OTA code on `ParsedPromptPay.ota`.
  - **`.vatTqrc({ sellerTaxBranchId, vatRate?, vatAmount })`** — VAT TQRC (top-level tag 80). Turns a regular PromptPay payment QR into a Bank-of-Thailand-Tax-Qualified-QR-Code source for e-tax-receipt integrations. Parser exposes `vatTqrc` on `ParsedPayload`.
  - **`.billPayment({ ..., crossBorder: true })`** — cross-border bill payment (ASEAN PayNow / DuitNow / QRIS interop). Same tag-30 envelope, different AID (`A000000677012006`). Parser flags `ParsedBillPayment.crossBorder: boolean`. The 18-char `purposeOfTransaction` triple (currencyCode + localAmount + countryCode) round-trips opaquely.

  Bundle impact: `@thai-qr-payment/payload` 4.65 → 5.37 KB brotli; sub-path entry 4.61 → 5.33 KB; `payloadFor`-only entry 4.48 → 5.20 KB. All three budgets bumped 5 → 6 KB to absorb the new class methods (which don't tree-shake).

## 0.1.3

### Patch Changes

- [`ba9e8e8`](https://github.com/uunw/thai-qr-payment/commit/ba9e8e8022d864475710e631d4fb104a951b6f51) Thanks [@uunw](https://github.com/uunw)! - Point every package `homepage` at the new docs site `https://thai-qr-payment.js.org`. Ship sourcemaps with every published bundle and keep original function + class names through minification — published code is now traceable to source and no longer trips supply-chain scanners that flag aggressive mangling.

## 0.1.2

### Patch Changes

- [`f3e30b9`](https://github.com/uunw/thai-qr-payment/commit/f3e30b9b038db7b6d0b713a5104bd62f075aa9f0) Thanks [@uunw](https://github.com/uunw)! - Redesign `renderCard()` to match the official BOT/TBA "Thai QR Payment" brand guideline:
  - **Canvas 600 × 800** (3:4 aspect, kittinan-style ratio with footer room).
  - **Full-width navy strip** at the top (rounded top corners, flat bottom). Replaces the previous floating logo island that left gaps on either side.
  - **Logo centred inside the strip** at 210 × 80 with vertical padding. Uses the tight content-bbox crop (viewBox `88 75 750 210`) so icon + wordmark sit tight together while the strip provides the navy breathing room.
  - **PromptPay2 sub-mark** (navy color variant) is now the default for `theme: 'color'`. PromptPay1 (monochrome) remains for `theme: 'silhouette'`. Both pickable via `promptpayLogo: 'PromptPay1' | 'PromptPay2'`.
  - **PromptPay2 ships as an embedded PNG** inside the SVG wrapper. Vectorising the wordmark produced jagged polygons; embedding the raster preserves font fidelity at every render size.
  - **TQR Maximum Blue (`#00427A`) is the default accent**, replacing the bad-vectorisation `#0e3d67`. Auxiliary navy shades + the iris `#1ba997` were unified to the brand colours throughout `Thai_QR_Payment_Logo-01.svg`.
  - **QR modules render in `#000000` by default** for max scanner contrast, decoupled from the `accent` colour. New `qrColor` option overrides per-render.
  - **Centre-overlay Thai QR Payment icon** at 16 % of the QR width, on a white pad. Active by default for `theme: 'color'`; opt out via `centerOverlay: false`.
  - **Optional merchant name + amount label** stacked below the QR.
  - `renderThaiQrPayment()` one-shot helper now defaults `errorCorrectionLevel` to `'H'` (was `'M'`) because the centre overlay obscures ~3 % of the modules — H ECC recovers them cleanly.

  No API removed. `CardOptions` gains `centerOverlay` and `qrColor` (both optional). Callers that don't override stay on the new defaults.

## 0.1.1

### Patch Changes

- [`e4af92f`](https://github.com/uunw/thai-qr-payment/commit/e4af92fcacd002ba119209fc92284c7ce31fc956) Thanks [@uunw](https://github.com/uunw)! - Fix QR matrix alignment-pattern placement for v2-v40. The previous
  `alignmentCentres()` lost the spec's intermediate positions through a
  buggy `shift()/unshift()` sequence, leaving alignment patterns at the
  wrong coordinates (or missing entirely). Every QR at version ≥ 2 was
  rejected by scanners as "invalid". v1 was unaffected because it has
  no alignment patterns.

  Rewrite the routine using the canonical "walk backwards from
  `dim - 7`, prepending each position until we hit `floor(v/7) + 2`
  entries" algorithm from ISO/IEC 18004 Annex E. Adds 10 regression
  tests against the Annex E table.

  QR output now decodes cleanly via jsQR for every (version, ECC, mask)
  combination, including the 80+ character Thai QR Payment payloads at
  v6-H that scanners previously rejected.
