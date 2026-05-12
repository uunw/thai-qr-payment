# @thai-qr-payment/assets

SVG brand marks for the Thai QR Payment / PromptPay ecosystem. Every mark is published in **two flavors**:

1. **Color** — true vector SVG traced via [vtracer](https://github.com/visioncortex/vtracer). No embedded raster — scales infinitely.
2. **Silhouette** — monochrome path traced via [potrace](http://potrace.sourceforge.net/). Even smaller, perfect for icons / masks / dark mode.

```bash
pnpm add @thai-qr-payment/assets
```

## Usage

```ts
import { colorLogo, silhouetteLogo, COLOR_LOGOS } from '@thai-qr-payment/assets';

// In a React component
<div dangerouslySetInnerHTML={{ __html: colorLogo('Thai_QR_Payment_Logo-01') }} />

// In a Cloudflare Worker (raw SVG response)
return new Response(silhouetteLogo('PromptPay1'), {
  headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
});
```

## Marks

| Name                      | Color | Silhouette |
| ------------------------- | ----- | ---------- |
| `Thai_QR_Payment_Logo-01` | ✓     | ✓          |
| `PromptPay1`              | ✓     | ✓          |

Only the canonical marks ship by default. Alternative layouts (`Thai_QR_Payment_Logo-02..06`, `PromptPay2`, etc.) were removed in v0.2 to keep the bundle small. If you need a specific variant, re-trace it via the supplied `scripts/build-assets.sh`.

## Brand compliance

These marks belong to their respective rights-holders:

- **Thai QR Payment** logo — Bank of Thailand / Thai Bankers' Association
- **PromptPay** logo — Bank of Thailand / National ITMX

This package merely redistributes the raster → vector conversion of publicly-distributed artwork. Downstream apps must comply with the official **Thai QR Payment Brand Guidelines** when displaying these marks.

## License

MIT (for the converter scripts + module wiring). Underlying artwork remains the property of the respective rights-holders.
