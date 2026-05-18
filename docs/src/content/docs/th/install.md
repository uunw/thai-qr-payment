---
title: ติดตั้ง
description: เพิ่ม thai-qr-payment เข้าโปรเจกต์ของคุณ — ติดตั้งแบบ umbrella ครั้งเดียว หรือเลือกเฉพาะ sub-package
---

## แพ็กเกจเดียว ครบทุกอย่าง

แพ็กเกจ `thai-qr-payment` แบบ umbrella มี **payload builder, QR encoder, SVG renderer, brand assets และ CLI** รวมไว้ใน dependency เดียว

```bash
pnpm add thai-qr-payment
# หรือ
npm install thai-qr-payment
# หรือ
bun add thai-qr-payment
```

แค่นี้แหละ — ไม่มี peer dependency ไม่มีแพ็กเกจที่ถูกดึงมาแบบ transitive ไม่มี install script `npm install thai-qr-payment` ดึงมาเพียง tarball เดียวจริง ๆ

## Sub-package แบบ scoped (dep graph แน่นกว่า)

สำหรับผู้ใช้ที่อยากได้แค่ส่วนใดส่วนหนึ่ง (เช่นใช้แค่ payload บน edge runtime):

| ต้องการ                               | ติดตั้ง                    |
| ------------------------------------- | -------------------------- |
| Wire payload builder + parser         | `@thai-qr-payment/payload` |
| QR Code encoder                       | `@thai-qr-payment/qr`      |
| SVG renderer                          | `@thai-qr-payment/render`  |
| Thai QR Payment + PromptPay SVGs      | `@thai-qr-payment/assets`  |
| เฉพาะ CLI                             | `@thai-qr-payment/cli`     |
| React component (React เป็น peer-dep) | `@thai-qr-payment/react`   |

หรือจะ import จาก sub-path ของ umbrella ก็ได้ — byte เท่ากัน tree-shake ได้เหมือนกัน:

```ts
import { ThaiQRPaymentBuilder } from 'thai-qr-payment/payload';
import { encodeQR } from 'thai-qr-payment/qr';
import { renderCard } from 'thai-qr-payment/render';
import { COLOR_LOGOS } from 'thai-qr-payment/assets';
```

## CDN (ข้าม bundler ไปเลย)

ไฟล์ `dist/*.js` ทุกตัวที่ publish จะมีไฟล์ `.br` + `.gz` ที่บีบอัดล่วงหน้าแนบมาด้วย CDN จึงเสิร์ฟตัวที่เล็กที่สุดให้ผ่าน `Accept-Encoding`:

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

ขั้นต่อไป: [ลองในหน้า demo สด ๆ](/demo/) หรือดู [คู่มือ payload](/guide/payload/)
