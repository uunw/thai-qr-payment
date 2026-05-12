/**
 * `@thai-qr-payment/assets` — SVG brand marks for Thai QR Payment.
 *
 * Each mark ships in two flavors:
 *  - `COLOR_LOGOS[name]` — full-colour SVG path traced via vtracer.
 *    True vector (no embedded raster), small enough to inline anywhere.
 *  - `SILHOUETTE_LOGOS[name]` — monochrome path traced via potrace.
 *    Even smaller, suitable for masks / icons / dark mode.
 *
 * Only the canonical marks ship by default — `Thai_QR_Payment_Logo-01`
 * (the BOT/TBA primary Thai QR Payment logo) and `PromptPay1` (the
 * National ITMX PromptPay mark). If you need an alternative layout,
 * trace your own asset via the supplied `scripts/build-assets.sh` and
 * drop the result into `packages/assets/src/svg/`.
 *
 * All exports are plain SVG strings — drop them into innerHTML, write
 * them to disk, or serve them with `Content-Type: image/svg+xml`.
 *
 * Marks belong to their respective rights-holders:
 *  - Thai QR Payment logo — Bank of Thailand / Thai Bankers' Association
 *  - PromptPay logo — Bank of Thailand / National ITMX
 *
 * Use of these marks is governed by Thai QR Payment Brand Guidelines.
 * This package merely redistributes the bitmap → SVG conversion;
 * downstream apps must comply with the official brand book.
 */

export {
  COLOR_LOGOS,
  SILHOUETTE_LOGOS,
  type ColorLogoName,
  type SilhouetteLogoName,
} from './generated.js';

import { COLOR_LOGOS, SILHOUETTE_LOGOS } from './generated.js';
import type { ColorLogoName, SilhouetteLogoName } from './generated.js';

/** Get a color logo by name (returns the SVG string). */
export function colorLogo(name: ColorLogoName): string {
  return COLOR_LOGOS[name];
}

/** Get a silhouette logo by name. */
export function silhouetteLogo(name: SilhouetteLogoName): string {
  return SILHOUETTE_LOGOS[name];
}

/** Default mark recommendations for downstream use. */
export const DEFAULT_LOGOS = {
  thaiQrPayment: 'Thai_QR_Payment_Logo-01',
  thaiQrPaymentSilhouette: 'Thai_QR_Payment_Logo-01',
  promptpay: 'PromptPay1',
  promptpaySilhouette: 'PromptPay1',
} as const;
