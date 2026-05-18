---
title: ความครอบคลุมของสเปก
description: สถานะการ implement ราย tag ของ EMVCo + Thai QR Payment ของ Bank of Thailand
---

อ้างอิงตาม **Thai QR Payment supplement ของ Bank of Thailand / Thai Bankers' Association / KASIKORN BANK** ที่วางทับอยู่บน EMVCo Merchant-Presented-Mode QR Code Specification v1.1:

## Root TLV tags

| Tag | ฟิลด์                                  | สถานะ           | หมายเหตุ                                                                               |
| --- | -------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| 00  | Payload Format Indicator               | ✓               | เป็น `01` เสมอ                                                                         |
| 01  | Point of Initiation                    | ✓               | `11` static / `12` dynamic, สลับอัตโนมัติตามว่ามี amount หรือไม่                       |
| 29  | Merchant Account Info — PromptPay      | ✓               | GUID `…0111` (มาตรฐาน), `…0114` (OTA); ใช้ร่วมกับ TrueMoney Wallet QR                  |
| 30  | Merchant Account Info — BillPayment    | ✓               | GUID `…0112` (ในประเทศ), `…012006` (ข้ามประเทศ)                                        |
| 31  | Merchant Account Info — KShop          | reserved        | export constant ไว้แล้ว; ยังไม่มี builder helper                                       |
| 52  | Merchant Category Code                 | ✓               | 4 หลักตาม ISO 18245                                                                    |
| 53  | Transaction Currency                   | ✓               | เป็น `764` (THB) เสมอ                                                                  |
| 54  | Transaction Amount                     | ✓               | สูงสุด 9,999,999,999.99 — ทศนิยม 2 ตำแหน่ง — รับ input เป็นสตางค์ก็ได้                 |
| 55  | Tip / Convenience Indicator            | ✓               | `01` prompt / `02` ค่าคงที่ / `03` เปอร์เซ็นต์                                         |
| 56  | Tip Fixed                              | ✓               | THB                                                                                    |
| 57  | Tip Percentage                         | ✓               | ทศนิยม 2 ตำแหน่ง                                                                       |
| 58  | Country Code                           | ✓               | เป็น `TH` เสมอ                                                                         |
| 59  | Merchant Name                          | ✓               | สูงสุด 25 ตัวอักษร (ตัดท้ายอัตโนมัติ)                                                  |
| 60  | Merchant City                          | ✓               | สูงสุด 15 ตัวอักษร                                                                     |
| 61  | Postal Code                            | ✓               | สูงสุด 10 ตัวอักษร                                                                     |
| 62  | Additional Data Field Template         | ✓               | ครบทั้ง 9 sub-fields                                                                   |
| 63  | CRC-16/CCITT-FALSE                     | ✓               | poly `0x1021`, init `0xFFFF`, ไม่ reflect, ไม่ XOR out                                 |
| 64  | Merchant Information Language Template | not implemented | เปิด issue ได้ถ้าต้องใช้                                                               |
| 80  | VAT TQRC (BoT tax-qualified extension) | ✓               | 3 sub-fields — ยกระดับ payment QR ให้กลายเป็นแหล่งของใบกำกับภาษีอิเล็กทรอนิกส์ (e-tax) |
| 81  | Personal message                       | ✓               | เป็น UTF-16BE-as-hex; พกพาโดย TrueMoney Wallet QR                                      |

## PromptPay merchant template (ภายใต้ tag 29)

Sub-tag 00 บรรจุ AID หนึ่งในสองค่า:

- `A000000677010111` — PromptPay credit transfer แบบมาตรฐาน
- `A000000677010114` — PromptPay credit transfer แบบ One-Time Authorization (OTA)

AID แบบ OTA จะถูกเลือกอัตโนมัติเมื่อเรียก `.ota(code)` บน builder เครื่องสแกนจะส่ง payload ไปยัง flow แบบใช้ครั้งเดียว

