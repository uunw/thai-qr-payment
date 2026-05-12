# @thai-qr-payment/render

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

- Updated dependencies [[`e4af92f`](https://github.com/uunw/thai-qr-payment/commit/e4af92fcacd002ba119209fc92284c7ce31fc956)]:
  - @thai-qr-payment/qr@0.1.1
  - @thai-qr-payment/payload@0.1.1
  - @thai-qr-payment/assets@0.1.1
