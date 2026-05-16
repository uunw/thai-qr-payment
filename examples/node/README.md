# `examples/node/`

Short, runnable scripts covering every public function in the umbrella
`thai-qr-payment` package + the scoped `@thai-qr-payment/*` siblings.
Each file demonstrates **one feature only** — open it, copy the
relevant block, paste into your app.

## Run

```bash
# Build the workspace once.
pnpm install
pnpm build

# Run any example directly (Node ≥ 18, native ESM).
node examples/node/01-payload-shortcut.mjs
node examples/node/04-builder-truemoney.mjs
# …
```

Examples resolve `thai-qr-payment` (umbrella) and `@thai-qr-payment/react`
(for the React example) via the pnpm workspace symlink.

## Index

| File                                     | Covers                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `01-payload-shortcut.mjs`                | `payloadFor()` — one-shot PromptPay payload                                                 |
| `02-builder-promptpay.mjs`               | `.promptpay()` — mobile / nationalId / eWallet                                              |
| `03-builder-billpayment.mjs`             | `.billPayment()` — domestic + `crossBorder`                                                 |
| `04-builder-truemoney.mjs`               | `.trueMoney()` — message via tag 81 UTF-16BE                                                |
| `05-builder-bankaccount-ota.mjs`         | `.bankAccount()` + `.ota()`                                                                 |
| `06-builder-merchant-tip-additional.mjs` | `.merchant()` + `.additionalData()` + `.tipPolicy()`                                        |
| `07-builder-vat-tqrc.mjs`                | `.vatTqrc()` — VAT TQRC e-tax block (tag 80)                                                |
| `08-parse-strict-and-rawtags.mjs`        | `parsePayload({ strict })`, truncated-CRC, `getTag` / `getTagValue` / `rawTags`, `checksum` |
| `09-tlv-low-level.mjs`                   | `encodeField` / `encodeFields` / `parseFields` / `iterateFields` / `Tags`                   |
| `10-slip-verify.mjs`                     | `buildSlipVerify` / `parseSlipVerify` (+ TrueMoney variant)                                 |
| `11-bot-barcode.mjs`                     | `buildBOTBarcode` / `parseBOTBarcode`                                                       |
| `12-qr-encoder.mjs`                      | `encodeQR()` + ASCII preview                                                                |
| `13-render-card.mjs`                     | `renderThaiQRPayment`, `renderThaiQRPaymentMatrix`, `renderCard`, `renderQRSvg`             |
| `14-assets-logos.mjs`                    | `COLOR_LOGOS` / `SILHOUETTE_LOGOS` / `colorLogo()` / `silhouetteLogo()`                     |
| `15-react-ssr.mjs`                       | `<ThaiQRPayment />` + `<ThaiQRPaymentMatrix />` via SSR                                     |

For an interactive in-browser variant, see the docs site demo:
<https://thai-qr-payment.js.org/demo/>.

For CLI usage:

```bash
# After `pnpm build`:
node packages/thai-qr-payment/dist/cli.js 0812345678 --amount 50 -o /tmp/qr.svg
# Or via npx (after publish):
npx thai-qr-payment 0812345678 --amount 50 -o /tmp/qr.svg
```
