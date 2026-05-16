// `ThaiQRPaymentBuilder` — fluent surface for every wire option.
// Demonstrates the three PromptPay recipient types.
import { ThaiQRPaymentBuilder, parsePayload } from 'thai-qr-payment';

const mobile = new ThaiQRPaymentBuilder().promptpay('0812345678').amount(50).build();
console.log('mobile     :', mobile);

const nationalId = new ThaiQRPaymentBuilder()
  .promptpay('1234567890123', 'nationalId')
  .amount(100)
  .build();
console.log('nationalId :', nationalId);

const eWallet = new ThaiQRPaymentBuilder().promptpay('123456789012345', 'eWallet').build();
console.log('eWallet    :', eWallet);

// Auto-detection: builder picks the type from the digit-count when omitted.
const auto = new ThaiQRPaymentBuilder().promptpay('0812345678').build();
const parsed = parsePayload(auto);
console.log('auto-typed :', parsed.merchant);