| Sub-tag | ฟิลด์                                                      | สถานะ |
| ------- | ---------------------------------------------------------- | ----- |
| 00      | GUID — `A000000677010111` หรือ `A000000677010114` (OTA)    | ✓     |
| 01      | Mobile Number — 13 ตัวอักษร `0066xxxxxxxxxx`               | ✓     |
| 02      | National ID — 13 ตัวอักษร                                  | ✓     |
| 03      | e-Wallet ID — 15 ตัวอักษร                                  | ✓     |
| 04      | Bank Account — รหัสธนาคาร 3 หลัก + เลขที่บัญชี, 1–43 chars | ✓     |
| 05      | OTA code — ความยาวคงที่ 10 ตัวอักษร                        | ✓     |

### TrueMoney Wallet layout (อยู่ภายใต้ tag 29 เช่นกัน)

ใช้ PromptPay AID ตัวเดียวกัน (`A000000677010111`) แต่ sub-tag 03 ของ e-wallet จะบรรจุ identifier ขนาด 15 ตัวอักษรที่ขึ้นต้นด้วย `14` (`14` + เบอร์มือถือ 13 หลักเติม 0 ข้างหน้า) prefix `14` ตรง ๆ คือเครื่องหมายเดียวที่ใช้แยกแยะตอน parse ส่วน personal message (เลือกได้) จะอยู่บน tag 81 ในรูป UTF-16BE-encoded hex

## BillPayment merchant template (ภายใต้ tag 30)

Sub-tag 00 บรรจุ AID หนึ่งในสองค่า:

- `A000000677010112` — bill payment ข้ามธนาคารภายในประเทศ
- `A000000677012006` — bill payment ข้ามประเทศ (interop กับ ASEAN PayNow / DuitNow / QRIS)

เมื่อกำหนด AID แบบข้ามประเทศ ฟิลด์ `purposeOfTransaction` ใน additional-data (tag 62 sub-tag 08) จะบรรจุ triple แบบ opaque ความยาว 18 ตัวอักษร — currencyCode (3) + localAmount (13) + countryCode (2) builder ปฏิบัติกับมันเป็น string ดิบ ให้ประกอบ / parse เองที่ฝั่งผู้เรียก

| Sub-tag | ฟิลด์                                                          | สถานะ |
| ------- | -------------------------------------------------------------- | ----- |
| 00      | GUID — `A000000677010112` หรือ `A000000677012006` (ข้ามประเทศ) | ✓     |
| 01      | Biller ID                                                      | ✓     |
| 02      | Reference 1                                                    | ✓     |
| 03      | Reference 2                                                    | ✓     |

## VAT TQRC template (ภายใต้ tag 80)

ส่วนขยาย tax-qualified ของ Bank of Thailand ยกระดับ payment QR รอบ ๆ ให้กลายเป็นแหล่งของใบกำกับภาษีอิเล็กทรอนิกส์ (e-tax-receipt) ลำดับ sub-tag บน wire คือ 00 → 01 → 02

| Sub-tag | ฟิลด์             | หมายเหตุ             |
| ------- | ----------------- | -------------------- |
| 00      | sellerTaxBranchId | 4 ตัวอักษรพอดี       |
| 01      | vatRate           | 1–5 chars (optional) |
| 02      | vatAmount         | 1–13 chars           |

## Additional Data Field Template (ภายใต้ tag 62)

| Sub-tag | ฟิลด์                            | Builder method                             |
| ------- | -------------------------------- | ------------------------------------------ |
| 01      | Bill Number                      | `additionalData({ billNumber })`           |
| 02      | Mobile Number                    | `additionalData({ mobileNumber })`         |
| 03      | Store Label                      | `additionalData({ storeLabel })`           |
| 04      | Loyalty Number                   | `additionalData({ loyaltyNumber })`        |
| 05      | Reference Label                  | `additionalData({ referenceLabel })`       |
| 06      | Customer Label                   | `additionalData({ customerLabel })`        |
| 07      | Terminal Label                   | `additionalData({ terminalLabel })`        |
| 08      | Purpose of Transaction           | `additionalData({ purposeOfTransaction })` |
| 09      | Additional Consumer Data Request | `additionalData({ consumerDataRequest })`  |

