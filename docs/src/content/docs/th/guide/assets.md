---
title: Brand assets
description: โลโก้ Thai QR Payment และ PromptPay ในรูปแบบ SVG ทั้งแบบสีและแบบ silhouette
---

![Thai QR Payment color logo](/img/brand/logo-color.svg)

`@thai-qr-payment/assets` มาพร้อมไฟล์ SVG แบบเวกเตอร์จริงสำหรับโลโก้ Thai QR Payment และ PromptPay เวอร์ชันมาตรฐาน โดย trace ผ่าน [vtracer](https://github.com/visioncortex/vtracer) (สำหรับแบบสี) และ [potrace](http://potrace.sourceforge.net/) (สำหรับแบบ silhouette) แล้วปรับให้กระชับด้วย SVGO

![PromptPay color logo](/img/brand/promptpay1.svg)

## โลโก้ที่มีให้ใช้งาน

| Name                      | Color | Silhouette |
| ------------------------- | ----- | ---------- |
| `Thai_QR_Payment_Logo-01` | ✓     | ✓          |
| `PromptPay1`              | ✓     | ✓          |

แพ็กเกจนี้รวมเฉพาะเลย์เอาต์มาตรฐานเท่านั้นเพื่อให้ bundle เล็ก (~5 KB brotli) ส่วนเลย์เอาต์ทางเลือกอื่น ๆ (`-02` ถึง `-06` และ `PromptPay2`) ถูกถอดออกไปใน commit `bdadef3` หากต้องการเลย์เอาต์อื่น สามารถ re-trace ผ่าน `scripts/build-assets.sh` แล้ววางผลลัพธ์ลงใน `packages/assets/src/svg/`

## วิธีใช้งาน

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

## ทำไม assets ถึงเป็น opt-in จาก umbrella

`import { ... } from 'thai-qr-payment'` (entry หลักของ umbrella) **ไม่ได้** รวมไฟล์ SVG ของแบรนด์ไว้ด้วย เพื่อให้ surface เบา (~3 KB สำหรับผู้ที่ใช้งานเฉพาะส่วน payload) ส่วนเฮลเปอร์ของ renderer (`renderThaiQRPayment`, `renderCard`) ยังคงเรียก assets ภายในตามปกติ เพียงแต่ไม่ได้ re-export ออกมาที่ระดับบนสุดเท่านั้น

หากต้องการดึง asset map จากระดับบนสุด:

```ts
import { COLOR_LOGOS, colorLogo } from 'thai-qr-payment/assets';
```

## การปฏิบัติตามแนวทางแบรนด์

โลโก้เหล่านี้เป็นของเจ้าของสิทธิ์ที่เกี่ยวข้อง:

- โลโก้ **Thai QR Payment** — Bank of Thailand / Thai Bankers' Association
- โลโก้ **PromptPay** — Bank of Thailand / National ITMX

แพ็กเกจนี้เผยแพร่เพียงผลการแปลงจาก raster เป็นเวกเตอร์ของงานออกแบบที่ถูกเผยแพร่สู่สาธารณะ **แอปที่นำไปใช้งานต่อต้องปฏิบัติตาม Thai QR Payment Brand Guidelines อย่างเป็นทางการ** หากเจ้าของสิทธิ์ขอให้ถอดโลโก้ออก กรุณาเปิด [GitHub issue](https://github.com/uunw/thai-qr-payment/issues) แล้วโลโก้ดังกล่าวจะถูกถอดออกในเวอร์ชันที่เผยแพร่ครั้งถัดไปภายใน 7 วัน
