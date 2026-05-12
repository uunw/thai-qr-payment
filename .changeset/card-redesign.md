---
'thai-qr-payment': patch
'@thai-qr-payment/render': patch
'@thai-qr-payment/payload': patch
'@thai-qr-payment/qr': patch
'@thai-qr-payment/assets': patch
'@thai-qr-payment/react': patch
'@thai-qr-payment/cli': patch
---

Redesign `renderCard()` to match the official Thai QR Payment brand guideline:

- **New canvas: 600 × 700** (was 1000 × 1280). Compact, near-square — matches the BOT/TBA reference layout.
- **Navy header band** with the Thai QR Payment logo reverse-knocked-out in white.
- **PromptPay sub-mark** inset to the left under the header band.
- **Centre-overlay Thai QR Payment icon** at the centre of the QR matrix (16 % of the QR's width, on a white pad with rounded corners). Active by default for `theme: 'color'`; opt out via `centerOverlay: false`.
- **Optional merchant name + amount label** stacked below the QR (sizes scaled to the new canvas).
- `renderThaiQrPayment()` one-shot helper now defaults `errorCorrectionLevel` to `'H'` (was `'M'`) because the centre overlay obscures ~3 % of the modules — H ECC recovers them cleanly.

No API removed; the `CardOptions` interface gains an optional `centerOverlay` boolean. Callers that don't override stay on the new defaults.