## สเปก QR Code (ISO/IEC 18004 Model 2)

| แง่มุม                                         | สถานะ                                            |
| ---------------------------------------------- | ------------------------------------------------ |
| Versions 1-40                                  | ✓ ครบทุกเวอร์ชัน                                 |
| Error correction L / M / Q / H                 | ✓ ครบทุกระดับ                                    |
| Encoding modes (numeric / alphanumeric / byte) | ✓ ครบทุกโหมด + auto-detect                       |
| Reed-Solomon บน GF(2^8) ด้วย primitive `0x11D` | ✓                                                |
| Mask patterns 0-7 + penalty scoring            | ✓                                                |
| Format info (BCH 15,5)                         | ✓                                                |
| Version info (BCH 18,6) สำหรับ v7+             | ✓                                                |
| Alignment patterns ตาม Annex E                 | ✓ ล็อกด้วย regression test หลังจาก bug ใน v0.1.0 |
| Quiet zone                                     | ปรับได้ (default 4 modules)                      |

## Envelope ที่ไม่ใช่ EMVCo

wire format เหล่านี้ไม่ได้ใช้ tag space ร่วมกับ payment QR — คนละ envelope, คนละ CRC tag (หรือไม่มีเลย) อยู่ใน `@thai-qr-payment/payload` ร่วมกับเครื่องจักร TLV หลัก

### Slip Verify Mini-QR

พิมพ์อยู่บน slip โอนเงินของธนาคาร ใช้ resolve transaction ผ่าน bank Open APIs หลังจาก OCR slip ใช้ grammar TLV ของ EMVCo เหมือนกัน แต่ root tag ต่างกัน

| Tag | ฟิลด์                  | หมายเหตุ                                                        |
| --- | ---------------------- | --------------------------------------------------------------- |
| 00  | Root template (nested) | บรรจุ sub-field `00` API type, `01` ธนาคารต้นทาง, `02` transRef |
| 51  | Country code           | เป็น `TH` เสมอ                                                  |
| 91  | CRC-16/CCITT-FALSE     | อัลกอริทึมเดียวกับ tag 63 แต่อยู่ที่ตำแหน่ง tag 91              |

variant ของ TrueMoney ใช้ layout sub-field ภายใต้ tag 00 ต่างออกไป และ emit hex CRC เป็น **ตัวพิมพ์เล็ก** ดูที่ [Slip Verify](/guide/slip-verify/) สำหรับ API ของ builder / parser

### Bank of Thailand 1D bill-payment barcode

barcode สำหรับจ่ายเงินที่เคาน์เตอร์ สแกนที่เทลเลอร์ของธนาคารและจุดชำระเงิน 7-Eleven **ไม่ใช่ EMVCo TLV** — เป็น ASCII string ขึ้นต้นด้วย `|` คั่นด้วย `\r` และไม่มี CRC

```
|<billerId>\r<ref1>\r<ref2>\r<amount>
```

- `billerId` — 15 ตัวอักษร (Tax ID + suffix) เติม 0 ข้างหน้าตอน emit
- `ref1` — reference ของลูกค้า / invoice (บังคับ)
- `ref2` — เป็น empty string เมื่อไม่ใช้
- `amount` — จำนวนเงินเป็น satang แบบ integer หรือใส่ `0` ตรง ๆ เมื่อให้แคชเชียร์เคาะเอง

ดูที่ [BOT barcode](/guide/barcode/) สำหรับ API ของ builder / parser

## มาตรฐานอ้างอิง

- [EMVCo QR Code Specification for Payment Systems — Merchant Presented Mode v1.1](https://www.emvco.com/specifications/)
- [ISO/IEC 18004:2015 — Information technology — Automatic identification and data capture techniques — QR Code bar code symbology specification](https://www.iso.org/standard/62021.html)
- "Thai QR Payment" supplement ของ Bank of Thailand (อ้างผ่าน KBank API portal — ไม่ได้ทำดัชนีสาธารณะ)
