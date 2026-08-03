// Renderer entry-points — branded card vs bare matrix.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  renderThaiQRPayment,
  renderThaiQRPaymentMatrix,
  renderCard,
  renderQRSvg,
  encodeQR,
} from 'thai-qr-payment';

// Fixed paths under /tmp are world-writable and predictable, so anyone on
// the box can pre-plant a symlink at the name and redirect the write.
// `mkdtemp` gets a fresh 0700 directory instead.
const outDir = mkdtempSync(join(tmpdir(), 'tqp-example-'));

// One-shot card (umbrella helper — builds payload + QR + composes SVG).
// `showCaption` is what draws merchantName / amountLabel; without it the
// card renders clean and both labels are ignored.
const cardSvg = renderThaiQRPayment({
  recipient: '0812345678',
  amount: 50,
  showCaption: true,
  merchantName: 'Acme Coffee',
  amountLabel: '฿ 50.00',
  errorCorrectionLevel: 'H',
});
writeFileSync(join(outDir, 'card.svg'), cardSvg);
console.log('card written  :', cardSvg.length, 'chars');

// Bare matrix card (no header / no logo overlay).
const matrixSvg = renderThaiQRPaymentMatrix({
  recipient: '0812345678',
  amount: 50,
  size: 320,
  quietZone: 4,
});
writeFileSync(join(outDir, 'matrix.svg'), matrixSvg);
console.log('matrix written:', matrixSvg.length, 'chars');

// Lower-level: pre-built wire → encodeQR → renderCard / renderQRSvg.
const wire = '00020101021229370016A000000677010111011300668123456785303764540550.005802TH63042042';
const matrix = encodeQR(wire, { errorCorrectionLevel: 'M' });
const customCard = renderCard(matrix, {
  showCaption: true,
  merchantName: 'Custom Builder Path',
  amountLabel: '฿ 50.00',
});
writeFileSync(join(outDir, 'card-custom.svg'), customCard);
console.log('custom card   :', customCard.length, 'chars');

const bareSvg = renderQRSvg(matrix, { size: 256, foreground: '#000', background: '#fff' });
writeFileSync(join(outDir, 'qr-only.svg'), bareSvg);
console.log('bare svg      :', bareSvg.length, 'chars');
console.log('output dir    :', outDir);
