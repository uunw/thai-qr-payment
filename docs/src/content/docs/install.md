---
title: Install
description: Add thai-qr-payment to your project — one umbrella install or scoped sub-packages.
---

## One package, everything included

The umbrella `thai-qr-payment` carries the **payload builder, QR encoder, SVG renderer, brand assets, and CLI** in a single dependency.

```bash
pnpm add thai-qr-payment
# or
npm install thai-qr-payment
# or
bun add thai-qr-payment
```

That's it — no peer dependencies, no transitive packages, no install scripts. `npm install thai-qr-payment` literally pulls one tarball.

## Scoped sub-packages (tighter dep graph)

For consumers who want only one slice (e.g. payload-only on edge runtimes):

| Need                             | Install                    |
| -------------------------------- | -------------------------- |
| Wire payload builder + parser    | `@thai-qr-payment/payload` |
| QR Code encoder                  | `@thai-qr-payment/qr`      |
| SVG renderer                     | `@thai-qr-payment/render`  |
| Thai QR Payment + PromptPay SVGs | `@thai-qr-payment/assets`  |
| CLI only                         | `@thai-qr-payment/cli`     |
| React component (peer-dep React) | `@thai-qr-payment/react`   |

Or import from the umbrella sub-paths — same bytes, same tree-shake:

```ts
import { ThaiQrPaymentBuilder } from 'thai-qr-payment/payload';
import { encodeQR } from 'thai-qr-payment/qr';
import { renderCard } from 'thai-qr-payment/render';
import { COLOR_LOGOS } from 'thai-qr-payment/assets';
```

## CDN (skip the bundler)

Every published `dist/*.js` ships pre-compressed `.br` + `.gz` siblings, so CDNs serve the smallest variant via `Accept-Encoding`:

```html
<script type="module">
  import { renderThaiQrPayment } from 'https://unpkg.com/thai-qr-payment/dist/index.js';
  document.body.innerHTML = renderThaiQrPayment({ recipient: '0812345678', amount: 50 });
</script>

<script type="module">
  import { payloadFor } from 'https://cdn.jsdelivr.net/npm/thai-qr-payment/dist/index.js';
</script>
```

## Engine requirements

| Runtime       | Minimum                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| Node          | ≥ 18                                                                          |
| pnpm          | ≥ 8 (10.x recommended)                                                        |
| Browser       | any module-supporting browser (Chrome 80+, Safari 14+, Firefox 78+, Edge 80+) |
| Edge runtimes | tested on Cloudflare Workers, Vercel Edge                                     |

## Verify the install

```ts
import { payloadFor, parsePayload } from 'thai-qr-payment';

const wire = payloadFor({ recipient: '0812345678', amount: 50 });
console.log(wire);
// 00020101021229370016A00000067701011101130066812345678530376454...

const parsed = parsePayload(wire);
console.log(parsed.amount); // 50
console.log(parsed.merchant); // { kind: 'promptpay', recipientType: 'mobile', recipient: '0812345678' }
```

Next: [try it in the live demo](/demo/) or jump into the [payload guide](/guide/payload/).
