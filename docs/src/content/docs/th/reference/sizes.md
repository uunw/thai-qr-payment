---
title: ขนาด bundle
description: งบ size-limit สำหรับทุก entry ที่เผยแพร่ — วัดด้วย brotli + minification
---

ทุกไฟล์ `dist/*.js` ที่เผยแพร่จะมาพร้อมไฟล์คู่ `.br` + `.gz` ที่ pre-compressed ไว้ และ CI บังคับงบในทุก PR ผ่าน `andresz1/size-limit-action`

## ขนาดปัจจุบัน (brotli + minified)

| Entry                                              |    งบ |        จริง |
| -------------------------------------------------- | ----: | ----------: |
| `thai-qr-payment` (umbrella เต็ม)                  | 25 KB | **13.7 KB** |
| `thai-qr-payment` (`renderThaiQRPayment` เท่านั้น) | 25 KB |     13.6 KB |
| `thai-qr-payment/payload` sub-path                 |  5 KB |     3.09 KB |
| `thai-qr-payment/qr` sub-path                      |  6 KB |     4.74 KB |
| `@thai-qr-payment/payload` (เต็ม)                  |  5 KB |     3.09 KB |
| `@thai-qr-payment/payload` (`payloadFor` เท่านั้น) |  4 KB |     2.98 KB |
| `@thai-qr-payment/qr`                              |  6 KB |     4.75 KB |
| `@thai-qr-payment/render`                          |  2 KB |     1.24 KB |
| `@thai-qr-payment/react`                           |  1 KB |       256 B |
| `@thai-qr-payment/assets`                          | 20 KB |     4.83 KB |

## เดินทางมาถึงจุดนี้ได้อย่างไร

ตอนแรก umbrella อยู่ที่ **202 KB** brotli — เพราะ asset SVG ของแบรนด์ถูก embed เป็น raster ที่ encode แบบ base64 ห่อด้วย SVG wrapper ซึ่ง SVGO ไม่สามารถลด blob base64 ได้ มี optimization สองอย่างที่ลงใน v0.1.0:

1. **vtracer pass** — re-trace ทุก logo ให้เป็น SVG vector จริง แล้วผ่าน SVGO multipass ลดลง: 202 KB → 18.5 KB (เล็กลง 11 เท่า)
2. **ตัด logo variant ทางเลือกออก** — เอา `-02` ถึง `-06` + `PromptPay2` ออก (commit `bdadef3`) ลดลง: 18.5 KB → 13.6 KB

รวม: หดลง **15 เท่า** จาก build เดิมที่ embed raster ไว้

## อัตราการบีบอัด

bundle JS ที่เผยแพร่ทั้งหมดบีบอัดได้ดี — อัตรา brotli ปกติคือ 35-45%:

| ไฟล์                    |    ดิบ |  Brotli |   Gzip |
| ----------------------- | -----: | ------: | -----: |
| `payload/dist/index.js` | 8.3 KB | 2.98 KB | 3.5 KB |
| `qr/dist/index.js`      |  13 KB |  4.5 KB | 5.2 KB |
| `render/dist/index.js`  | 3.5 KB |  1.5 KB | 1.7 KB |
| `react/dist/index.js`   | 1.2 KB |   449 B |  522 B |

## การบังคับใช้บน CI

workflow [`size-limit.yml`](https://github.com/uunw/thai-qr-payment/blob/main/.github/workflows/size-limit.yml) จะรันบนทุก PR ถ้างบจะถูกเกิน action จะ comment บอก delta บน PR และทำให้ check fail หากต้องการขยายงบ ให้แก้ [`.size-limit.json`](https://github.com/uunw/thai-qr-payment/blob/main/.size-limit.json) พร้อมเขียนเหตุผลสั้น ๆ หนึ่งบรรทัดใน commit
