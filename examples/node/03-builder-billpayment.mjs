// `.billPayment()` — biller-driven payment (tag 30). Optional cross-border
// flag swaps the AID for ASEAN PayNow / DuitNow / QRIS interop.
import { ThaiQRPaymentBuilder, parsePayload } from 'thai-qr-payment';

const domestic = new ThaiQRPaymentBuilder()
  .billPayment({
    billerId: '099400016550100',
    reference1: 'CUST001',
    reference2: 'INV-2026-001',
  })
  .amount(1500)
  .build();
console.log('domestic   :', domestic);
console.log('merchant   :', parsePayload(domestic).merchant);

const crossBorder = new ThaiQRPaymentBuilder()
  .billPayment({
    billerId: '099400016550100',
    reference1: 'CUST001',
    crossBorder: true,
  })
  .amount(1500)
  .additionalData({
    // Cross-border purposeOfTransaction triple: currency(3) + localAmount(13) + country(2)
    purposeOfTransaction: '7020000000010000SG',
  })
  .build();
console.log('crossBorder:', crossBorder);
console.log('merchant   :', parsePayload(crossBorder).merchant);
