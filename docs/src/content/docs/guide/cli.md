---
title: CLI
description: thai-qr-payment / tqp command-line tool for one-off QR generation.
---

![Sample CLI output card](/img/samples/qr-card-hero.svg)

```bash
# Zero-install — npx
npx thai-qr-payment 0812345678 --amount 50 -o qr.svg

# Global install
pnpm add -g thai-qr-payment
thai-qr-payment 0812345678 --amount 50 --merchant "Acme Coffee" -o qr.svg
tqp 0812345678 --format payload

# CLI-only (skips the library)
npx @thai-qr-payment/cli 0812345678 --amount 50
```

## Modes

### Card (default)

```bash
thai-qr-payment 0812345678 --amount 50 --merchant "Acme Coffee" -o qr.svg
```

Full SVG card with Thai QR Payment + PromptPay headers, merchant name, and amount label.

### Matrix

```bash
thai-qr-payment 0812345678 --amount 50 --format matrix --size 512 -o qr.svg
```

Just the QR matrix as a square SVG. Caller-controlled size.

### Payload

```bash
thai-qr-payment 0812345678 --amount 50 --format payload
# 00020101021229370016A00000067701011101130066812345678530376454065000.005802TH63041234
```

Raw EMVCo wire string. Useful for piping into another tool.

## Flags

| Flag                | Short | Notes                                                       |
| ------------------- | ----- | ----------------------------------------------------------- |
| `--recipient <id>`  | `-r`  | phone, nationalId, eWallet                                  |
| `--amount <thb>`    | `-a`  | omit for static QR                                          |
| `--satang`          | —     | treat `--amount` as integer satang                          |
| `--type <kind>`     | —     | `mobile` / `nationalId` / `eWallet` — overrides auto-detect |
| `--ecc <level>`     | —     | `L` / `M` / `Q` / `H` (default `M`)                         |
| `--format <kind>`   | `-f`  | `card` (default) / `matrix` / `payload`                     |
| `--theme <kind>`    | —     | `color` (default) / `silhouette`                            |
| `--merchant <name>` | `-m`  | rendered above the QR (card mode)                           |
| `--size <px>`       | —     | matrix mode output size                                     |
| `--output <path>`   | `-o`  | write to file (default stdout)                              |
| `--help`            | `-h`  | show help                                                   |
| `--version`         | `-v`  | show CLI version                                            |

## Examples

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
