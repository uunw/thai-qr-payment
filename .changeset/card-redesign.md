---
'thai-qr-payment': patch
'@thai-qr-payment/render': patch
'@thai-qr-payment/payload': patch
'@thai-qr-payment/qr': patch
'@thai-qr-payment/assets': patch
'@thai-qr-payment/react': patch
'@thai-qr-payment/cli': patch
---

Redesign `renderCard()` to match the official BOT/TBA "Thai QR Payment" brand guideline:

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
