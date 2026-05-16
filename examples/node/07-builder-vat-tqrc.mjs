// `.vatTqrc()` — adds top-level tag 80 so the same payment QR doubles
// as a Bank-of-Thailand Tax-Qualified-QR-Code for e-tax receipts.
import { ThaiQRPaymentBuilder, parsePayload } from 'thai-qr-payment';

const wire = new ThaiQRPaymentBuilder()
  .promptpay('0812345678')
  .amount(107)
  .merchant({ name: 'Acme Coffee' })
  .vatTqrc({
    sellerTaxBranchId: '0001', // exactly 4 chars
    vatRate: '7', // 1–5 chars (e.g. "7" or "7.00")
    vatAmount: '7.00', // 1–13 chars (required)
  })
  .build();

console.log('wire :', wire);
const parsed = parsePayload(wire);
console.log('vat  :', parsed.vatTqrc);
