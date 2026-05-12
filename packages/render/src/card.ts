/**
 * Card composer: combine a QR matrix, the Thai QR Payment header
 * artwork, the PromptPay sub-mark, and an optional centre-overlay
 * Thai QR Payment icon into a single scannable SVG.
 *
 * Layout (canvas 600 × 700):
 *
 *   ┌──────────────────────────┐
 *   │ ▓▓ Thai QR Payment ▓▓ │  navy band, 0-100
 *   ├──────────────────────────┤
 *   │ PromptPay mark           │  inset left, 100-180
 *   ├──────────────────────────┤
 *   │     ▓▓▓▓▓▓▓▓▓▓▓        │
 *   │     ▓▓▓ ┌──┐ ▓▓▓        │  QR centred, 180-580
 *   │     ▓▓▓ │ ◆│ ▓▓▓        │  with optional logo
 *   │     ▓▓▓ └──┘ ▓▓▓        │  overlay at centre
 *   │     ▓▓▓▓▓▓▓▓▓▓▓        │
 *   ├──────────────────────────┤
 *   │ optional merchant name   │  580-640
 *   │ optional amount label    │  640-700
 *   └──────────────────────────┘
 *
 * The centre overlay is the canonical Thai QR Payment design: a small
 * white square containing the Thai QR Payment icon, occupying about
 * 16 % of the QR's width. Scanners survive the obscured centre as
 * long as the QR is encoded with ECC level Q or H — callers should
 * pass `errorCorrectionLevel: 'H'` to `encodeQR()` when relying on
 * the overlay (the one-shot `renderThaiQrPayment` helper defaults to
 * `'M'`, but the overlay only kicks in for `theme: 'color'`).
 *
 * Logos are inlined via `<symbol>` defs so the file stays compact
 * and the marks can be themed at runtime.
 */

import { COLOR_LOGOS, SILHOUETTE_LOGOS } from '@thai-qr-payment/assets';
import type { QrMatrix } from '@thai-qr-payment/qr';
import { escapeXmlAttribute, matrixToPath } from './matrix-svg.js';

export type CardTheme = 'color' | 'silhouette';

export interface CardOptions {
  /** Brand artwork flavor. `color` keeps full fidelity, `silhouette` is monochrome. */
  theme?: CardTheme;
  /** Optional amount label rendered below the QR. */
  amountLabel?: string;
  /** Optional merchant name rendered below the QR (above the amount). */
  merchantName?: string;
  /** Background colour of the entire card. */
  background?: string;
  /** Foreground / accent colour for text + silhouette artwork. */
  accent?: string;
  /** Override the Thai QR Payment header logo by registry name. */
  headerLogo?: keyof typeof COLOR_LOGOS;
  /** Override the PromptPay sub-mark by registry name. */
  promptpayLogo?: keyof typeof COLOR_LOGOS;
  /**
   * Overlay the Thai QR Payment icon at the centre of the QR matrix.
   * Defaults to `true` for `theme: 'color'`, `false` for `'silhouette'`.
   * Always pair with `encodeQR({ errorCorrectionLevel: 'Q' | 'H' })`
   * so the obscured modules are recoverable.
   */
  centerOverlay?: boolean;
}

// Canonical layout matching the Thai QR Payment / PromptPay brand guidelines.
const CANVAS = { width: 600, height: 700 } as const;
const HEADER_BAND = { x: 80, y: 30, width: 440, height: 70 } as const;
const PROMPTPAY_BAND = { x: 70, y: 110, width: 160, height: 50 } as const;
const QR_FRAME = { x: 75, y: 180, width: 450, height: 450 } as const;
const QR_INSET = 20;
const QR_BAND = {
  x: QR_FRAME.x + QR_INSET,
  y: QR_FRAME.y + QR_INSET,
  width: QR_FRAME.width - QR_INSET * 2,
  height: QR_FRAME.height - QR_INSET * 2,
} as const;

/** Strip the outer `<svg …>…</svg>` wrapper so the contents can be reused inside a `<symbol>`. */
function unwrapSvg(svg: string): { viewBox: string; inner: string } {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch?.[1] ?? '0 0 100 100';
  const inner = svg
    .replace(/^<\?xml[^>]+\?>/, '')
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');
  return { viewBox, inner };
}

function defineSymbol(id: string, svg: string): string {
  const { viewBox, inner } = unwrapSvg(svg);
  return `<symbol id="${id}" viewBox="${escapeXmlAttribute(viewBox)}">${inner}</symbol>`;
}

function pickHeaderLogo(theme: CardTheme, override?: keyof typeof COLOR_LOGOS): string {
  const name = override ?? 'Thai_QR_Payment_Logo-01';
  return theme === 'silhouette' ? SILHOUETTE_LOGOS[name] : COLOR_LOGOS[name];
}

