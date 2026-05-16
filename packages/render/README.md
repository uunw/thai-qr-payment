# @thai-qr-payment/render

SVG renderer that composes Thai QR Payment payload + QR matrix + brand assets into a single scannable card. Built on `@thai-qr-payment/payload`, `@thai-qr-payment/qr`, and `@thai-qr-payment/assets`.

```bash
pnpm add @thai-qr-payment/render
```

## Quickstart

```ts
import { renderThaiQRPayment } from '@thai-qr-payment/render';

const svg = renderThaiQRPayment({
  recipient: '0812345678',
  amount: 50,
  merchantName: 'Acme Coffee',
  amountLabel: '฿ 50.00',
  errorCorrectionLevel: 'H',
});

// Serve via a Cloudflare Worker, Node HTTP handler, or write to disk.
return new Response(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } });
```

## Just the QR (no card chrome)

```ts
import { renderThaiQRPaymentMatrix } from '@thai-qr-payment/render';

const svg = renderThaiQRPaymentMatrix({
  recipient: '0812345678',
  amount: 50,
  size: 256, // px
  quietZone: 4,
});
```

## Card options

| Option          | Default                   | Notes                                                |
| --------------- | ------------------------- | ---------------------------------------------------- |
| `theme`         | `color`                   | `silhouette` swaps brand artwork to monochrome paths |
| `merchantName`  | —                         | Rendered above the QR                                |
| `amountLabel`   | —                         | Free-form THB string rendered below the QR           |
| `background`    | `#fff`                    | Card backdrop                                        |
| `accent`        | `#0a2540`                 | Text + silhouette fill colour                        |
| `headerLogo`    | `Thai_QR_Payment_Logo-01` | Override from `@thai-qr-payment/assets`              |
| `promptpayLogo` | `PromptPay1`              | Override                                             |

## License

MIT
