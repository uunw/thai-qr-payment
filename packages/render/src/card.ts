/**
 * Card composer: combine a QR matrix, the Thai QR Payment header
 * artwork, and an optional amount label into a single scannable SVG.
 *
 * Layout (canvas 1000 × 1280):
 *
 *   ┌───────────────────────────┐
 *   │ Thai QR Payment band      │  0-260
 *   ├───────────────────────────┤
 *   │ PromptPay sub-mark        │  260-380
 *   ├───────────────────────────┤
 *   │                           │
 *   │      QR matrix            │  430-1110
 *   │                           │
 *   ├───────────────────────────┤
 *   │ amount label              │  1110-1280
 *   └───────────────────────────┘
 *
 * The canvas keeps EMVCo's recommended quiet zone (≥4 modules) around
 * the QR by inset positioning. Logo bands are rendered via
 * `<use href="#…">` referencing the embedded `<symbol>` definitions so
 * the file stays compact and the logos can be themed at runtime.
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
  /** Optional merchant name rendered above the QR. */
  merchantName?: string;
  /** Background colour of the entire card. */
  background?: string;
  /** Foreground / accent colour for text + silhouette artwork. */
  accent?: string;
  /** Override the Thai QR Payment header logo by registry name. */
  headerLogo?: keyof typeof COLOR_LOGOS;
  /** Override the PromptPay sub-mark by registry name. */
  promptpayLogo?: keyof typeof COLOR_LOGOS;
}

const CANVAS = { width: 1000, height: 1280 } as const;
const HEADER_BAND = { x: 60, y: 60, width: 880, height: 200 } as const;
const PROMPTPAY_BAND = { x: 320, y: 280, width: 360, height: 110 } as const;
const QR_BAND = { x: 110, y: 430, width: 780, height: 660 } as const;
const AMOUNT_BAND = { x: 60, y: 1110, width: 880, height: 130 } as const;

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

  const matrixPath = matrixToPath(matrix);
  const modulePx = QR_BAND.width / matrix.size;
  const qrTransform = `translate(${QR_BAND.x} ${QR_BAND.y}) scale(${modulePx})`;

  const merchantText =
    options.merchantName != null
      ? `<text x="${CANVAS.width / 2}" y="410" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="32" fill="${escapeXmlAttribute(accent)}" font-weight="600">${escapeXmlAttribute(options.merchantName)}</text>`
      : '';

  const amountText =
    options.amountLabel != null
      ? `<text x="${CANVAS.width / 2}" y="${AMOUNT_BAND.y + 95}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="68" font-weight="700" fill="${escapeXmlAttribute(accent)}">${escapeXmlAttribute(options.amountLabel)}</text>`
      : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" `,
    `viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" shape-rendering="crispEdges">`,
    `<defs>`,
    defineSymbol('tqp-header', headerSvg),
    defineSymbol('tqp-promptpay', promptpaySvg),
    `</defs>`,
    `<rect width="${CANVAS.width}" height="${CANVAS.height}" fill="${escapeXmlAttribute(bg)}" rx="48"/>`,
    `<use href="#tqp-header" xlink:href="#tqp-header" x="${HEADER_BAND.x}" y="${HEADER_BAND.y}" width="${HEADER_BAND.width}" height="${HEADER_BAND.height}" preserveAspectRatio="xMidYMid meet"/>`,
    `<use href="#tqp-promptpay" xlink:href="#tqp-promptpay" x="${PROMPTPAY_BAND.x}" y="${PROMPTPAY_BAND.y}" width="${PROMPTPAY_BAND.width}" height="${PROMPTPAY_BAND.height}" preserveAspectRatio="xMidYMid meet"/>`,
    merchantText,
    `<rect x="${QR_BAND.x - 20}" y="${QR_BAND.y - 20}" width="${QR_BAND.width + 40}" height="${QR_BAND.height + 40}" fill="#fff" rx="16"/>`,
    `<g transform="${qrTransform}"><path d="${matrixPath}" fill="${escapeXmlAttribute(accent)}"/></g>`,
    amountText,
    `</svg>`,
  ].join('');
}
