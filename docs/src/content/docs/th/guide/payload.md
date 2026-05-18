---
title: Payload (EMVCo TLV)
description: สร้างและอ่าน wire payload ของ Thai QR Payment ด้วย @thai-qr-payment/payload
---

![ตัวอย่าง Thai QR Payment card](/img/samples/qr-card-merchant.svg)

`@thai-qr-payment/payload` implement ไวยากรณ์ TLV ของ **EMVCo Merchant-Presented-Mode v1.1** พร้อม **Bank of Thailand Thai QR Payment supplement** (PromptPay, BillPayment, TrueMoney, OTA, VAT TQRC และการโอนเงินข้ามประเทศในกลุ่ม ASEAN) ไม่มี dependency และรันได้บนทุก runtime ของ JavaScript

## Helper แบบ one-shot

```ts
import { payloadFor } from 'thai-qr-payment';

const wire = payloadFor({ recipient: '0812345678', amount: 50 });
// 00020101021229370016A000000677010111011300668123456785303764540550.005802TH6304XXXX
```

ใช้ `ThaiQRPaymentBuilder` เมื่อต้องการระบุข้อมูลร้านค้า, reference, OTA, การโอนเข้าบัญชีธนาคาร, TrueMoney, VAT TQRC หรือการโอนข้ามประเทศ

## Builder

```ts
import { ThaiQRPaymentBuilder } from 'thai-qr-payment';
```

ไม่ว่าจะตั้งค่าใดไว้ก็ตาม มีเมธอดปิดท้ายให้เลือกสามตัว: `.build()` คืน wire string, `.buildWithChecksum()` แยก body / CRC ออกมาเพื่อการตรวจสอบ และ `.toBytes()` คืน `Uint8Array` สำหรับนำไป hash หรือส่งต่อ

### `.promptpay(recipient, type?)`

ผู้รับแบบเบอร์มือถือ, เลขประจำตัวประชาชน หรือ e-wallet หากไม่ระบุ type ระบบจะตรวจสอบจากจำนวนหลัก: 9–12 → `mobile`, 13 → `nationalId`, 15 → `eWallet` พร้อม override สำหรับเคสที่ไม่ชัดเจน (พบได้น้อย)

```ts
new ThaiQRPaymentBuilder().promptpay('0812345678').amount(50).build();
new ThaiQRPaymentBuilder().promptpay('1234567890123', 'nationalId').amount(50).build();
new ThaiQRPaymentBuilder().promptpay('123456789012345', 'eWallet').amount(50).build();
```

ผู้รับแบบเบอร์มือถือจะถูก zero-pad ให้เป็น `0066xxxxxxxxxx` ความยาว 13 ตัวก่อน encode

### `.bankAccount(bankCode, accountNo)`

การโอนเครดิตของ PromptPay ไปยังบัญชีธนาคาร (sub-tag 04 ภายใต้ tag 29) โดย `bankCode` เป็นรหัสธนาคาร 3 หลักของ BoT (`'002'` ธนาคารกรุงเทพ, `'014'` SCB, …) และ `accountNo` เป็นเลขบัญชีที่มีความยาวไม่แน่นอน wire value ที่ประกอบรวมแล้วถูกจำกัดไว้ที่ 43 ตัวตาม limit ของ sub-tag ใน EMVCo

```ts
new ThaiQRPaymentBuilder().bankAccount('014', '1234567890').amount(100).build();
// 00020101021229370016A0000006770101110413014123456789053037645406100.005802TH6304901D
```

เมธอดนี้แยกออกจาก `.promptpay(..., 'bankAccount')` เพราะ wire value ต้องประกอบจาก (bankCode, accountNo) ซึ่งไม่สามารถส่งผ่าน string เดียวได้ — การเรียก `.promptpay(x, 'bankAccount')` จะ throw

### `.ota(otaCode)`

แนบรหัส **One-Time Authorization** (sub-tag 05 ความยาว 10 ตัวพอดี) จุดสำคัญคือการสลับ AID: builder จะเปลี่ยน GUID ของ tag 29 จาก `A000000677010111` (PromptPay มาตรฐาน) เป็น `A000000677010114` (PromptPay OTA) เพื่อให้ธนาคารผู้รับ route payload ผ่าน flow การโอนเครดิตแบบใช้ครั้งเดียว แทนที่ flow ร้านค้า PromptPay แบบใช้ซ้ำได้

