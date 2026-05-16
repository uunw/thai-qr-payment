---
title: SVG renderer
description: Compose a Thai QR Payment SVG card or bare matrix from a wire payload.
---

![Sample card with brand-spec layout](/img/samples/qr-card-hero.svg)

`@thai-qr-payment/render` ties together the payload builder, QR encoder, and brand assets into a single SVG string. No DOM, no canvas — works in every runtime.

## One-shot card

```ts
import { renderThaiQRPayment } from 'thai-qr-payment';

const svg = renderThaiQRPayment({
  recipient: '0812345678',
  amount: 50,
  merchantName: 'Acme Coffee',
  amountLabel: '฿ 50.00',
  errorCorrectionLevel: 'H',
});
```

Returns a full SVG card: Thai QR Payment header band + PromptPay sub-mark + bordered QR + amount label.

## Bare matrix

When you want to wrap the QR in your own design system:

```ts
import { renderThaiQRPaymentMatrix } from 'thai-qr-payment';

const svg = renderThaiQRPaymentMatrix({
  recipient: '0812345678',
  amount: 50,
  size: 320,
  quietZone: 4,
});
```

## Card options

| Option          | Default                   | Notes                                                  |
| --------------- | ------------------------- | ------------------------------------------------------ |
| `theme`         | `color`                   | `'silhouette'` swaps brand artwork to monochrome paths |
| `merchantName`  | —                         | rendered above the QR                                  |
| `amountLabel`   | —                         | rendered below the QR                                  |
| `background`    | `#fff`                    | card backdrop                                          |
| `accent`        | `#0a2540`                 | text + silhouette fill colour                          |
| `headerLogo`    | `Thai_QR_Payment_Logo-01` | override via `@thai-qr-payment/assets` registry name   |
| `promptpayLogo` | `PromptPay1`              | override                                               |

## Low-level building blocks

```ts
import { encodeQR } from 'thai-qr-payment';
import { renderCard, renderQRSvg, matrixToPath } from 'thai-qr-payment';

const matrix = encodeQR(wireString, { errorCorrectionLevel: 'H' });
const svg = renderCard(matrix, { merchantName: 'Acme', amountLabel: '฿ 50' });

// Or even lower:
const justTheQr = renderQRSvg(matrix, { size: 512, quietZone: 4 });
const pathData = matrixToPath(matrix);
```

## XSS-safe by construction

Every interpolated string runs through `escapeXmlAttribute` before landing in the SVG markup, so values like `<script>alert(1)</script>` in `merchantName` come out as the harmless escaped form. Verified by a dedicated test fixture in the render package.

## Server response

```ts
return new Response(svg, {
  headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
});
```

Works directly from Cloudflare Workers, Vercel Edge, Bun, Deno, Node — no runtime-specific glue needed.
