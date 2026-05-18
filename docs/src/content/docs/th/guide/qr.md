---
title: QR encoder
description: QR Code encoder ตาม ISO/IEC 18004 — Reed-Solomon + Galois field โดยไม่มี dependency
---

![Output ของ QR matrix แบบไม่มี style](/img/samples/qr-matrix.svg)

แพ็กเกจ `@thai-qr-payment/qr` implement การสร้าง QR Code Model-2 ตาม ISO/IEC 18004 รวมถึงการแก้ error แบบ Reed-Solomon บน GF(2^8) พัฒนาขึ้นใหม่ทั้งหมด — ไม่ต้องอาศัย `qrcode` และไม่มี native binding

## เริ่มต้นใช้งานอย่างรวดเร็ว

```ts
import { encodeQR } from 'thai-qr-payment';

const { size, modules, version, mask, errorCorrectionLevel } = encodeQR(
  '00020101021229370016A000000677010111...6304ABCD',
  { errorCorrectionLevel: 'H' },
);

// modules: boolean[][]   — modules[y][x] === true → module ดำ
// size:    number         — ขนาด matrix หน่วยเป็น module
// version: 1..40
// mask:    0..7
```

Output เป็น data structure ล้วน ใช้ร่วมกับ `@thai-qr-payment/render` เพื่อสร้าง SVG

## API

### `encodeQR(text, options?)`

| Option                 | Default | หมายเหตุ                                             |
| ---------------------- | ------- | ---------------------------------------------------- |
| `errorCorrectionLevel` | `'M'`   | `'L'` / `'M'` / `'Q'` / `'H'`                        |
| `minVersion`           | `1`     | floor สำหรับการเลือก version                         |
| `maxVersion`           | `40`    | ceiling — throw หาก input ไม่พอดี                    |
| `forceMask`            | auto    | `0..7` — หากไม่กำหนด เลือกอัตโนมัติจาก penalty score |

### `detectMode(text)`

```ts
detectMode('1234567890'); // 'numeric'
detectMode('HELLO WORLD'); // 'alphanumeric'
detectMode('สวัสดี'); // 'byte' (fallback ไปเป็น UTF-8)
```

Payload ของ EMVCo เข้าโหมด `alphanumeric` ได้เสมอ (`[0-9A-Z $%*+-./:]`)

## หลักการทำงาน

1. **ตรวจจับโหมด** — เลือกโหมดที่แคบที่สุดที่ใช้ได้ (numeric → alphanumeric → byte)
2. **เลือก version** — version ที่เล็กที่สุดที่พอดีกับ bit budget ที่ระดับ ECC ที่กำหนด
3. **Pack bit** — mode indicator + char-count + data bits → codeword ที่ pack แล้ว + filler
4. **Reed-Solomon ECC** — ต่อท้ายตาม ISO/IEC 18004 §7.5, interleave block ตาม §7.6
5. **วาง module** — finder + alignment + timing + format-info + version-info + zigzag ของข้อมูล
6. **เลือก mask** — ให้คะแนน mask ทั้ง 8 ตามกฎ penalty 4 ข้อในสเปก; ตัวที่คะแนนต่ำสุดชนะ

## Property test

| Invariant                                                              | สถานะ                |
| ---------------------------------------------------------------------- | -------------------- |
| RS linearity: `enc(a) ⊕ enc(b) === enc(a ⊕ b)`                         | ✓ verified           |
| GF(2^8) distributivity: `a · (b ⊕ c) === (a·b) ⊕ (a·c)`                | ✓ verified           |
| CRC-16/CCITT-FALSE determinism บน input สุ่ม 200 ตัว                   | ✓                    |
| ศูนย์กลาง alignment-pattern ตรงกับ ISO/IEC 18004 Annex E สำหรับ v2-v40 | ✓ pin ไว้ 10 version |

## v0.1.0 → v0.1.1 fix

Release v0.1.0 ตัวแรกมี bug ใน `alignmentCentres()` — QR ทุกตัวที่ version ≥ 2 วาง alignment pattern ผิดพิกัด ทำให้ scanner ปฏิเสธ output ว่า "invalid" แก้ไขแล้วใน v0.1.1 (commit `e4af92f`) พร้อม regression test ที่ pin ตำแหน่งของ Annex E ไว้ **Pin ไว้ที่ ≥ 0.1.1 ใน production**
