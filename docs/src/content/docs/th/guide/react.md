---
title: React component
description: <ThaiQRPayment /> และ <ThaiQRPaymentMatrix /> สำหรับแอป React 18+
---

![Rendered React component output](/img/samples/qr-card-merchant.svg)

`@thai-qr-payment/react` เชื่อม renderer เข้ากับ React component ที่มี type ครบถ้วน รองรับการใช้งานทั้งแบบ CSR และ SSR (Next.js, Remix, TanStack Start, vanilla Vite) โดยไม่ต้องอาศัย jsdom และไม่ต้องตั้งค่า `useEffect` ใด ๆ

## ติดตั้ง

```bash
pnpm add @thai-qr-payment/react react
```

`react` ถูกกำหนดเป็น **peer dependency** — รองรับเวอร์ชันที่ใช้อยู่แล้ว (≥ 18)

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

Component ทั้งสองตัวจะถูก serialize ฝั่งเซิร์ฟเวอร์ผ่าน `react-dom/server.renderToStaticMarkup` โดย SVG จะถูกฝังเข้าไปใน HTML โดยตรง ไม่จำเป็นต้อง hydrate

```tsx
// Next.js app router — server component
export default function Page() {
  return <ThaiQRPayment recipient="0812345678" amount={50} />;
}
```

## Accessibility

ตัว wrapper จะมี `role="img"` และ `aria-label` ที่ถูกสร้างให้อัตโนมัติ (`"Thai QR Payment for <recipient>"`) สามารถ override ได้ผ่าน prop `ariaLabel`:

```tsx
<ThaiQRPayment recipient="0812345678" amount={50} ariaLabel="Pay 50 baht to Acme Coffee" />
```

## Props ทั้งหมด

| Prop                              | Type                                    | Notes                                         |
| --------------------------------- | --------------------------------------- | --------------------------------------------- |
| `recipient`                       | `string`                                | phone / nationalId / eWallet — จำเป็น         |
| `amount`                          | `number`                                | THB ละไว้สำหรับ QR แบบ static                 |
| `recipientType`                   | `'mobile' \| 'nationalId' \| 'eWallet'` | override การตรวจจับประเภทอัตโนมัติ            |
| `fromSatang`                      | `boolean`                               | กำหนดให้มอง `amount` เป็นจำนวนเต็มหน่วยสตางค์ |
| `errorCorrectionLevel`            | `'L' \| 'M' \| 'Q' \| 'H'`              | ค่า default คือ `'M'`                         |
| `merchantName`                    | `string`                                | render อยู่เหนือ QR (เฉพาะโหมดการ์ด)          |
| `amountLabel`                     | `string`                                | render อยู่ใต้ QR (เฉพาะโหมดการ์ด)            |
| `theme`                           | `'color' \| 'silhouette'`               | สไตล์ของงานออกแบบแบรนด์                       |
| `className`, `style`, `ariaLabel` | DOM pass-through                        |                                               |

## รองรับ React 19

`@thai-qr-payment/react` กำหนด `react@>=18` เป็น peer dependency โดยตัว component ไม่ได้ใช้ API ที่ถูกถอดออกใน React 19 ไม่ว่าจะเป็น string refs, `propTypes` / `defaultProps` ของ function component หรือ legacy context จึงสามารถใช้งานได้ทั้งสองเวอร์ชันโดยไม่ต้องปรับแก้
