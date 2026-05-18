---
title: ติดตั้ง
description: เพิ่ม thai-qr-payment เข้าโปรเจกต์ — ติดตั้งแบบ umbrella เพียงครั้งเดียว หรือเลือกใช้เฉพาะ sub-package ที่ต้องการ
---

## แพ็กเกจเดียว ครบทุกฟีเจอร์

แพ็กเกจ `thai-qr-payment` แบบ umbrella ประกอบด้วย **payload builder, QR encoder, SVG renderer, brand assets และ CLI** รวมไว้ใน dependency เดียว

```bash
pnpm add thai-qr-payment
# หรือ
npm install thai-qr-payment
# หรือ
bun add thai-qr-payment
```

เพียงเท่านี้ก็พร้อมใช้งาน — ไม่มี peer dependency ไม่มีแพ็กเกจที่ถูกดึงมาแบบ transitive ไม่มี install script คำสั่ง `npm install thai-qr-payment` ดึงมาเพียง tarball เดียวเท่านั้น

## Sub-package แบบ scoped (dep graph กระชับยิ่งขึ้น)

สำหรับผู้ใช้งานที่ต้องการเฉพาะบางส่วน (เช่น ใช้เพียง payload บน edge runtime):

| ต้องการ                               | ติดตั้ง                    |
| ------------------------------------- | -------------------------- |
| Wire payload builder + parser         | `@thai-qr-payment/payload` |
| QR Code encoder                       | `@thai-qr-payment/qr`      |
| SVG renderer                          | `@thai-qr-payment/render`  |
| Thai QR Payment + PromptPay SVGs      | `@thai-qr-payment/assets`  |
| เฉพาะ CLI                             | `@thai-qr-payment/cli`     |
| React component (React เป็น peer-dep) | `@thai-qr-payment/react`   |

หรือจะ import จาก sub-path ของ umbrella ก็ได้ — ขนาด byte เท่ากันและรองรับ tree-shake เช่นเดียวกัน:

```ts
import { ThaiQRPaymentBuilder } from 'thai-qr-payment/payload';
import { encodeQR } from 'thai-qr-payment/qr';
import { renderCard } from 'thai-qr-payment/render';
import { COLOR_LOGOS } from 'thai-qr-payment/assets';
```

## CDN (ใช้งานโดยไม่ผ่าน bundler)

ไฟล์ `dist/*.js` ทุกตัวที่ publish จะมีไฟล์ `.br` + `.gz` ที่บีบอัดล่วงหน้าแนบมาด้วย CDN จึงเสิร์ฟไฟล์ที่มีขนาดเล็กที่สุดให้ตาม `Accept-Encoding`:

```html
<script type="module">
  import { renderThaiQRPayment } from 'https://unpkg.com/thai-qr-payment/dist/index.js';
  document.body.innerHTML = renderThaiQRPayment({ recipient: '0812345678', amount: 50 });
</script>

<script type="module">
  import { payloadFor } from 'https://cdn.jsdelivr.net/npm/thai-qr-payment/dist/index.js';
</script>
```

## ข้อกำหนดของ engine

| Runtime       | ขั้นต่ำ                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| Node          | ≥ 18                                                                     |
| pnpm          | ≥ 8 (แนะนำ 10.x)                                                         |
| Browser       | browser ที่รองรับ module (Chrome 80+, Safari 14+, Firefox 78+, Edge 80+) |
| Edge runtimes | ทดสอบบน Cloudflare Workers, Vercel Edge                                  |

## ตรวจสอบว่าติดตั้งสำเร็จ

```ts
import { payloadFor, parsePayload } from 'thai-qr-payment';

const wire = payloadFor({ recipient: '0812345678', amount: 50 });
console.log(wire);
// 00020101021229370016A00000067701011101130066812345678530376454...

const parsed = parsePayload(wire);
console.log(parsed.amount); // 50
console.log(parsed.merchant); // { kind: 'promptpay', recipientType: 'mobile', recipient: '0812345678' }
```

ขั้นต่อไป: [ทดลองใช้งานในหน้า demo](/demo/) หรือดู [คู่มือ payload](/guide/payload/)
