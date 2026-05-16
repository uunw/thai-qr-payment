// `encodeQR` — ISO/IEC 18004 Model-2 encoder. Reed-Solomon ECC,
// Galois-field 2^8, mask selection — all hand-rolled, zero deps.
// Returns a `QRMatrix` with `.size` (modules per side) and `.modules`
// (boolean rows). Render it however you like.
import { encodeQR } from 'thai-qr-payment';

const matrix = encodeQR('HELLO WORLD', { errorCorrectionLevel: 'H' });
console.log('version:', matrix.version);
console.log('size   :', matrix.size, 'modules');
console.log('mask   :', matrix.mask);

// ASCII preview (one row per line, █ for dark module).
const ascii = matrix.modules
  .map((row) => row.map((dark) => (dark ? '██' : '  ')).join(''))
  .join('\n');
console.log(ascii);
