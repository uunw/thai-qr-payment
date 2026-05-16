---
'@thai-qr-payment/payload': minor
'thai-qr-payment': minor
---

Close the feature parity gap with reference Thai QR libraries. New surface:

- **`parsePayload(payload, { strict })`** — opt-in strict CRC mode throws on a missing or mismatched checksum tag. Default stays backwards-compatible.
- **Truncated-CRC auto-fix** — non-strict parses now recover payloads whose CRC was clipped to 1–3 hex chars (some Thai banking apps emit these). The parsed result exposes a `crc: { value, valid, truncated }` bookkeeping field so callers can warn on the source app's bug.
- **Raw tag accessors on `ParsedPayload`** — `getTag(id)` and `getTagValue(id, subId?)` let callers read unknown / future TLV tags without re-parsing. The full `rawTags` list is also exposed.
- **TrueMoney Wallet QR** — `ThaiQrPaymentBuilder.trueMoney(mobileNo, { amount, message })` plus parser support for the matching wire format. UTF-16BE personal-message tag 81 round-trips through `encodePersonalMessage` / `decodePersonalMessage`.
- **Slip Verify Mini-QR** — `buildSlipVerify` / `parseSlipVerify` for the slip-verify envelope (root tag 00, country 51, CRC tag 91 — different from a payment QR). Used by bank Open APIs to look up transactions after slip OCR.
- **TrueMoney Slip Verify** — `buildTrueMoneySlipVerify` / `parseTrueMoneySlipVerify`, including the lowercase-CRC quirk that TrueMoney emits.
- **BOT 1D Barcode** — `buildBotBarcode` / `parseBotBarcode` for the `\r`-delimited counter-payment barcode scanned at bank tellers and 7-Eleven counters. Not EMVCo TLV — a separate wire format entirely.

Bundle impact: payload package 3.09 KB → 4.65 KB brotli (still inside the 5 KB budget). The `payloadFor`-only entrypoint grew 2.98 → 4.48 KB because class methods aren't tree-shaken; budget bumped 4 → 5 KB to match.
