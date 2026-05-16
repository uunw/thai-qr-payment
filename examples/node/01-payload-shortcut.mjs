// `payloadFor` — one-shot helper for the most common PromptPay flow.
// No builder, no parser — just a wire-format string.
import { payloadFor } from 'thai-qr-payment';

const staticQR = payloadFor({ recipient: '0812345678' });
console.log('static  :', staticQR);

const dynamicQR = payloadFor({ recipient: '0812345678', amount: 50 });
console.log('dynamic :', dynamicQR);

const fromSatang = payloadFor({ recipient: '0812345678', amount: 5000, fromSatang: true });
console.log('satang  :', fromSatang); // amount = 50.00 THB

const nationalId = payloadFor({ recipient: '1234567890123', type: 'nationalId' });
console.log('natId   :', nationalId);
