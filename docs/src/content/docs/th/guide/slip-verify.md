---
title: Slip Verify
description: สร้างและอ่าน Mini-QR ที่พิมพ์อยู่บนสลิปโอนเงินของธนาคารไทย
---

## เหตุผลที่ต้องใช้

**Slip Verify Mini-QR** คือ QR สี่เหลี่ยมขนาดเล็กที่พิมพ์อยู่บนสลิปโอนเงินของธนาคาร (และที่แสดงในหน้ารายละเอียดสลิปของแอป PromptPay) **ไม่ใช่** QR สำหรับการจ่ายเงิน — มีวัตถุประสงค์เพียงอย่างเดียวคือป้อน reference ให้กับ Open API ของธนาคารเพื่อค้นหา transaction หลังจาก OCR หรือสแกนภาพสลิป ใช้สำหรับตรวจสอบว่าลูกค้าที่แจ้งว่าได้จ่ายเงินแล้วได้จ่ายจริงหรือไม่

envelope ใช้ไวยากรณ์ EMVCo TLV เช่นเดียวกัน แต่ใช้ root tag คนละตัว — ดูได้ที่ [ตาราง wire format](#wire-format) ด้านล่าง มีสองรูปแบบให้เลือก: รูปแบบมาตรฐานตาม **Bank of Thailand Thai QR Payment supplement** และรูปแบบของ TrueMoney ที่ส่งออกโดยแอป TrueMoney Wallet

```ts
import {
  buildSlipVerify,
  parseSlipVerify,
  buildTrueMoneySlipVerify,
  parseTrueMoneySlipVerify,
} from 'thai-qr-payment';
```

## Slip-verify แบบมาตรฐาน

`buildSlipVerify({ sendingBank, transRef })` สร้าง wire payload ส่วน `parseSlipVerify(payload)` ดึงทั้งสองฟิลด์กลับออกมา `sendingBank` คือรหัสธนาคาร 3 หลักตาม BoT (`'002'` Bangkok Bank, `'014'` SCB ฯลฯ) และ `transRef` คือ reference ที่พิมพ์อยู่บนสลิป

```ts
const wire = buildSlipVerify({
  sendingBank: '002',
  transRef: '0002123123121200011',
});
// '004000060000010103002021900021231231212000115102TH91049C30'

parseSlipVerify(wire);
// { sendingBank: '002', transRef: '0002123123121200011' }
```

ตัว parser จะคืน `null` (ไม่ throw exception) เมื่อ payload ไม่ใช่ slip-verify envelope ที่ถูกต้อง ไม่ว่าจะเป็น root tag ผิด, CRC tag ผิด, API marker ผิด หรือ checksum ไม่ตรงและกู้คืนไม่ได้ ทำให้ผู้เรียก branch ผลลัพธ์ได้โดยไม่ต้องใช้ `try / catch`

ระบบจะแก้ truncated-CRC อัตโนมัติเป็นค่า default เนื่องจากแอปธนาคารบางแห่งตัด leading zero ออกจาก hex CRC ของ tag 91 ตอน re-encode ส่วนหางที่ยาว 1–3 ตัวอักษรจะถูก left-pad ด้วย `0` แล้วลองตรวจสอบใหม่ก่อนที่จะยอมแพ้

```ts
// Bank app emitted "…91049C30" with the leading '0' dropped — still parses
parseSlipVerify('…91049C3'); // → { sendingBank, transRef }  (auto-fixed)
```

## TrueMoney slip-verify

รูปแบบของ TrueMoney ใช้ envelope เดียวกัน (root tag 00, country tag 51, CRC tag 91) แต่มีโครงสร้าง sub-tag ที่ต่างออกไป `date` เป็น **string 8 ตัวอักษรในรูปแบบ `DDMMYYYY`** — builder จะ throw หากความยาวไม่ถูกต้อง

```ts
const wire = buildTrueMoneySlipVerify({
  eventType: 'P2P',
  transactionId: 'TXN0001234567',
  date: '25012024',
});
// '00480002010102010203P2P0313TXN00012345670408250120249104b425'

parseTrueMoneySlipVerify(wire);
// { eventType: 'P2P', transactionId: 'TXN0001234567', date: '25012024' }
```

**ข้อสังเกตเรื่อง Lowercase-CRC:** รูปแบบ TrueMoney ส่ง CRC ของ tag 91 เป็น hex แบบ **ตัวพิมพ์เล็ก** (`9104b425`) ไม่ใช่ตัวพิมพ์ใหญ่ที่รูปแบบอื่นใช้ ตัว parser รองรับทั้งสองแบบเพื่อให้สามารถ re-hash, normalise หรือเก็บในรูปแบบใดก็ได้ — แต่หากต้องส่ง wire bytes ต่อไปยังเครื่องมืออื่น ควรคงตัวพิมพ์ที่ TrueMoney ส่งมาไว้ มิฉะนั้น scanner ของ TrueMoney เองอาจปฏิเสธได้

ตัว parser ทั้งสองตัวจะเข้มงวดเรื่องประเภทของ envelope ที่ยอมรับ: `parseSlipVerify` จะคืน `null` สำหรับ payload ของ TrueMoney และ `parseTrueMoneySlipVerify` จะคืน `null` สำหรับ payload แบบมาตรฐาน หากไม่ทราบว่า input เป็นรูปแบบใด ให้เรียกทั้งสองตัวตามลำดับ

## Wire format

### Slip-verify แบบมาตรฐาน

Root template อยู่ที่ tag 00; country tag 51; CRC ที่ tag 91 (hex ตัวพิมพ์ใหญ่) ส่วน value ของ tag 00 เป็น TLV run ซ้อนอีกชั้น:

| Tag | Name                 | Length | Example value      |
| --- | -------------------- | ------ | ------------------ |
| 00  | Root template        | var    | (nested TLV below) |
| 51  | Country              | 2      | `TH`               |
| 91  | CRC-16 / CCITT-FALSE | 4      | `9C30`             |

Sub-tag ภายใน tag 00:

| Sub-tag | Name            | Length | Example value         |
| ------- | --------------- | ------ | --------------------- |
| 00      | API type marker | 6      | `000001`              |
| 01      | Sending bank    | var    | `002`                 |
| 02      | Transaction ref | var    | `0002123123121200011` |

### TrueMoney slip-verify

Root tag / country tag / CRC tag เหมือนกัน แต่โครงสร้าง sub-tag ต่างกัน (และ CRC เป็นตัวพิมพ์เล็ก):

| Tag | Name                 | Length | Example value      |
| --- | -------------------- | ------ | ------------------ |
| 00  | Root template        | var    | (nested TLV below) |
| 91  | CRC-16 / CCITT-FALSE | 4      | `b425`             |

Sub-tag ภายใน tag 00:

| Sub-tag | Name              | Length | Example value   |
| ------- | ----------------- | ------ | --------------- |
| 00      | Marker A (`'01'`) | 2      | `01`            |
| 01      | Marker B (`'01'`) | 2      | `01`            |
| 02      | Event type        | var    | `P2P`           |
| 03      | Transaction id    | var    | `TXN0001234567` |
| 04      | Date (`DDMMYYYY`) | 8      | `25012024`      |

คู่ marker (sub-tag 00 + 01 ที่เป็น `'01'` ทั้งคู่) คือตัวบ่งชี้ที่ใช้แยก envelope ของ TrueMoney ออกจากรูปแบบมาตรฐาน — หากไม่มี marker นี้ `parseTrueMoneySlipVerify` จะคืน `null`
