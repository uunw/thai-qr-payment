// Slip Verify Mini-QR — the small QR on bank transfer slips. Different
// envelope from a payment QR (root tag 00, country at 51, CRC at 91).
// Both the standard and TrueMoney variants round-trip here.
import {
  buildSlipVerify,
  parseSlipVerify,
  buildTrueMoneySlipVerify,
  parseTrueMoneySlipVerify,
} from 'thai-qr-payment';

const standard = buildSlipVerify({
  sendingBank: '002', // BBL
  transRef: '0002123123121200011',
});
console.log('standard :', standard);
console.log('parsed   :', parseSlipVerify(standard));

const trueMoney = buildTrueMoneySlipVerify({
  eventType: 'P2P',
  transactionId: 'TXN0001234567',
  date: '25012024', // DDMMYYYY
});
console.log('trueMoney:', trueMoney); // note: CRC is lowercase by spec
console.log('parsed   :', parseTrueMoneySlipVerify(trueMoney));

// Non-slip-verify input rejected by both parsers.
console.log('non-slip :', parseSlipVerify('00020101021229370016A000000677010111…'));
