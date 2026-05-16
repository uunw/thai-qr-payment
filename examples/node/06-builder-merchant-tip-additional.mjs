// Merchant info, additional-data, and tip policy on the same builder.
import { ThaiQRPaymentBuilder, parsePayload } from 'thai-qr-payment';

const wire = new ThaiQRPaymentBuilder()
  .promptpay('0812345678')
  .amount(250)
  .merchant({
    name: 'Acme Coffee', // ≤ 25
    city: 'BANGKOK', //   ≤ 15
    postalCode: '10310', // ≤ 10
    categoryCode: '5814', // 4-digit MCC (eating place)
  })
  .additionalData({
    billNumber: 'INV-2026-0007',
    storeLabel: 'Branch 1',
    terminalLabel: 'POS-A',
    referenceLabel: 'PO#88',
    mobileNumber: '0812345678',
    loyaltyNumber: 'GOLD-001',
    customerLabel: 'Test Customer',
  })
  .tipPolicy({ mode: 'fixed', value: 10 })
  .build();

console.log('wire   :', wire);
const parsed = parsePayload(wire);
console.log('extras :', {
  merchantName: parsed.merchantName,
  merchantCity: parsed.merchantCity,
  postalCode: parsed.postalCode,
  merchantCategoryCode: parsed.merchantCategoryCode,
  additionalData: parsed.additionalData,
});
