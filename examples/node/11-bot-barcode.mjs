// Bank of Thailand 1D bill-payment barcode — `|`-prefixed,
// `\r`-delimited four-field string. Not EMVCo, not a QR. Lives in this
// package because the biller-id / ref vocabulary matches Thai bill pay.
import { buildBOTBarcode, parseBOTBarcode } from 'thai-qr-payment';

const wire = buildBOTBarcode({
  billerId: '099400016550100',
  ref1: '123456789012',
  ref2: '670429',
  amount: 3649.22,
});
console.log('wire (literal \\r shown as ⏎):', wire.replace(/\r/g, '⏎'));
//          |099400016550100⏎123456789012⏎670429⏎364922

console.log('parsed :', parseBOTBarcode(wire));
//          { billerId: '099400016550100', ref1: '123456789012', ref2: '670429', amount: 3649.22 }

// Counter-input variant: amount=0 means "enter at counter".
const counterInput = buildBOTBarcode({ billerId: '099999999999990', ref1: '111222333444' });
console.log('counter:', counterInput.replace(/\r/g, '⏎'));
console.log('parsed :', parseBOTBarcode(counterInput));
