# @thai-qr-payment/react

React component bindings for `@thai-qr-payment`. Drop-in `<ThaiQrPayment />` + `<ThaiQrPaymentMatrix />`.

```bash
pnpm add @thai-qr-payment/react @thai-qr-payment/render @thai-qr-payment/payload @thai-qr-payment/qr react
```

## Usage

```tsx
import { ThaiQrPayment, ThaiQrPaymentMatrix } from '@thai-qr-payment/react';

// Full Thai QR Payment card
<ThaiQrPayment
  recipient="0812345678"
  amount={50}
  merchantName="Acme Coffee"
  amountLabel="฿ 50.00"
  errorCorrectionLevel="H"
  className="w-72 h-auto"
/>

// Just the QR matrix
<ThaiQrPaymentMatrix
  recipient="0812345678"
  amount={50}
  size={256}
  className="rounded-lg"
/>
```

## License

MIT
