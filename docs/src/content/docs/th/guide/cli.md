---
title: CLI
description: เครื่องมือ command-line thai-qr-payment / tqp สำหรับสร้าง QR แบบ one-off
---

![Sample CLI output card](/img/samples/qr-card-hero.svg)

```bash
# Zero-install — npx (umbrella package, single tarball)
npx thai-qr-payment 0812345678 --amount 50 -o qr.svg
npx tqp 0812345678 --amount 50 -o qr.svg

# Global install
pnpm add -g thai-qr-payment
thai-qr-payment 0812345678 --amount 50 --merchant "Acme Coffee" -o qr.svg
tqp 0812345678 --format payload
```

### npx + scoped CLI package

`@thai-qr-payment/cli` มีไบนารีสองตัวเหมือนกัน (`thai-qr-payment` และ `tqp`) แต่ **ชื่อไบนารีไม่ตรงกับชื่อแพ็กเกจ** npx จึงไม่สามารถ resolve `@thai-qr-payment/cli` ไปเป็นไบนารีชื่อ `thai-qr-payment` ได้อัตโนมัติ ทำให้ `npx @thai-qr-payment/cli 0812345678` ล้มเหลวด้วย `command not found` ต้องระบุชื่อไบนารีอย่างชัดเจนผ่าน `--package`:

```bash
# Wrong — npx looks for a `@thai-qr-payment/cli` binary, finds none
npx @thai-qr-payment/cli 0812345678 --amount 50
# → sh: thai-qr-payment: command not found

# Right — use the umbrella (recommended, single tarball)
npx thai-qr-payment 0812345678 --amount 50

# Right — scoped CLI with --package
npx --package=@thai-qr-payment/cli thai-qr-payment 0812345678 --amount 50
npx --package=@thai-qr-payment/cli tqp 0812345678 --amount 50
```

แนะนำให้ใช้ umbrella มากกว่า (มี tarball เดียว รวม deps ทั้งหมดไว้แล้ว) ใช้ scoped CLI เฉพาะกรณีที่ต้อง pin เวอร์ชันของแพ็กเกจในสคริปต์ automation เท่านั้น

## โหมดต่าง ๆ

### Card (default)

```bash
thai-qr-payment 0812345678 --amount 50 --merchant "Acme Coffee" -o qr.svg
```

การ์ด SVG เต็มรูปแบบ พร้อม header ของ Thai QR Payment + PromptPay ชื่อร้านค้า และป้ายแสดงยอดเงิน

### Matrix

```bash
thai-qr-payment 0812345678 --amount 50 --format matrix --size 512 -o qr.svg
```

เฉพาะ QR matrix เป็น SVG สี่เหลี่ยมจัตุรัส ผู้เรียกควบคุมขนาดเองได้

### Payload

```bash
thai-qr-payment 0812345678 --amount 50 --format payload
# 00020101021229370016A00000067701011101130066812345678530376454065000.005802TH63041234
```

สตริง wire ดิบตามมาตรฐาน EMVCo เหมาะสำหรับ pipe ต่อไปยังเครื่องมืออื่น

## Flags

| Flag                | Short | Notes                                                              |
| ------------------- | ----- | ------------------------------------------------------------------ |
| `--recipient <id>`  | `-r`  | phone, nationalId, eWallet                                         |
| `--amount <thb>`    | `-a`  | ละไว้สำหรับ QR แบบ static                                          |
| `--satang`          | —     | ให้มอง `--amount` เป็นจำนวนเต็มหน่วยสตางค์                         |
| `--type <kind>`     | —     | `mobile` / `nationalId` / `eWallet` — override การตรวจจับอัตโนมัติ |
| `--ecc <level>`     | —     | `L` / `M` / `Q` / `H` (default `M`)                                |
| `--format <kind>`   | `-f`  | `card` (default) / `matrix` / `payload`                            |
| `--theme <kind>`    | —     | `color` (default) / `silhouette`                                   |
| `--merchant <name>` | `-m`  | render เหนือ QR (โหมด card)                                        |
| `--size <px>`       | —     | ขนาด output ของโหมด matrix                                         |
| `--output <path>`   | `-o`  | เขียนลงไฟล์ (default คือ stdout)                                   |
| `--help`            | `-h`  | แสดงข้อความช่วยเหลือ                                               |
| `--version`         | `-v`  | แสดงเวอร์ชันของ CLI                                                |

## ตัวอย่าง

```bash
# Dynamic 50 THB card written to file
thai-qr-payment 0812345678 --amount 50 --merchant "Acme" -o qr.svg

# Bare 512 px QR matrix with high error correction
thai-qr-payment 0812345678 --amount 50 --format matrix --size 512 --ecc H -o qr.svg

# Print just the payload (for piping)
thai-qr-payment 0812345678 --amount 50 --format payload | tee payload.txt

# Pay 50.50 from satang
thai-qr-payment 0812345678 --amount 5050 --satang -o qr.svg

# Silhouette theme (monochrome brand artwork)
thai-qr-payment 0812345678 --amount 50 --theme silhouette -o qr.svg

# National ID recipient
thai-qr-payment 1234567890123 --type nationalId --amount 100 -o qr.svg

# e-Wallet recipient
thai-qr-payment 123456789012345 --type eWallet --amount 200 -o qr.svg
```
