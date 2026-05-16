---
title: React component
description: <ThaiQRPayment /> and <ThaiQRPaymentMatrix /> for React 18+ apps.
---

![Rendered React component output](/img/samples/qr-card-merchant.svg)

`@thai-qr-payment/react` wires the renderer into a typed React component. Works in CSR + SSR (Next.js, Remix, TanStack Start, vanilla Vite) — no jsdom needed, no `useEffect` rigging.

## Install

```bash
pnpm add @thai-qr-payment/react react
```

`react` is a **peer dependency** — bring whichever version you're already using (≥ 18).

## Full card

```tsx
import { ThaiQRPayment } from '@thai-qr-payment/react';

export function PaymentScreen() {
  return (
    <ThaiQRPayment
      recipient="0812345678"
      amount={50}
      merchantName="Acme Coffee"
      amountLabel="฿ 50.00"
      errorCorrectionLevel="H"
      className="w-72 h-auto rounded-xl shadow"
    />
  );
}
```

## Bare matrix

```tsx
import { ThaiQRPaymentMatrix } from '@thai-qr-payment/react';

<ThaiQRPaymentMatrix
  recipient="0812345678"
  amount={50}
  size={256}
  quietZone={4}
  className="border rounded"
/>;
```

## SSR

Both components serialize on the server via `react-dom/server.renderToStaticMarkup`. The SVG is embedded directly into the HTML — no hydration handshake required.

```tsx
// Next.js app router — server component
export default function Page() {
  return <ThaiQRPayment recipient="0812345678" amount={50} />;
}
```

## Accessibility

The wrapper carries `role="img"` and a generated `aria-label` (`"Thai QR Payment for <recipient>"`). Override with `ariaLabel`:

```tsx
<ThaiQRPayment recipient="0812345678" amount={50} ariaLabel="Pay 50 baht to Acme Coffee" />
```

## All props

| Prop                              | Type                                    | Notes                                   |
| --------------------------------- | --------------------------------------- | --------------------------------------- |
| `recipient`                       | `string`                                | phone / nationalId / eWallet — required |
| `amount`                          | `number`                                | THB, omit for static QR                 |
| `recipientType`                   | `'mobile' \| 'nationalId' \| 'eWallet'` | override auto-detection                 |
| `fromSatang`                      | `boolean`                               | treat `amount` as integer satang        |
| `errorCorrectionLevel`            | `'L' \| 'M' \| 'Q' \| 'H'`              | default `'M'`                           |
| `merchantName`                    | `string`                                | rendered above the QR (card mode only)  |
| `amountLabel`                     | `string`                                | rendered below the QR (card mode only)  |
| `theme`                           | `'color' \| 'silhouette'`               | brand artwork flavor                    |
| `className`, `style`, `ariaLabel` | DOM pass-through                        |                                         |

## React 19 ready

`@thai-qr-payment/react` declares `react@>=18` as peer dep. The component itself uses no APIs removed in React 19 — string refs, `propTypes`/`defaultProps` for function components, legacy context — so it runs unmodified on both major versions.
