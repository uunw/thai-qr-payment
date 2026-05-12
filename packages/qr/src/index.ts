/**
 * `@thai-qr-payment/qr` — zero-dependency QR Code encoder.
 *
 * ISO/IEC 18004 Model-2 implementation tuned for Thai QR Payment
 * (EMVCo MPM) payloads. Returns a boolean matrix; rendering is the
 * caller's responsibility (use `@thai-qr-payment/render` for SVG).
 */

export { encodeQR } from './encoder.js';
export type { EncodeOptions, QrMatrix } from './encoder.js';
export type { ErrorCorrectionLevel } from './version.js';
export { detectMode } from './mode.js';
export type { EncodingMode } from './mode.js';
