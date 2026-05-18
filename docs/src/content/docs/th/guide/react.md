---
title: React component
description: <ThaiQRPayment /> และ <ThaiQRPaymentMatrix /> สำหรับแอป React 18+
---

![Rendered React component output](/img/samples/qr-card-merchant.svg)

`@thai-qr-payment/react` เชื่อม renderer เข้ากับ React component ที่มี type ครบถ้วน ใช้งานได้ทั้ง CSR และ SSR (Next.js, Remix, TanStack Start, vanilla Vite) โดยไม่ต้องพึ่ง jsdom และไม่ต้องเซตอัป `useEffect` ใด ๆ

## ติดตั้ง

```bash
pnpm add @thai-qr-payment/react react
```

`react` เป็น **peer dependency** — ใช้เวอร์ชันใดก็ได้ที่คุณใช้อยู่แล้ว (≥ 18)

## การ์ดเต็มรูปแบบ

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

## เฉพาะ matrix

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

ทั้งสอง component จะถูก serialize ฝั่งเซิร์ฟเวอร์ผ่าน `react-dom/server.renderToStaticMarkup` โดย SVG จะถูกฝังเข้าไปใน HTML โดยตรง ไม่ต้อง hydrate ใด ๆ

```tsx
// Next.js app router — server component
export default function Page() {
  return <ThaiQRPayment recipient="0812345678" amount={50} />;
}
```

## Accessibility

ตัว wrapper จะมี `role="img"` และมี `aria-label` ที่ถูกสร้างให้อัตโนมัติ (`"Thai QR Payment for <recipient>"`) สามารถ override ได้ด้วย `ariaLabel`:

```tsx
<ThaiQRPayment recipient="0812345678" amount={50} ariaLabel="Pay 50 baht to Acme Coffee" />
```

## Props ทั้งหมด

| Prop                              | Type                                    | Notes                                    |
| --------------------------------- | --------------------------------------- | ---------------------------------------- |
| `recipient`                       | `string`                                | phone / nationalId / eWallet — จำเป็น    |
| `amount`                          | `number`                                | THB ละไว้สำหรับ QR แบบ static            |
| `recipientType`                   | `'mobile' \| 'nationalId' \| 'eWallet'` | override การตรวจจับประเภทอัตโนมัติ       |
| `fromSatang`                      | `boolean`                               | ให้มอง `amount` เป็นจำนวนเต็มหน่วยสตางค์ |
| `errorCorrectionLevel`            | `'L' \| 'M' \| 'Q' \| 'H'`              | ค่า default คือ `'M'`                    |
| `merchantName`                    | `string`                                | render อยู่เหนือ QR (เฉพาะโหมดการ์ด)     |
| `amountLabel`                     | `string`                                | render อยู่ใต้ QR (เฉพาะโหมดการ์ด)       |
| `theme`                           | `'color' \| 'silhouette'`               | สไตล์ของงานออกแบบแบรนด์                  |
| `className`, `style`, `ariaLabel` | DOM pass-through                        |                                          |

## พร้อมรองรับ React 19

`@thai-qr-payment/react` ระบุ `react@>=18` เป็น peer dep ตัว component เองไม่ได้ใช้ API ที่ถูกถอดออกใน React 19 เลย ไม่ว่าจะเป็น string refs, `propTypes`/`defaultProps` ของ function component, หรือ legacy context จึงสามารถใช้งานได้ทั้งสองเวอร์ชันโดยไม่ต้องปรับแก้
