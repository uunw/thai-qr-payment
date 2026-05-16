---
title: BOT barcode
description: Build + parse the Bank of Thailand 1D bill-payment barcode.
---

## Why

The **Bank of Thailand 1D bill-payment barcode** is the one-dimensional ASCII string printed on Thai utility bills, scanned at bank tellers, 7-Eleven counters, and kiosk machines for over-the-counter bill payments. It is **not** EMVCo, **not** a QR, **not** TLV — the wire format is a `|`-led `\r`-delimited string with no checksum.

It lives in the same `@thai-qr-payment/payload` package because the `billerId` / `ref1` / `ref2` vocabulary matches the Thai bill-payment merchant template (EMVCo tag 30), but the on-wire bytes are unrelated. The module sits behind its own export so callers who only need the QR path can tree-shake it away.

```ts
import { buildBotBarcode, parseBotBarcode } from 'thai-qr-payment';
```

## Build

`buildBotBarcode({ billerId, ref1, ref2?, amount? })`. `billerId` is the 15-char cross-bank biller id (Tax ID + suffix); shorter inputs are zero-padded on the left, longer ones throw. `ref1` is required; `ref2` defaults to the empty string on the wire when omitted.

```ts
buildBotBarcode({
  billerId: '099400016550100',
  ref1: '123456789012',
  ref2: '670429',
  amount: 3649.22,
});
// '|099400016550100\r123456789012\r670429\r364922'
```

The trailing amount is stored as **integer satang** (baht × 100, rounded). Omit it (or pass `0`) for a counter-keyed total — the literal `'0'` sentinel is written and the cashier types the amount in by hand:

```ts
buildBotBarcode({ billerId: '099999999999990', ref1: '111222333444' });
// '|099999999999990\r111222333444\r\r0'
```

Throws on malformed input — negative / non-finite amounts, over-long biller ids, CR characters inside any field, empty `ref1`. The caller never silently produces an unscannable barcode.

## Parse

`parseBotBarcode(barcode)` returns the decoded fields, or `null` on any structural issue (missing prefix, wrong field count, biller id too short). Amount comes back as a decimal baht number; the `'0'` sentinel surfaces as `undefined`.

```ts
parseBotBarcode('|099400016550100\r123456789012\r670429\r364922');
// {
//   billerId: '099400016550100',
//   ref1: '123456789012',
//   ref2: '670429',
//   amount: 3649.22,
// }

parseBotBarcode('|099999999999990\r111222333444\r\r0');
// { billerId: '099999999999990', ref1: '111222333444' }
```

`null` instead of an exception lets you branch without `try / catch` — useful when consuming arbitrary scanner input that may or may not be a BOT barcode.

## Sample wires

| Wire (escaped)                                    | Decoded                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `\|099999999999990\r111222333444\r\r0`            | `{ billerId: '099999999999990', ref1: '111222333444' }`                                  |
| `\|099400016550100\r123456789012\r670429\r364922` | `{ billerId: '099400016550100', ref1: '123456789012', ref2: '670429', amount: 3649.22 }` |

Wire bytes: `\|` is a literal pipe (0x7C, the sentinel); each `\r` is a single carriage return (0x0D); no terminator at the end. The string is always exactly one pipe + three `\r` separators regardless of which optional fields are populated — empty slots are zero-width on the wire.
