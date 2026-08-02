---
title: SVG renderer
description: ประกอบ Thai QR Payment SVG card หรือ matrix อย่างเดียวจาก wire payload
---

![ตัวอย่าง card ที่ใช้ layout ตาม brand-spec](/img/samples/qr-card-hero.svg)

`@thai-qr-payment/render` ผูก payload builder, QR encoder และ brand assets เข้าด้วยกันเป็น SVG string เดียว ไม่ต้องใช้ DOM และไม่ต้องใช้ canvas — ทำงานได้บนทุก runtime

## Card แบบ one-shot

```ts
import { renderThaiQRPayment } from 'thai-qr-payment';

const svg = renderThaiQRPayment({
  recipient: '0812345678',
  amount: 50,
  showCaption: true,
  merchantName: 'Acme Coffee',
  amountLabel: '฿ 50.00',
  errorCorrectionLevel: 'H',
});
```

คืน SVG card เต็มรูปแบบ ประกอบด้วย header band ของ Thai QR Payment + sub-mark ของ PromptPay + QR ที่มีกรอบ + label ยอดเงิน

## Matrix อย่างเดียว

เมื่อต้องการห่อ QR ด้วย design system ของตนเอง:

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
| `showCaption`   | `false`                   | เปิดบล็อกข้อความใต้ QR (ต้องสั่งเอง)                       |
| `merchantName`  | —                         | ข้อความบรรทัดแรก — ต้องเปิด `showCaption`                  |
| `amountLabel`   | —                         | ข้อความบรรทัดที่สอง — ต้องเปิด `showCaption`               |
| `background`    | `#fff`                    | พื้นหลังของ card                                           |
| `accent`        | `#0a2540`                 | สีของข้อความ + สี fill ของ silhouette                      |
| `headerLogo`    | `Thai_QR_Payment_Logo-01` | override ผ่านชื่อใน registry ของ `@thai-qr-payment/assets` |
| `promptpayLogo` | `PromptPay1`              | override                                                   |

## Building block ระดับล่าง

```ts
import { encodeQR } from 'thai-qr-payment';
import { renderCard, renderQRSvg, matrixToPath } from 'thai-qr-payment';

const matrix = encodeQR(wireString, { errorCorrectionLevel: 'H' });
const svg = renderCard(matrix, { showCaption: true, merchantName: 'Acme', amountLabel: '฿ 50' });

// หรือลงลึกอีกระดับ:
const justTheQr = renderQRSvg(matrix, { size: 512, quietZone: 4 });
const pathData = matrixToPath(matrix);
```

## ปลอดภัยจาก XSS โดยการออกแบบ

ทุก string ที่ถูก interpolate จะผ่าน `escapeXmlAttribute` ก่อนเขียนลง SVG markup ดังนั้นค่าอย่าง `<script>alert(1)</script>` ใน `merchantName` จะถูกแปลงเป็นรูป escape ที่ปลอดภัย พฤติกรรมนี้ได้รับการตรวจสอบด้วย test fixture เฉพาะในแพ็กเกจ render

## Response ของ server

```ts
return new Response(svg, {
  headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
});
```

ใช้งานได้โดยตรงจาก Cloudflare Workers, Vercel Edge, Bun, Deno และ Node โดยไม่ต้องมี glue สำหรับ runtime แต่ละตัว
