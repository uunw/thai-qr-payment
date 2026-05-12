# @thai-qr-payment/cli

Command-line tool to generate Thai QR Payment SVGs and EMVCo wire payloads.

```bash
pnpm dlx @thai-qr-payment/cli 0812345678 --amount 50 -o qr.svg
# or install globally
pnpm add -g @thai-qr-payment/cli
thai-qr-payment 0812345678 --amount 50 -o qr.svg
```

## Examples

```bash
# Static PromptPay card to stdout
thai-qr-payment 0812345678

# Dynamic 50 THB card written to file
thai-qr-payment 0812345678 --amount 50 -o qr.svg

# Bare QR matrix, 512 px, H ECC
thai-qr-payment 0812345678 --format matrix --ecc H --size 512

# Print just the EMVCo wire payload
thai-qr-payment 0812345678 --amount 50 --format payload

# Silhouette theme, satang amount
thai-qr-payment 0812345678 --amount 5050 --satang --theme silhouette -o qr.svg
```

## License

MIT
