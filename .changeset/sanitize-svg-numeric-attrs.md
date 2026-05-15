---
'@thai-qr-payment/render': patch
'thai-qr-payment': patch
---

Sanitize numeric SVG attributes (`width`, `height`, `viewBox`, `transform`) at the renderer boundary. `renderQrSvg()` now coerces `options.size`, `options.quietZone`, and `matrix.size` through a finite-non-negative-integer guard before interpolation. Closes 7 CodeQL `js/html-constructed-from-input` alerts; also hardens the JS-callable surface against NaN/Infinity/non-numeric input.
