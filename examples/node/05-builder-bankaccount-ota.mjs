// `.bankAccount()` + `.ota()` — bank-account credit transfer (sub-tag 04)
// plus optional One-Time Authorization (sub-tag 05). OTA swaps the AID
// from the standard PromptPay GUID to the OTA GUID so the scanner routes
// the payload through the single-use flow.
import { ThaiQRPaymentBuilder, parsePayload } from 'thai-qr-payment';

const bare = new ThaiQRPaymentBuilder().bankAccount('014', '1234567890').amount(100).build();
console.log('bank-acct :', bare);

const withOta = new ThaiQRPaymentBuilder()
  .bankAccount('014', '1234567890')
  .ota('1234567890') // exactly 10 chars
  .amount(100)
  .build();
console.log('with OTA  :', withOta);

// Parser surfaces bankCode / accountNo and the OTA code.
const parsed = parsePayload(withOta);
if (parsed.merchant?.kind === 'promptpay') {
  console.log('type      :', parsed.merchant.recipientType);
  console.log('bankCode  :', parsed.merchant.bankCode);
  console.log('accountNo :', parsed.merchant.accountNo);
  console.log('ota       :', parsed.merchant.ota);
}
