// React component SSR — works in any node-env renderer, no jsdom.
// Useful for Next.js RSC, Remix loaders, TanStack Start handlers, etc.
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ThaiQRPayment, ThaiQRPaymentMatrix } from '@thai-qr-payment/react';

const card = renderToStaticMarkup(
  createElement(ThaiQRPayment, {
    recipient: '0812345678',
    amount: 50,
    merchantName: 'Acme Coffee',
    amountLabel: '฿ 50.00',
  }),
);
console.log('card    :', card.length, 'chars');

const matrix = renderToStaticMarkup(
  createElement(ThaiQRPaymentMatrix, {
    recipient: '0812345678',
    amount: 50,
    size: 256,
  }),
);
console.log('matrix  :', matrix.length, 'chars');