function pickPromptpayLogo(theme: CardTheme, override?: keyof typeof COLOR_LOGOS): string {
  const name = override ?? 'PromptPay1';
  return theme === 'silhouette' ? SILHOUETTE_LOGOS[name] : COLOR_LOGOS[name];
}

/** Compose the full Thai QR Payment card SVG. */
export function renderCard(matrix: QrMatrix, options: CardOptions = {}): string {
  const theme: CardTheme = options.theme ?? 'color';
  const bg = options.background ?? '#ffffff';
  const accent = options.accent ?? '#0a2540';
  const headerSvg = pickHeaderLogo(theme, options.headerLogo);
  const promptpaySvg = pickPromptpayLogo(theme, options.promptpayLogo);
  const overlay = options.centerOverlay ?? theme === 'color';

  const matrixPath = matrixToPath(matrix);
  const modulePx = QR_BAND.width / matrix.size;
  const qrTransform = `translate(${QR_BAND.x} ${QR_BAND.y}) scale(${modulePx})`;

  // Centre overlay: a white rounded square containing the Thai QR Payment
  // icon, 16 % of the QR's width. Per the brand guide the icon sits on a
  // small white background so the surrounding dark modules don't bleed in.
  const overlaySize = QR_BAND.width * 0.18;
  const overlayX = QR_BAND.x + (QR_BAND.width - overlaySize) / 2;
  const overlayY = QR_BAND.y + (QR_BAND.height - overlaySize) / 2;
  const iconInset = overlaySize * 0.12;
  const overlayMarkup = overlay
    ? [
        `<rect x="${overlayX - 3}" y="${overlayY - 3}" width="${overlaySize + 6}" height="${overlaySize + 6}" fill="#ffffff" rx="8"/>`,
        `<use href="#tqp-header-icon" xlink:href="#tqp-header-icon" x="${overlayX + iconInset}" y="${overlayY + iconInset}" width="${overlaySize - iconInset * 2}" height="${overlaySize - iconInset * 2}" preserveAspectRatio="xMidYMid meet"/>`,
      ].join('')
    : '';

  const labelBaseY = QR_FRAME.y + QR_FRAME.height + 30;
  const merchantText =
    options.merchantName != null
      ? `<text x="${CANVAS.width / 2}" y="${labelBaseY}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600" fill="${escapeXmlAttribute(accent)}">${escapeXmlAttribute(options.merchantName)}</text>`
      : '';

  const amountY = options.merchantName != null ? labelBaseY + 36 : labelBaseY + 8;
  const amountText =
    options.amountLabel != null
      ? `<text x="${CANVAS.width / 2}" y="${amountY}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="700" fill="${escapeXmlAttribute(accent)}">${escapeXmlAttribute(options.amountLabel)}</text>`
      : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" `,
    `viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" shape-rendering="crispEdges">`,
    `<defs>`,
    defineSymbol('tqp-header', headerSvg),
    defineSymbol('tqp-header-icon', headerSvg),
    defineSymbol('tqp-promptpay', promptpaySvg),
    `</defs>`,
    `<rect width="${CANVAS.width}" height="${CANVAS.height}" fill="${escapeXmlAttribute(bg)}" rx="24"/>`,
    // Header band — navy bg + white logo
    `<rect x="${HEADER_BAND.x - 20}" y="${HEADER_BAND.y - 10}" width="${HEADER_BAND.width + 40}" height="${HEADER_BAND.height + 20}" fill="${escapeXmlAttribute(accent)}" rx="6"/>`,
    `<use href="#tqp-header" xlink:href="#tqp-header" x="${HEADER_BAND.x}" y="${HEADER_BAND.y}" width="${HEADER_BAND.width}" height="${HEADER_BAND.height}" preserveAspectRatio="xMidYMid meet"/>`,
    // PromptPay sub-mark
    `<use href="#tqp-promptpay" xlink:href="#tqp-promptpay" x="${PROMPTPAY_BAND.x}" y="${PROMPTPAY_BAND.y}" width="${PROMPTPAY_BAND.width}" height="${PROMPTPAY_BAND.height}" preserveAspectRatio="xMidYMid meet"/>`,
    // QR frame (white background under the matrix so the QR is always
    // black-on-white even when the card background is themed).
    `<rect x="${QR_FRAME.x}" y="${QR_FRAME.y}" width="${QR_FRAME.width}" height="${QR_FRAME.height}" fill="#ffffff" rx="8"/>`,
    `<g transform="${qrTransform}"><path d="${matrixPath}" fill="${escapeXmlAttribute(accent)}"/></g>`,
    overlayMarkup,
    merchantText,
    amountText,
    `</svg>`,
  ].join('');
}
