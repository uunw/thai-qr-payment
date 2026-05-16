---
title: Slip Verify
description: Build + parse the Mini-QR printed on Thai bank transfer slips.
---

## Why

A **Slip Verify Mini-QR** is the small square QR printed on a bank transfer slip (and shown inside the PromptPay app's slip-detail view). It is **not** a payment QR — its sole purpose is to feed a bank Open API the reference it needs to look the transaction up after the slip image is OCR'd or scanned. Use it to verify that a customer who claims to have paid actually did.

The envelope shares the EMVCo TLV grammar but uses its own root tags — see the [wire format table](#wire-format) below. Two variants exist: the standard one defined by the **Bank of Thailand Thai QR Payment supplement**, and a TrueMoney variant emitted by the TrueMoney Wallet app.

```ts
import {
  buildSlipVerify,
  parseSlipVerify,
  buildTrueMoneySlipVerify,
  parseTrueMoneySlipVerify,
} from 'thai-qr-payment';
```

## Standard slip-verify

`buildSlipVerify({ sendingBank, transRef })` emits the wire payload; `parseSlipVerify(payload)` recovers the two fields. `sendingBank` is the 3-digit BoT bank code (`'002'` Bangkok Bank, `'014'` SCB, etc.); `transRef` is the reference printed on the slip.

```ts
const wire = buildSlipVerify({
  sendingBank: '002',
  transRef: '0002123123121200011',
});
// '004000060000010103002021900021231231212000115102TH91049C30'

parseSlipVerify(wire);
// { sendingBank: '002', transRef: '0002123123121200011' }
```

The parser returns `null` (not an exception) on any payload that isn't a valid slip-verify envelope — wrong root tag, wrong CRC tag, wrong API marker, or unrecoverable checksum mismatch. Callers can branch on the result without `try / catch`.

Truncated-CRC auto-fix is on by default: some bank apps strip leading zeros from the tag-91 hex CRC when re-encoding, so a 1–3 char tail is left-padded with `0` and re-verified before giving up.

```ts
// Bank app emitted "…91049C30" with the leading '0' dropped — still parses
parseSlipVerify('…91049C3'); // → { sendingBank, transRef }  (auto-fixed)
```

## TrueMoney slip-verify

TrueMoney's variant uses the same envelope (root tag 00, country tag 51, CRC tag 91) with a different sub-tag layout. `date` is a **`DDMMYYYY` 8-char string** — the builder throws if the length is wrong.

```ts
const wire = buildTrueMoneySlipVerify({
  eventType: 'P2P',
  transactionId: 'TXN0001234567',
  date: '25012024',
});
// '00480002010102010203P2P0313TXN00012345670408250120249104b425'

parseTrueMoneySlipVerify(wire);
// { eventType: 'P2P', transactionId: 'TXN0001234567', date: '25012024' }
```

**Lowercase-CRC quirk:** the TrueMoney variant emits the tag-91 CRC as **lowercase** hex (`9104b425`), not the uppercase form everyone else uses. The parser accepts either case so you can re-hash, normalise, or store in any form — but if you're handing the wire bytes to another tool, preserve the case TrueMoney shipped or its own scanner may refuse.

The two parsers are strict about which envelope they accept: `parseSlipVerify` returns `null` on a TrueMoney payload, and `parseTrueMoneySlipVerify` returns `null` on a standard one. Try both in order if you don't know which variant your input is.

## Wire format

### Standard slip-verify

Root template at tag 00; country tag 51; CRC at tag 91 (uppercase hex). Tag 00's value is itself a TLV run:

| Tag | Name                 | Length | Example value      |
| --- | -------------------- | ------ | ------------------ |
| 00  | Root template        | var    | (nested TLV below) |
| 51  | Country              | 2      | `TH`               |
| 91  | CRC-16 / CCITT-FALSE | 4      | `9C30`             |

Sub-tags inside tag 00:

| Sub-tag | Name            | Length | Example value         |
| ------- | --------------- | ------ | --------------------- |
| 00      | API type marker | 6      | `000001`              |
| 01      | Sending bank    | var    | `002`                 |
| 02      | Transaction ref | var    | `0002123123121200011` |

### TrueMoney slip-verify

Same root tag / country tag / CRC tag, different sub-tag layout (and lowercase CRC):

| Tag | Name                 | Length | Example value      |
| --- | -------------------- | ------ | ------------------ |
| 00  | Root template        | var    | (nested TLV below) |
| 91  | CRC-16 / CCITT-FALSE | 4      | `b425`             |

Sub-tags inside tag 00:

| Sub-tag | Name              | Length | Example value   |
| ------- | ----------------- | ------ | --------------- |
| 00      | Marker A (`'01'`) | 2      | `01`            |
| 01      | Marker B (`'01'`) | 2      | `01`            |
| 02      | Event type        | var    | `P2P`           |
| 03      | Transaction id    | var    | `TXN0001234567` |
| 04      | Date (`DDMMYYYY`) | 8      | `25012024`      |

The marker pair (sub-tags 00 + 01 both `'01'`) is the discriminator that distinguishes a TrueMoney envelope from the standard one — without it `parseTrueMoneySlipVerify` returns `null`.