```ts
new ThaiQRPaymentBuilder().promptpay('0812345678').ota('1234567890').amount(50).build();
// 00020101021229510016A00000067701011401130066812345678051012345678905303764540550.005802TH63048856
```

ใช้ร่วมกับ `.bankAccount()` ได้สำหรับการโอน OTA เข้าบัญชีธนาคาร

### `.trueMoney(mobileNo, { amount?, message? })`

TrueMoney Wallet QR ใช้ tag merchant template เดียวกับ PromptPay (29) แต่กำหนด literal `'14'` ไว้เป็น prefix บน sub-tag 03 — prefix นี้คือเครื่องหมายที่แอป TrueMoney ใช้แยก payload ของตัวเองออกจาก e-wallet QR ทั่วไป เบอร์มือถือจะถูก zero-pad ทางซ้ายให้เป็น 13 หลัก แล้วต่อ prefix; ค่าของ sub-tag 03 สุดท้ายจะมีความยาว 15 ตัวเสมอ

```ts
new ThaiQRPaymentBuilder().trueMoney('0801111111').build();
// 00020101021129390016A000000677010111031514000080111111153037645802TH63047C0F

new ThaiQRPaymentBuilder().trueMoney('0801111111', { amount: 10, message: 'Hello World!' }).build();
// includes tag 81: '814800480065006C006C006F00200057006F0072006C00640021'
```

