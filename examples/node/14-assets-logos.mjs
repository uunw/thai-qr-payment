// Brand asset access — color + silhouette flavors for Thai QR Payment
// + PromptPay marks. Each value is a full SVG string ready to inline.
import { COLOR_LOGOS, SILHOUETTE_LOGOS, colorLogo, silhouetteLogo } from 'thai-qr-payment/assets';

console.log('color logos     :', Object.keys(COLOR_LOGOS));
console.log('silhouette logos:', Object.keys(SILHOUETTE_LOGOS));

// Look up by name (typed).
const thaiQR = colorLogo('Thai_QR_Payment_Logo-01');
console.log('Thai QR (color) :', thaiQR.slice(0, 80), '…');

const promptpayMono = silhouetteLogo('PromptPay1');
console.log('PromptPay (mono):', promptpayMono.slice(0, 80), '…');
