---
title: HTTP API
description: สร้าง QR พร้อมเพย์ผ่าน URL ธรรมดา — ไม่ต้องติดตั้ง ใช้ได้ทุกภาษา ทุก stack
---

![ตัวอย่างการ์ด QR](/img/samples/qr-card-hero.svg)

Endpoint แบบ hosted ที่แปลงผู้รับพร้อมเพย์ + ยอดเงิน ให้เป็นรูป QR ผ่าน HTTP
ธรรมดา เหมาะกับผู้เรียกที่ `npm install` ไลบรารีไม่ได้ — PHP, Python, เครื่องมือ
no-code (n8n, Zapier), LINE bot, Google Sheets หรือแค่แท็ก `<img>` ในอีเมล
หรือหน้าเว็บ

> [!NOTE]
> ใช้ JS/TS อยู่แล้ว? ข้ามการเรียกผ่านเครือข่ายไปเลย — `npm i thai-qr-payment`
> แล้วเรียก [`renderThaiQRPayment`](/th/guide/render/) ในเครื่องได้ทันที HTTP API
> มีไว้สำหรับทุกอย่างที่ _ไม่ใช่_ JavaScript

## รูปแบบ URL

```
GET https://thai-qr-payment.js.org/api/promptpay/<recipient>[/<amount>].<ext>
```

```
# เบอร์มือถือ ไม่ระบุยอด (ผู้จ่ายกรอกเอง), SVG
/api/promptpay/0812345678.svg

# เบอร์มือถือ ฿100, PNG
/api/promptpay/0812345678/100.png

# เลขบัตรประชาชน ฿49.50, WebP
/api/promptpay/1234567890123/49.50.webp
```

## พารามิเตอร์

| ส่วน        | จำเป็น | หมายเหตุ                                                                     |
| ----------- | ------ | ---------------------------------------------------------------------------- |
| `recipient` | ใช่    | เบอร์มือถือ, เลขบัตร 13 หลัก หรือ e-Wallet 15 หลัก — ตรวจจับชนิดจากจำนวนหลัก |
| `amount`    | ไม่    | หน่วยบาท ใส่ทศนิยมได้ (`49.50`) ละไว้เพื่อทำ QR แบบ static ให้ผู้จ่ายกรอกเอง |
| `ext`       | ไม่    | `svg` (default), `png`, `webp`, `jpg` — กำหนดรูปแบบของ response              |

## รูปแบบไฟล์

| นามสกุล        | Content-Type    | หมายเหตุ                                                   |
| -------------- | --------------- | ---------------------------------------------------------- |
| `.svg`         | `image/svg+xml` | output ดั้งเดิม เล็กที่สุด ย่อขยายได้ไม่จำกัด เหมาะกับเว็บ |
| `.png`         | `image/png`     | raster แบบ lossless เหมาะกับ `<img>` ในอีเมลและงานพิมพ์    |
| `.webp`        | `image/webp`    | raster คุณภาพ lossless ขนาดเล็กกว่า PNG                    |
| `.jpg` `.jpeg` | `image/jpeg`    | lossy มีให้ตามคำขอ — แนะนำ PNG/WebP สำหรับ QR มากกว่า      |

> [!WARNING]
> JPEG เป็น lossy: การบีบอัดอาจทำให้ขอบของโมดูล QR เบลอและสแกนยากขึ้น API
> เข้ารหัสที่คุณภาพสูงพร้อม chroma 4:4:4 เพื่อลดปัญหานี้ แต่ **PNG หรือ WebP
> สแกนได้น่าเชื่อถือกว่า**

## ตัวอย่าง

```html
<!-- ฝังตรง ๆ ไม่ต้องใช้ JavaScript -->
<img src="https://thai-qr-payment.js.org/api/promptpay/0812345678/100.png" alt="จ่าย ฿100" />
```

```js
// fetch ข้าม origin (เปิด CORS ไว้)
const res = await fetch('https://thai-qr-payment.js.org/api/promptpay/0812345678/100.svg');
const svg = await res.text();
```

```php
// PHP — ใส่ URL ลงใน <img> ตรง ๆ หรือดึง bytes มาก็ได้
$png = file_get_contents('https://thai-qr-payment.js.org/api/promptpay/0812345678/100.png');
```

## พฤติกรรม

- **รับเฉพาะ GET** input อยู่ใน URL ไม่มีการเก็บหรือแก้ไขข้อมูล
- **เปิด CORS** (`Access-Control-Allow-Origin: *`) — เรียกจาก origin ไหนก็ได้
- **แคชหนัก** output เป็นฟังก์ชันล้วนของ URL จึงแนบ
  `Cache-Control: public, max-age=31536000, immutable` และเสิร์ฟจาก CDN edge
- **ข้อผิดพลาด** ตอบกลับเป็น JSON พร้อม `400` (recipient/amount ผิดรูปแบบ หรือ
  format ที่ไม่รองรับ) หรือ `404` (path ผิด)

> [!NOTE]
> **ความเป็นส่วนตัว** — recipient (เบอร์ / เลขบัตร) และ amount เป็น PII ของการ
> ชำระเงิน **จะไม่ถูก log** ข้อความ error อ้างถึงจำนวนหลัก ("got 13 digits")
> ไม่ใช่ค่าจริง
