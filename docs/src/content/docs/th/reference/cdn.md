---
title: การใช้งานผ่าน CDN
description: โหลด thai-qr-payment ตรงจาก unpkg หรือ JSDelivr ได้ทันที โดยไม่ต้องใช้ bundler
---

ทุกไฟล์ `dist/*.js` ที่เผยแพร่จะมาพร้อมไฟล์คู่ `.br` + `.gz` ที่ pre-compressed ไว้ CDN ที่เคารพ `Accept-Encoding` (unpkg, JSDelivr) จะ serve ไฟล์ที่เล็กกว่าโดยอัตโนมัติ — ไม่มีการบีบอัดตอน runtime และไม่มี round-trip เพิ่ม

## unpkg

```html
<script type="module">
  import { renderThaiQRPayment } from 'https://unpkg.com/thai-qr-payment/dist/index.js';
  document.body.innerHTML = renderThaiQRPayment({
    recipient: '0812345678',
    amount: 50,
    merchantName: 'Acme Coffee',
    amountLabel: '฿ 50.00',
  });
</script>
```

ปักหมุดเวอร์ชัน:

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

## Sub-path ผ่าน CDN

sub-path export ของ umbrella (`payload`, `qr`, `render`, `assets`) ก็สามารถใช้งานได้เช่นกัน:

```html
<script type="module">
  import { encodeQR } from 'https://unpkg.com/thai-qr-payment/dist/qr.js';
  import { COLOR_LOGOS } from 'https://unpkg.com/thai-qr-payment/dist/assets.js';
</script>
```

## path ของไฟล์ pre-compressed

หาก self-host ให้ serve variant ต่าง ๆ โดยตรง พร้อมตั้ง header `Content-Encoding` ให้ถูกต้อง:

| ไฟล์               | Content-Encoding |
| ------------------ | ---------------- |
| `dist/index.js`    | identity         |
| `dist/index.js.br` | `br`             |
| `dist/index.js.gz` | `gzip`           |

ตัวอย่าง config nginx ทั่วไป:

```nginx
location ~ \.js$ {
  gzip_static on;
  brotli_static on;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Cloudflare Workers / Pages จัดการให้อัตโนมัติเมื่อมีไฟล์อยู่

## React ผ่าน CDN

adapter ของ React อาศัย React ที่เป็น peer dependency สำหรับใช้งานผ่าน CDN ให้ mount ผ่าน ESM:

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
  import { renderThaiQRPayment } from 'thai-qr-payment';
  // …
</script>
```
