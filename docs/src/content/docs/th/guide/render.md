---
title: SVG renderer
description: ประกอบ Thai QR Payment SVG card หรือ matrix แบบเปลือยจาก wire payload
---

![ตัวอย่าง card ที่ใช้ layout ตาม brand-spec](/img/samples/qr-card-hero.svg)

`@thai-qr-payment/render` ผูก payload builder, QR encoder และ brand assets เข้าไว้ใน SVG string เดียว ไม่มี DOM ไม่มี canvas — ทำงานได้ทุก runtime

## Card แบบ one-shot

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

คืน SVG card เต็ม: header band ของ Thai QR Payment + sub-mark ของ PromptPay + QR ที่มีกรอบ + label ยอดเงิน

## Matrix แบบเปลือย

เมื่อคุณอยากห่อ QR ด้วย design system ของคุณเอง:

```ts
import { renderThaiQRPaymentMatrix } from 'thai-qr-payment';

const svg = renderThaiQRPaymentMatrix({
  recipient: '0812345678',
  amount: 50,
  size: 320,
  quietZone: 4,
});
```

## Option ของ card

| Option          | Default                   | หมายเหตุ                                                   |
| --------------- | ------------------------- | ---------------------------------------------------------- |
| `theme`         | `color`                   | `'silhouette'` เปลี่ยน brand artwork เป็น path ขาวดำ       |
| `merchantName`  | —                         | render อยู่เหนือ QR                                        |
| `amountLabel`   | —                         | render อยู่ใต้ QR                                          |
| `background`    | `#fff`                    | พื้นหลังของ card                                           |
| `accent`        | `#0a2540`                 | สีของข้อความ + สี fill ของ silhouette                      |
| `headerLogo`    | `Thai_QR_Payment_Logo-01` | override ผ่านชื่อใน registry ของ `@thai-qr-payment/assets` |
| `promptpayLogo` | `PromptPay1`              | override                                                   |

## Building block ระดับล่าง

```ts
import { encodeQR } from 'thai-qr-payment';
import { renderCard, renderQRSvg, matrixToPath } from 'thai-qr-payment';

const matrix = encodeQR(wireString, { errorCorrectionLevel: 'H' });
const svg = renderCard(matrix, { merchantName: 'Acme', amountLabel: '฿ 50' });

// หรือต่ำลงไปอีก:
const justTheQr = renderQRSvg(matrix, { size: 512, quietZone: 4 });
const pathData = matrixToPath(matrix);
```

## ปลอดภัยจาก XSS โดยโครงสร้าง

ทุก string ที่ถูก interpolate จะผ่าน `escapeXmlAttribute` ก่อนลงไปอยู่ใน SVG markup ค่าอย่าง `<script>alert(1)</script>` ใน `merchantName` จึงออกมาเป็นรูป escape ที่ไม่เป็นอันตราย ตรวจสอบไว้แล้วด้วย test fixture เฉพาะในแพ็กเกจ render

## Response ของ server

```ts
return new Response(svg, {
  headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
});
```

ใช้ได้โดยตรงจาก Cloudflare Workers, Vercel Edge, Bun, Deno, Node — ไม่ต้องมี glue เฉพาะ runtime
