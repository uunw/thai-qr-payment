# thai-qr-payment

[![npm](https://img.shields.io/npm/v/thai-qr-payment)](https://www.npmjs.com/package/thai-qr-payment)
[![bundle size](https://img.shields.io/bundlephobia/minzip/thai-qr-payment)](https://bundlephobia.com/package/thai-qr-payment)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

One-stop umbrella for the Thai QR Payment (EMVCo MPM) ecosystem. Zero runtime dependencies, browser + Node + edge-runtime compatible.

```bash
pnpm add thai-qr-payment
# or
npm install thai-qr-payment
# or
bun add thai-qr-payment
```

## What you get

A single install pulls **payload builder + QR encoder + SVG renderer + brand assets + CLI** — everything except the React component bindings (those live in `@thai-qr-payment/react`).

```ts
import {
  renderThaiQrPayment,
  ThaiQrPaymentBuilder,
  encodeQR,
  parsePayload,
  COLOR_LOGOS,
} from 'thai-qr-payment';

// One-shot: pay-to-this-PromptPay SVG card
const svg = renderThaiQrPayment({
  recipient: '0812345678',
  amount: 50,
  merchantName: 'Acme Coffee',
  amountLabel: '฿ 50.00',
  errorCorrectionLevel: 'H',
});

// Granular: build wire payload, encode QR, render manually
const wire = new ThaiQrPaymentBuilder()
  .promptpay('0812345678')
  .amount(50)
  .merchant({ name: 'Acme Coffee', city: 'BANGKOK', categoryCode: '5814' })
  .build();

const matrix = encodeQR(wire, { errorCorrectionLevel: 'H' });

// Parse a captured QR string back into typed fields
const parsed = parsePayload(wire);
```

## CLI

The package ships a `thai-qr-payment` (and `tqp` alias) binary:

```bash
# One-off generation via npx — no install needed
npx thai-qr-payment 0812345678 --amount 50 -o qr.svg

# Or install globally
pnpm add -g thai-qr-payment
thai-qr-payment 0812345678 --amount 50 --merchant "Acme Coffee" -o qr.svg
tqp 0812345678 --format payload
```

## Narrow sub-path imports

Tree-shaking handles dead-code elimination automatically, but if you want even tighter bundles you can reach for the sub-paths:

```ts
import { ThaiQrPaymentBuilder } from 'thai-qr-payment/payload';
import { encodeQR } from 'thai-qr-payment/qr';
import { renderCard } from 'thai-qr-payment/render';
import { COLOR_LOGOS } from 'thai-qr-payment/assets';
```

## Alternative: install only what you need

If you only need one slice, the scoped packages let you skip the rest:

| Want only                              | Install                    |
| -------------------------------------- | -------------------------- |
| Wire payload builder + parser          | `@thai-qr-payment/payload` |
| QR Code encoder                        | `@thai-qr-payment/qr`      |
| SVG renderer                           | `@thai-qr-payment/render`  |
| Thai QR Payment + PromptPay SVG assets | `@thai-qr-payment/assets`  |
| CLI only                               | `@thai-qr-payment/cli`     |
| React component                        | `@thai-qr-payment/react`   |

The umbrella package depends on the first five and re-exports them; functionally there is no difference.

## License

MIT
