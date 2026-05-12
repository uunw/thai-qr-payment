---
title: Brand assets
description: Thai QR Payment + PromptPay SVG marks in color + silhouette flavors.
---

`@thai-qr-payment/assets` ships true vector SVGs for the canonical Thai QR Payment and PromptPay marks. Traced via [vtracer](https://github.com/visioncortex/vtracer) (color) and [potrace](http://potrace.sourceforge.net/) (silhouette), then SVGO-optimized.

## Available marks

| Name                      | Color | Silhouette |
| ------------------------- | ----- | ---------- |
| `Thai_QR_Payment_Logo-01` | ✓     | ✓          |
| `PromptPay1`              | ✓     | ✓          |

Only the canonical layouts ship to keep the bundle small (~5 KB brotli). Alternative orientations (`-02` through `-06`, `PromptPay2`) were dropped in commit `bdadef3`. Need a different layout? Re-trace via `scripts/build-assets.sh` and drop the result into `packages/assets/src/svg/`.

## Usage

```ts
import { colorLogo, silhouetteLogo, COLOR_LOGOS, SILHOUETTE_LOGOS } from 'thai-qr-payment/assets';

// As a string (e.g. innerHTML, HTTP response)
const svg = colorLogo('Thai_QR_Payment_Logo-01');

// In React
<div dangerouslySetInnerHTML={{ __html: svg }} />

// In a Cloudflare Worker
return new Response(svg, {
  headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
});
```

## Why assets are opt-in from the umbrella

`import { ... } from 'thai-qr-payment'` (the default umbrella entry) does **not** include the brand SVGs — that keeps the surface lean (~3 KB for payload-only callers). The renderer helpers (`renderThaiQrPayment`, `renderCard`) still reach for the assets internally; they're only excluded from the top-level re-export.

To get the asset map at the top level:

```ts
import { COLOR_LOGOS, colorLogo } from 'thai-qr-payment/assets';
```

## Brand compliance

The marks belong to their respective rights-holders:

- **Thai QR Payment** logo — Bank of Thailand / Thai Bankers' Association
- **PromptPay** logo — Bank of Thailand / National ITMX

This package redistributes the raster → vector conversion of publicly distributed artwork. **Downstream apps must comply with the official Thai QR Payment Brand Guidelines.** If a rights-holder requests removal, open a [GitHub issue](https://github.com/uunw/thai-qr-payment/issues) and the mark will be pulled from the next published version within 7 days.
