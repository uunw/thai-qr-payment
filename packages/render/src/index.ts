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
import { renderQrSvg, type QrSvgOptions } from './matrix-svg.js';

export { renderCard } from './card.js';
export { renderQrSvg, matrixToPath } from './matrix-svg.js';
export type { CardOptions, CardTheme } from './card.js';
export type { QrSvgOptions } from './matrix-svg.js';

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
export function renderThaiQrPayment(input: RenderInput & Omit<CardOptions, never>): string {
  const wire = payloadFor({
    recipient: input.recipient,
    amount: input.amount,
    type: input.recipientType,
    fromSatang: input.fromSatang,
  });
  const matrix = encodeQR(wire, {
    errorCorrectionLevel: input.errorCorrectionLevel ?? 'M',
  });
  return renderCard(matrix, input);
}

/**
 * One-shot helper for callers that want only the QR (no header card).
 * Useful when wrapping the QR in your own design system.
 */
export function renderThaiQrPaymentMatrix(input: RenderInput & QrSvgOptions): string {
  const wire = payloadFor({
    recipient: input.recipient,
    amount: input.amount,
    type: input.recipientType,
    fromSatang: input.fromSatang,
  });
  const matrix = encodeQR(wire, {
    errorCorrectionLevel: input.errorCorrectionLevel ?? 'M',
  });
  return renderQrSvg(matrix, input);
}
