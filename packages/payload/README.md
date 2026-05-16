# @thai-qr-payment/payload

Zero-dependency EMVCo Merchant-Presented-Mode QR payload builder + parser for **Thai QR Payment** (PromptPay, BillPayment, KShop). Works in browsers, Node, Bun, Deno, and edge runtimes.

```bash
pnpm add @thai-qr-payment/payload
```

## Quickstart

```ts
import { ThaiQRPaymentBuilder, parsePayload, payloadFor } from '@thai-qr-payment/payload';

// One-shot
const wire = payloadFor({ recipient: '0812345678', amount: 50 });

// Builder for full control
const advanced = new ThaiQRPaymentBuilder()
  .promptpay('0812345678')
  .amount(120.5)
  .merchant({ name: 'Acme Coffee', city: 'BANGKOK', categoryCode: '5814' })
  .additionalData({ billNumber: 'INV-2026-001' })
  .tipPolicy({ mode: 'prompt' })
  .build();

// Parser
const parsed = parsePayload(wire);
```

## API

| Export                                          | What it does                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `ThaiQRPaymentBuilder`                          | Chainable builder. Terminal: `.build()`, `.buildWithChecksum()`, `.toBytes()` |
| `parsePayload(wire)`                            | Decode + validate CRC. Throws on tamper.                                      |
| `payloadFor(input)`                             | One-shot helper for PromptPay                                                 |
| `normaliseRecipient(input, type?)`              | Stand-alone recipient → wire format                                           |
| `formatAmount(value, opts?)`                    | Amount → 2-decimal string                                                     |
| `checksum(text)`                                | CRC-16/CCITT-FALSE                                                            |
| `encodeField` / `parseFields` / `iterateFields` | Low-level TLV                                                                 |
| `Tags.*`                                        | Tag constants                                                                 |

## Recipient types

| Input length (digits) | Default type | Wire sub-tag |
| --------------------- | ------------ | ------------ |
| 9-10                  | `mobile`     | 01           |
| 13                    | `nationalId` | 02           |
| 15                    | `eWallet`    | 03           |

Override with the explicit `type` arg.

## Tip policy

```ts
.tipPolicy({ mode: 'prompt' })             // app asks the payer
.tipPolicy({ mode: 'fixed', value: 10 })   // fixed THB amount
.tipPolicy({ mode: 'percentage', value: 5 }) // 5%
```

## Browser

`@thai-qr-payment/payload` is pure TS — no Node built-ins. Drop into Vite, Webpack, Rspack, Bun bundle. Tree-shakable.

## License

MIT
