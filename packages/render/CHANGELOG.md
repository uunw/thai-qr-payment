# @thai-qr-payment/render

## 3.0.0

### Patch Changes

- Updated dependencies [[`7a2226f`](https://github.com/uunw/thai-qr-payment/commit/7a2226fa9c29a3490249b933a67f043f83b52e7b)]:
  - @thai-qr-payment/payload@3.0.0

## 2.0.0

### Patch Changes

- Updated dependencies [[`6107d73`](https://github.com/uunw/thai-qr-payment/commit/6107d73603d1895bb39e6ac1f78c544aca406ee2)]:
  - @thai-qr-payment/qr@2.0.0
  - @thai-qr-payment/assets@2.0.0

## 1.0.0

### Patch Changes

- Updated dependencies [[`7ae8f9d`](https://github.com/uunw/thai-qr-payment/commit/7ae8f9d32bbcaf6cddffa825c885766887487e4f), [`5a5a62e`](https://github.com/uunw/thai-qr-payment/commit/5a5a62eb40c20dfb5c92c4a198bcbef0f7de0238)]:
  - @thai-qr-payment/payload@1.0.0

## 0.1.4

### Patch Changes

- [`655b343`](https://github.com/uunw/thai-qr-payment/commit/655b343bce1e790acc1fca9574b5d002c14b550a) Thanks [@uunw](https://github.com/uunw)! - Sanitize numeric SVG attributes (`width`, `height`, `viewBox`, `transform`) at the renderer boundary. `renderQrSvg()` now coerces `options.size`, `options.quietZone`, and `matrix.size` through a finite-non-negative-integer guard before interpolation. Closes 7 CodeQL `js/html-constructed-from-input` alerts; also hardens the JS-callable surface against NaN/Infinity/non-numeric input.

## 0.1.3

### Patch Changes

- [`ba9e8e8`](https://github.com/uunw/thai-qr-payment/commit/ba9e8e8022d864475710e631d4fb104a951b6f51) Thanks [@uunw](https://github.com/uunw)! - Point every package `homepage` at the new docs site `https://thai-qr-payment.js.org`. Ship sourcemaps with every published bundle and keep original function + class names through minification — published code is now traceable to source and no longer trips supply-chain scanners that flag aggressive mangling.

- Updated dependencies [[`ba9e8e8`](https://github.com/uunw/thai-qr-payment/commit/ba9e8e8022d864475710e631d4fb104a951b6f51)]:
  - @thai-qr-payment/assets@0.1.3
  - @thai-qr-payment/payload@0.1.3
  - @thai-qr-payment/qr@0.1.3

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

- Updated dependencies [[`f3e30b9`](https://github.com/uunw/thai-qr-payment/commit/f3e30b9b038db7b6d0b713a5104bd62f075aa9f0)]:
  - @thai-qr-payment/payload@0.1.2
  - @thai-qr-payment/qr@0.1.2
  - @thai-qr-payment/assets@0.1.2

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
