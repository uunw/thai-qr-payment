// Renderer entry-points — branded card vs bare matrix.
import { writeFileSync } from 'node:fs';
import {
  renderThaiQRPayment,
  renderThaiQRPaymentMatrix,
  renderCard,
  renderQRSvg,
  encodeQR,
} from 'thai-qr-payment';

// One-shot card (umbrella helper — builds payload + QR + composes SVG).
const cardSvg = renderThaiQRPayment({
  recipient: '0812345678',
  amount: 50,
  merchantName: 'Acme Coffee',
  amountLabel: '฿ 50.00',
  errorCorrectionLevel: 'H',
});
writeFileSync('/tmp/card.svg', cardSvg);
console.log('card written  :', cardSvg.length, 'chars');

// Bare matrix card (no header / no logo overlay).
const matrixSvg = renderThaiQRPaymentMatrix({
  recipient: '0812345678',
  amount: 50,
  size: 320,
  quietZone: 4,
});
writeFileSync('/tmp/matrix.svg', matrixSvg);
console.log('matrix written:', matrixSvg.length, 'chars');

// Lower-level: pre-built wire → encodeQR → renderCard / renderQRSvg.
const wire = '00020101021229370016A000000677010111011300668123456785303764540550.005802TH63042042';
const matrix = encodeQR(wire, { errorCorrectionLevel: 'M' });
const customCard = renderCard(matrix, {
  merchantName: 'Custom Builder Path',
  amountLabel: '฿ 50.00',
});
writeFileSync('/tmp/card-custom.svg', customCard);
console.log('custom card   :', customCard.length, 'chars');

const bareSvg = renderQRSvg(matrix, { size: 256, foreground: '#000', background: '#fff' });
writeFileSync('/tmp/qr-only.svg', bareSvg);
console.log('bare svg      :', bareSvg.length, 'chars');
