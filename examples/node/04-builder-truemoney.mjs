// `.trueMoney()` — TrueMoney Wallet QR. Same envelope as PromptPay (tag
// 29) but a different AID, and the optional personal message rides in
// top-level tag 81 encoded as UTF-16BE hex.
import { ThaiQRPaymentBuilder, parsePayload, decodePersonalMessage } from 'thai-qr-payment';

const wire = new ThaiQRPaymentBuilder()
  .trueMoney('0801111111', { amount: 10.05, message: 'Hello World!' })
  .build();
console.log('wire :', wire);

const parsed = parsePayload(wire);
console.log('kind :', parsed.merchant?.kind);
if (parsed.merchant?.kind === 'trueMoney') {
  console.log('mobile :', parsed.merchant.mobileNo);
  console.log('msg    :', parsed.merchant.message);
}

// Raw tag-81 read demonstrates the hex encoding.
const tag81 = parsed.getTagValue('81');
console.log('tag 81 hex :', tag81);
console.log('decoded    :', tag81 ? decodePersonalMessage(tag81) : null);
