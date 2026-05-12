---
title: QR encoder
description: ISO/IEC 18004 QR Code encoder — Reed-Solomon + Galois field, zero dependencies.
---

The `@thai-qr-payment/qr` package implements ISO/IEC 18004 Model-2 QR Code generation. Reed-Solomon error correction over GF(2^8) is hand-rolled — no `qrcode`, no native bindings.

## Quickstart

```ts
import { encodeQR } from 'thai-qr-payment';

const { size, modules, version, mask, errorCorrectionLevel } = encodeQR(
  '00020101021229370016A000000677010111...6304ABCD',
  { errorCorrectionLevel: 'H' },
);

// modules: boolean[][]   — modules[y][x] === true → dark module
// size:    number         — matrix dimension in modules
// version: 1..40
// mask:    0..7
```

The output is a pure data structure. Pair with `@thai-qr-payment/render` for SVG.

## API

### `encodeQR(text, options?)`

| Option                 | Default | Notes                                             |
| ---------------------- | ------- | ------------------------------------------------- |
| `errorCorrectionLevel` | `'M'`   | `'L'` / `'M'` / `'Q'` / `'H'`                     |
| `minVersion`           | `1`     | floor for version selection                       |
| `maxVersion`           | `40`    | ceiling — throws if input doesn't fit             |
| `forceMask`            | auto    | `0..7` — auto-selected by penalty score otherwise |

### `detectMode(text)`

```ts
detectMode('1234567890'); // 'numeric'
detectMode('HELLO WORLD'); // 'alphanumeric'
detectMode('สวัสดี'); // 'byte' (UTF-8 fallback)
```

EMVCo payloads always fit in `alphanumeric` mode (`[0-9A-Z $%*+-./:]`).

## How it works

1. **Mode detection** — narrowest viable mode (numeric → alphanumeric → byte)
2. **Version selection** — smallest version that fits the bit budget at the requested ECC level
3. **Bit packing** — mode indicator + char-count + data bits → packed codewords + filler
4. **Reed-Solomon ECC** — appended per ISO/IEC 18004 §7.5, blocks interleaved per §7.6
5. **Module placement** — finder + alignment + timing + format-info + version-info + data zigzag
6. **Mask selection** — all 8 masks scored on the four spec penalty rules; lowest wins

## Property tests

| Invariant                                                            | Status               |
| -------------------------------------------------------------------- | -------------------- |
| RS linearity: `enc(a) ⊕ enc(b) === enc(a ⊕ b)`                       | ✓ verified           |
| GF(2^8) distributivity: `a · (b ⊕ c) === (a·b) ⊕ (a·c)`              | ✓ verified           |
| CRC-16/CCITT-FALSE determinism over 200 random inputs                | ✓                    |
| Alignment-pattern centres pinned to ISO/IEC 18004 Annex E for v2-v40 | ✓ 10 pinned versions |

## v0.1.0 → v0.1.1 fix

The initial v0.1.0 release shipped a bug in `alignmentCentres()` — every QR at version ≥ 2 placed alignment patterns at the wrong coordinates, so scanners rejected the output as "invalid". Fixed in v0.1.1 (commit `e4af92f`) with regression tests pinning the Annex E positions. **Pin to ≥ 0.1.1 in production.**
