---
title: CDN usage
description: Load thai-qr-payment straight from unpkg or JSDelivr — no bundler required.
---

Every published `dist/*.js` ships with pre-compressed `.br` + `.gz` siblings. CDNs that honour `Accept-Encoding` (unpkg, JSDelivr) serve the smaller variant automatically — no runtime compression, no extra round-trip.

## unpkg

```html
<script type="module">
  import { renderThaiQrPayment } from 'https://unpkg.com/thai-qr-payment/dist/index.js';
  document.body.innerHTML = renderThaiQrPayment({
    recipient: '0812345678',
    amount: 50,
    merchantName: 'Acme Coffee',
    amountLabel: '฿ 50.00',
  });
</script>
```

Pinned version:

```html
<script type="module">
  import { payloadFor } from 'https://unpkg.com/thai-qr-payment@0.1.1/dist/index.js';
</script>
```

## JSDelivr

```html
<script type="module">
  import { payloadFor } from 'https://cdn.jsdelivr.net/npm/thai-qr-payment/dist/index.js';
</script>
```

## Sub-paths over CDN

The umbrella's sub-path exports (`payload`, `qr`, `render`, `assets`) work too:

```html
<script type="module">
  import { encodeQR } from 'https://unpkg.com/thai-qr-payment/dist/qr.js';
  import { COLOR_LOGOS } from 'https://unpkg.com/thai-qr-payment/dist/assets.js';
</script>
```

## Pre-compressed file paths

If you self-host, serve the variants directly with the right `Content-Encoding` header:

| File | Content-Encoding |
|---|---|
| `dist/index.js` | identity |
| `dist/index.js.br` | `br` |
| `dist/index.js.gz` | `gzip` |

A typical nginx config:

```nginx
location ~ \.js$ {
  gzip_static on;
  brotli_static on;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Cloudflare Workers / Pages handle this automatically when the file is present.

## React from CDN

The React adapter relies on a peer-dep React; for CDN use, mount it through ESM:

```html
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19",
      "react-dom": "https://esm.sh/react-dom@19",
      "thai-qr-payment": "https://unpkg.com/thai-qr-payment/dist/index.js"
    }
  }
</script>

<script type="module">
  import { createRoot } from 'react-dom/client';
  import { createElement } from 'react';
  import { renderThaiQrPayment } from 'thai-qr-payment';
  // …
</script>
```