`message` ซึ่งเป็น optional จะถูกใส่ไว้ใน tag 81 ในรูป **UTF-16BE** hex (code unit Unicode แต่ละตัวกลายเป็น hex ตัวพิมพ์ใหญ่ 4 ตัว) ข้อมูลนี้จะปรากฏเฉพาะภายในแอป TrueMoney เท่านั้น — wallet อื่นจะไม่อ่านค่านี้ ดู [personal message codec](#personal-message-codec) ด้านล่างสำหรับ encoder แบบ raw

### `.billPayment({ billerId, reference1?, reference2?, crossBorder? })`

BillPayment merchant template (tag 30) โดย `billerId` เป็น biller identifier แบบข้ามธนาคาร (ความยาว 15 ตัวบน wire) และ reference เป็นค่าที่แอปกำหนดเอง

```ts
new ThaiQRPaymentBuilder()
  .billPayment({
    billerId: '123456789012345',
    reference1: 'INV001',
    reference2: 'CUST42',
  })
  .amount(250.5)
  .build();
```

ส่ง `crossBorder: true` เพื่อใช้ **AID ของการโอนเงินในภูมิภาค ASEAN** (`A000000677012006`) แทน AID ภายในประเทศ (`A000000677010112`) — sub-tag layout เหมือนกัน แต่ผู้รับจะ route การจ่ายเงินผ่าน rails ของ ASEAN PayNow / DuitNow / QRIS interop แทน switch biller ของ PromptPay ภายในประเทศ

```ts
new ThaiQRPaymentBuilder()
  .billPayment({ billerId: '099400016550100', reference1: '123456789012', crossBorder: true })
  .amount(100)
  .build();
// 00020101021230550016A0000006770120060115099400016550100021212345678901253037645406100.005802TH63049D1C
```

Payload ข้ามประเทศจะคู่กับ sub-field `purposeOfTransaction` ใน additional-data (tag 62 sub-tag 08) ซึ่งบรรจุ triple ความยาว 18 ตัว: รหัสสกุลเงิน (3 หลัก) + ยอดเงินท้องถิ่น (13 หลัก) + รหัสประเทศ (2 ตัว) builder จัดเก็บ triple นี้แบบ opaque — ฝั่งผู้เรียกต้องประกอบและอ่านค่าเอง

### `.amount(value, opts?)`

ยอดเงิน THB ให้ผลลัพธ์เป็นทศนิยม 2 ตำแหน่ง โดยใช้เลขจำนวนเต็มในการปัด (ไม่มีปัญหาแบบ `0.30000000000000004`) ละเว้นหรือส่ง `undefined` เพื่อสร้าง QR แบบ static — แอปธนาคารฝั่งผู้บริโภคจะถามยอดเงินเอง

```ts
.amount(50)                            // 50.00
.amount(99.5)                          // 99.50
.amount(12345, { fromSatang: true })   // 123.45 — input เป็นสตางค์จำนวนเต็ม
.amount(12345n, { fromSatang: true })  // รองรับ BigInt
.amount(undefined)                     // QR แบบ static (ไม่มี tag 54)
.amount(0)                             // เหมือนกัน — zero ยุบเป็น static
```

Wire value สูงสุด: 9,999,999,999.99 THB ค่าเป็นลบ, `NaN` หรือ `Infinity` จะ throw

การกำหนดยอดเงินที่ไม่ใช่ศูนย์จะสลับ tag point-of-initiation จาก `11` (static) เป็น `12` (dynamic) โดยอัตโนมัติ สามารถ override ด้วย `.pointOfInitiation('static' | 'dynamic')` หากต้องการบังคับฝั่งใดฝั่งหนึ่ง

### `.merchant({ name?, city?, postalCode?, categoryCode? })`

Field ที่ใช้แสดง `name` จะถูกตัดเหลือ 25 ตัว และ `city` เหลือ 15 ตัว ส่วน `categoryCode` คือ MCC ตาม ISO 18245 ความยาว 4 หลัก

```ts
.merchant({
  name: 'Acme Coffee',
  city: 'BANGKOK',
  postalCode: '10310',
  categoryCode: '5814',  // Fast Food Restaurants
})
```

### `.additionalData({...})`

Sub-field ของ tag 62 ครบทั้ง 9 ช่อง:

```ts
.additionalData({
  billNumber:           'INV-2026-001',   // sub-tag 01
  mobileNumber:         '02-123-4567',    // sub-tag 02
  storeLabel:           'STR01',          // sub-tag 03
  loyaltyNumber:        'LOY42',          // sub-tag 04
  referenceLabel:       'REF99',          // sub-tag 05
  customerLabel:        'CUST42',         // sub-tag 06
  terminalLabel:        'T01',            // sub-tag 07
  purposeOfTransaction: 'PURCHASE',       // sub-tag 08 (หรือ triple ของ cross-border)
  consumerDataRequest:  'EMAIL',          // sub-tag 09
})
```

การเรียก `.additionalData()` หลายครั้งจะ merge เข้าด้วยกัน — key ที่ระบุภายหลังจะ overwrite ค่าก่อนหน้าสำหรับช่องเดียวกัน

### `.tipPolicy({...})`

Tag 55–57

```ts
.tipPolicy({ mode: 'prompt' })                       // ให้แอปถามผู้จ่าย
.tipPolicy({ mode: 'fixed', value: 10 })             // 10.00 THB
.tipPolicy({ mode: 'fixed', value: 1000, fromSatang: true })
.tipPolicy({ mode: 'percentage', value: 5 })         // 5.00 %
.tipPolicy(undefined)                                // ล้างค่า
```

Fixed tip ที่มีค่า 0 จะ throw — ให้ส่ง `undefined` แทน

### `.vatTqrc({ sellerTaxBranchId, vatRate?, vatAmount })`

Extension **VAT TQRC** ของ Bank of Thailand (tag 80 ระดับบนสุด) เปลี่ยน QR การจ่ายเงินผ่าน PromptPay ธรรมดาให้กลายเป็นแหล่งของ **Tax-Qualified-QR-Code** สำหรับการเชื่อมต่อใบเสร็จอิเล็กทรอนิกส์ภาษีของไทย — ระบบผู้รับสามารถอ่าน VAT split จาก QR แล้วออกใบเสร็จอิเล็กทรอนิกส์ที่ถูกต้องโดยไม่ต้องเรียก API แยก

```ts
new ThaiQRPaymentBuilder()
  .promptpay('0812345678')
  .amount(107)
  .vatTqrc({ sellerTaxBranchId: '0001', vatRate: '7', vatAmount: '7.00' })
  .build();
// …8021000400010101702047.00 6304XXXX
```

กฎความยาวของ field ตามสเปก extension ของ BoT:

- `sellerTaxBranchId` — 4 ตัวพอดี
- `vatRate` — 1–5 ตัวเมื่อมีค่า (เช่น `'7'` หรือ `'7.00'`); ละไว้สำหรับใบเสร็จแบบ VAT-inclusive ที่ไม่แสดงอัตรา
- `vatAmount` — 1–13 ตัว จำเป็นต้องระบุ

ส่ง `undefined` เพื่อล้างค่า

### `.build()` / `.buildWithChecksum()` / `.toBytes()`

```ts
const wire = builder.build();
// "00020101…6304XXXX"

const { body, checksum, payload } = builder.buildWithChecksum();
// body ลงท้ายด้วย "6304" (header ของ CRC tag เป็นส่วนหนึ่งของ input ที่ hash)
// checksum คือ CRC แบบ hex ตัวพิมพ์ใหญ่ 4 ตัว
// payload === body + checksum

const bytes = builder.toBytes();
// Uint8Array — หนึ่งไบต์ต่อหนึ่งตัวอักษร ASCII ใน payload
```

CRC เป็นแบบ **CRC-16/CCITT-FALSE** (poly `0x1021`, init `0xFFFF`, ไม่ reflect, ไม่ XOR out) คำนวณบน body **บวกกับ** header `6304` ของ tag การไม่รวม header ตัวนี้ใน verifier คือความผิดพลาดที่พบบ่อยและไม่ตรงสเปก

## Parser

```ts
import { parsePayload } from 'thai-qr-payment';
```

### `parsePayload(payload, { strict? })`

```ts
const parsed = parsePayload(wire);
// {
//   payloadFormat: '01',
//   pointOfInitiation: 'dynamic',
//   merchant: { kind: 'promptpay', recipientType: 'mobile', recipient: '0812345678' },
//   amount: 50,
//   currency: '764',
//   country: 'TH',
//   merchantName: 'Acme Coffee',
//   crc: { value: '901D', valid: true, truncated: false },
//   rawTags: [...],
//   getTag(id), getTagValue(id, subId?),
//   ...
// }
```

พฤติกรรมเริ่มต้น:

- ตรวจ CRC ท้าย payload หาก 4 ตัวสุดท้ายตรงกับ checksum ที่คำนวณใหม่ จะคืน `crc: { valid: true, truncated: false }`
- หากส่วนท้ายเหลือเพียง 1–3 ตัว (บางแอปธนาคารไทยตัดเลข 0 นำหน้าออกตอน re-encode) จะลอง left-pad ด้วย `0` จนกว่า checksum จะตรง หากสำเร็จจะคืน `crc: { valid: true, truncated: true }` — ข้อมูลร้านค้าที่อ่านได้ยังคงถูกต้อง; แสดง warning ให้ผู้ใช้หากต้องการรายงาน bug ของแอปต้นทาง
- กรณีที่ไม่ตรงและกู้ไม่ได้: throw

ส่ง `{ strict: true }` เพื่อไม่ให้ auto-fix CRC แบบ truncated และ throw ทันทีเมื่อ CRC ขาดหรือไม่ตรง ใช้ strict mode สำหรับการ parse ที่ trust-boundary (OCR ของสลิป, input จาก payment link); ปิดไว้เมื่อรับ output จากแอปที่ทราบว่ามี bug

### โครงสร้างของ `ParsedPayload`

Field `merchant` เป็น discriminated union — narrow ด้วย `.kind`:

```ts
type Merchant = ParsedPromptPay | ParsedBillPayment | ParsedTrueMoney | null;

interface ParsedPromptPay {
  kind: 'promptpay';
  recipientType: 'mobile' | 'nationalId' | 'eWallet' | 'bankAccount';
  recipient: string;
  bankCode?: string; // มีค่าเมื่อ recipientType === 'bankAccount'
  accountNo?: string; // มีค่าเมื่อ recipientType === 'bankAccount'
  ota?: string; // รหัส OTA ความยาว 10 ตัวเมื่อมี
}

interface ParsedBillPayment {
  kind: 'billPayment';
  billerId: string;
  reference1?: string;
  reference2?: string;
  crossBorder: boolean; // true เมื่อ AID คือ A000000677012006
}

interface ParsedTrueMoney {
  kind: 'trueMoney';
  mobileNo: string;
  message?: string; // ถอดมาจาก tag 81 UTF-16BE hex
}
```

`merchant` จะเป็น `null` เฉพาะ payload ที่ไม่มี merchant template ที่รู้จัก — รูปแบบ PromptPay / BillPayment / TrueMoney ทุกตัว resolve เป็น kind ที่ชัดเจน

VAT TQRC หากมี จะอยู่ที่ระดับบนสุด:

```ts
parsed.vatTqrc;
// { sellerTaxBranchId: '0001', vatRate: '7', vatAmount: '7.00' }
```

ใน strict mode tag 80 ที่มี sub-template ผิดรูปจะ throw; ในโหมดอื่นจะลดระดับลงเป็น `vatTqrc: undefined` โดยไม่แสดงข้อความ

### Accessor สำหรับ raw tag

สำหรับ tag ที่ไม่รู้จักหรือมาในอนาคต ให้เข้าถึง TLV ในระดับ raw:

```ts
parsed.rawTags;
// readonly [{ tag: '00', value: '01' }, { tag: '01', value: '12' }, …]

parsed.getTag('58');
// { tag: '58', value: 'TH' }

parsed.getTagValue('29', '00');
// 'A000000677010111'  — AID ภายใน merchant template

parsed.getTagValue('62', '01');
// 'INV-2026-001'  — sub-field billNumber
```

`getTagValue(id, subId?)` เข้าถึงได้หนึ่งระดับ — ส่งเฉพาะ `id` สำหรับค่าระดับบนสุด, `(id, subId)` สำหรับ template ที่ซ้อน (tag 29–31, 62, 64, 80)

## Helper TLV ระดับล่าง

สำหรับเครื่องมือที่ต้อง introspect หรือสังเคราะห์ TLV แบบ raw โดยไม่ใช้ builder เต็ม:

```ts
import {
  encodeField, // (tag, value) → 'IILLDDDD…'
  encodeFields, // ([tag, value][]) → ต่อกัน ค่าที่เป็น null/empty ถูกตัดทิ้ง
  parseFields, // (input) → Map<tag, value>
  iterateFields, // (input) → IterableIterator<{tag, value}>
  checksum, // (input) → CRC-16/CCITT-FALSE แบบ hex ตัวพิมพ์ใหญ่ 4 ตัว
  Tags, // namespace ของ tag id constant ทุกตัวตามสเปก
} from 'thai-qr-payment';

encodeField('58', 'TH'); // '5802TH'
encodeFields([
  ['00', '01'],
  ['01', null],
]); // '000201'

parseFields('5802TH5303764').get('53'); // '764'

checksum('00020101…6304'); // 'ABCD'

Tags.TAG_TRANSACTION_AMOUNT; // '54'
Tags.GUID_PROMPTPAY; // 'A000000677010111'
```

`encodeField` จะ throw หาก value เกิน 99 byte (limit ความยาว 2 หลักของ EMVCo); ให้แบ่งใส่หลาย tag ที่ฝั่งผู้เรียก

## Personal message codec

Wire format ของ tag 81 คือ UTF-16BE ของข้อความที่แสดงเป็น hex ตัวพิมพ์ใหญ่ Unicode code unit แต่ละตัวจะกลายเป็น hex 4 ตัว

```ts
import { encodePersonalMessage, decodePersonalMessage } from 'thai-qr-payment';

encodePersonalMessage('Hello');
// '00480065006C006C006F'

decodePersonalMessage('00480065006C006C006F');
// 'Hello'
```

`.trueMoney(mobile, { message })` เรียก `encodePersonalMessage` ภายใน และ `parsePayload` เรียก `decodePersonalMessage` สำหรับ tag 81 ที่แนบมากับ TrueMoney merchant codec ตัวนี้ถูก export ออกมาในรูปแบบ raw สำหรับผู้เรียกที่ต้องการแนบข้อความลงใน envelope อื่น

## Coverage ของ tag

ดู [reference ของ spec coverage](/reference/spec/) สำหรับตารางที่แสดงสถานะการ implement ของแต่ละ tag ครบทุกตัว
