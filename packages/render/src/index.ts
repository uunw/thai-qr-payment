/**
 * `@thai-qr-payment/render` — high-level SVG renderer.
 *
 * Combines `@thai-qr-payment/payload`, `@thai-qr-payment/qr`, and
 * `@thai-qr-payment/assets` into one entry-point: pass merchant +
 * amount, get an SVG card.
 */

import { payloadFor, type PromptPayRecipientType } from '@thai-qr-payment/payload';
import { encodeQR, type ErrorCorrectionLevel } from '@thai-qr-payment/qr';
import { renderCard, type CardOptions } from './card.js';
import { renderQRSvg, type QRSvgOptions } from './matrix-svg.js';

export { renderCard } from './card.js';
export { renderQRSvg, matrixToPath } from './matrix-svg.js';
export type { CardOptions, CardTheme } from './card.js';
export type { QRSvgOptions } from './matrix-svg.js';

export interface RenderInput {
  recipient: string;
  amount?: number;
  recipientType?: PromptPayRecipientType;
  fromSatang?: boolean;
  /** QR error-correction level. `H` gives the best margin for logo overlays. */
  errorCorrectionLevel?: ErrorCorrectionLevel;
}

/**
 * One-shot helper: build payload → encode QR → render Thai QR Payment card.
 * Returns the SVG string ready to ship.
 */
export function renderThaiQRPayment(input: RenderInput & Omit<CardOptions, never>): string {
  const wire = payloadFor({
    recipient: input.recipient,
    amount: input.amount,
    type: input.recipientType,
    fromSatang: input.fromSatang,
  });
  // The default card layout overlays the Thai QR Payment icon on the
  // QR centre, which obscures ~3 % of the modules. Default ECC up to
  // 'H' so scanners can recover the lost data; callers can still
  // explicitly pass a weaker level.
  const ecc = input.errorCorrectionLevel ?? 'H';
  const matrix = encodeQR(wire, { errorCorrectionLevel: ecc });
  return renderCard(matrix, input);
}

/**
 * One-shot helper for callers that want only the QR (no header card).
 * Useful when wrapping the QR in your own design system.
 */
export function renderThaiQRPaymentMatrix(input: RenderInput & QRSvgOptions): string {
  const wire = payloadFor({
    recipient: input.recipient,
    amount: input.amount,
    type: input.recipientType,
    fromSatang: input.fromSatang,
  });
  const matrix = encodeQR(wire, {
    errorCorrectionLevel: input.errorCorrectionLevel ?? 'M',
  });
  return renderQRSvg(matrix, input);
}
