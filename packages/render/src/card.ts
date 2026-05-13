/**
 * Card composer: Thai QR Payment header + PromptPay sub-mark + QR
 * matrix + centre-overlay icon. Layout + sizing follows the official
 * BOT/TBA Thai QR Payment brand guideline:
 *
 *   - Card aspect 7.4 cm × 10.5 cm (0.7048) — portrait-ish
 *   - Navy `#00427A` ("TQR Maximum Blue", brand book §4)
 *   - Header band ~75 % of card width, ~3.5 : 1 aspect
 *   - PromptPay sub-mark *left-aligned* under the header (narrow strip)
 *   - QR ~85 % of card width, centred
 *   - Centre-overlay icon ~10 % of QR (ECC-H recovers the obscured modules)
 *
 *   ┌──────────────────────────┐
 *   │     ▓ THAI QR PAYMENT ▓  │  navy band, tight content crop
 *   │   ⎡Pmt⎤                  │  left-aligned narrow sub-mark
 *   ├──────────────────────────┤
 *   │   ▓▓▓▓▓▓▓▓▓▓▓▓▓        │
 *   │   ▓▓▓▓▓ ┌┐ ▓▓▓▓▓        │
 *   │   ▓▓▓▓▓ └┘ ▓▓▓▓▓        │  small icon overlay (~10%)
 *   │   ▓▓▓▓▓▓▓▓▓▓▓▓▓        │
 *   ├──────────────────────────┤
 *   │ optional merchant name   │
 *   │ optional amount label    │
 *   └──────────────────────────┘
 *
 * Theme rules:
 *   - `theme: 'color'` (default) → Thai_QR_Payment_Logo-01 + PromptPay2 (navy)
 *   - `theme: 'silhouette'`      → silhouette variant + PromptPay1 (black/white)
 *
 * Default PromptPay variant is `PromptPay2` (color theme) because the
 * brand book pairs the navy header with the navy PromptPay sub-mark.
 * Callers can override with `promptpayLogo` to pick `PromptPay1` (the
 * monochrome rounded-border variant) regardless of theme.
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
  /** QR module fill colour. Defaults to `#000000` for max scanner contrast. */
  qrColor?: string;
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

// Canvas 600 × 800 (3 : 4). Mirrors kittinan's 1000×1200 5:6 plus 80 px
// of footer room for optional merchant + amount labels.
const CANVAS = { width: 600, height: 800 } as const;

// Header band — full canvas width, ~6:1 aspect (BOT/TBA reference).
// Acts as a solid navy strip; the logo sits centred inside with
// generous padding rather than filling the band edge-to-edge.
const HEADER_BAND = { x: 0, y: 0, width: 600, height: 110 } as const;

// Logo placement inside the header band — 40 % of canvas width,
// centred horizontally with vertical padding.
const HEADER_LOGO = { x: 195, y: 15, width: 210, height: 80 } as const;

// PromptPay sub-mark — centred under the header. PromptPay2 native
// aspect 384 : 130 ≈ 2.95 : 1; we scale to 260 × 88 for a chunky
// readable mark matching the brand reference.
const PROMPTPAY_BAND = { x: 170, y: 140, width: 260, height: 88 } as const;

// QR frame — 500 × 500 (83 % of canvas width, larger than v6 to
// match the brand reference's QR-dominant layout).
const QR_FRAME = { x: 50, y: 250, width: 500, height: 500 } as const;
const QR_INSET = 14;
const QR_BAND = {
  x: QR_FRAME.x + QR_INSET,
  y: QR_FRAME.y + QR_INSET,
  width: QR_FRAME.width - QR_INSET * 2,
  height: QR_FRAME.height - QR_INSET * 2,
} as const;

// Tight content bbox of `Thai_QR_Payment_Logo-01.svg`. The raw asset
// is 913 × 376 with ~90 px of empty navy padding top/bottom and ~80 px
// each side. Cropping to the actual icon+wordmark bbox yields the
// brand-guide aspect (~3.55 : 1) and removes the floating-in-empty-navy
// look the previous full-viewBox render produced.
const HEADER_VIEWBOX_CROP = '88 75 750 210';

// Icon-only viewBox for the centre overlay. The icon glyph lives at
// roughly x = 88..318 of the original 0..913 viewBox; we keep the full
// vertical extent so the navy bg paints the centre overlay square.
const ICON_VIEWBOX = '0 0 325 376';

/** Strip the outer `<svg …>…</svg>` wrapper so the contents can be reused inside a `<symbol>`. */
function unwrapSvg(svg: string): { viewBox: string; inner: string } {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  let viewBox = viewBoxMatch?.[1];
  if (viewBox == null) {
    // Asset has no explicit viewBox — derive from width/height. Many
    // hand-authored / Illustrator-exported SVGs omit the viewBox and
    // rely on width/height alone; without this fallback the symbol
    // defaults to "0 0 100 100" and the artwork renders 0.5-px tall.
    const widthMatch = svg.match(/<svg[^>]*\swidth="([\d.]+)"/);
    const heightMatch = svg.match(/<svg[^>]*\sheight="([\d.]+)"/);
    if (widthMatch != null && heightMatch != null) {
      viewBox = `0 0 ${widthMatch[1]} ${heightMatch[1]}`;
    } else {
      viewBox = '0 0 100 100';
    }
  }
  // Some assets (vtracer output) ship with leading `<?xml ... ?>`
  // and/or `<!-- Generator ... -->` comments before the `<svg>`. Strip
  // each pattern greedily so the outer `<svg>` always anchors at the
  // start of the string before we drop it.
  const inner = svg
    .replace(/^\s*<\?xml[^?]*\?>\s*/i, '')
    .replace(/^\s*<!--[\s\S]*?-->\s*/g, '')
    .replace(/^\s*<svg\b[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');
  return { viewBox, inner };
}

function defineSymbol(id: string, svg: string, viewBoxOverride?: string): string {
  const { viewBox, inner } = unwrapSvg(svg);
  const vb = viewBoxOverride ?? viewBox;
  return `<symbol id="${id}" viewBox="${escapeXmlAttribute(vb)}">${inner}</symbol>`;
}

// SILHOUETTE_LOGOS is a strict subset of COLOR_LOGOS (only marks for
// which we shipped a `.silhouette.svg` are registered there). When the
// caller asks for a colour-only mark (e.g. PromptPay2) under the
// silhouette theme, fall back to the colour version rather than
// erroring at the type level.
type AnyLogoName = keyof typeof COLOR_LOGOS;
const SILHOUETTE_LOOKUP = SILHOUETTE_LOGOS as Record<AnyLogoName, string | undefined>;

function pickHeaderLogo(theme: CardTheme, override?: AnyLogoName): string {
  const name = override ?? 'Thai_QR_Payment_Logo-01';
  if (theme === 'silhouette') {
    return SILHOUETTE_LOOKUP[name] ?? COLOR_LOGOS[name];
  }
  return COLOR_LOGOS[name];
}

function pickPromptpayLogo(theme: CardTheme, override?: AnyLogoName): string {
  // Default differs by theme:
  //   color      → PromptPay2 (navy bg, pairs with navy header)
  //   silhouette → PromptPay1 (mono w/ rounded border)
  const fallback: AnyLogoName = theme === 'silhouette' ? 'PromptPay1' : 'PromptPay2';
  const name = override ?? fallback;
  if (theme === 'silhouette') {
    return SILHOUETTE_LOOKUP[name] ?? COLOR_LOGOS[name];
  }
  return COLOR_LOGOS[name];
}

/** Compose the full Thai QR Payment card SVG. */
export function renderCard(matrix: QrMatrix, options: CardOptions = {}): string {
  const theme: CardTheme = options.theme ?? 'color';
  const bg = options.background ?? '#ffffff';
  const accent = options.accent ?? '#00427A';
  const qrColor = options.qrColor ?? '#000000';
  const headerSvg = pickHeaderLogo(theme, options.headerLogo);
  const promptpaySvg = pickPromptpayLogo(theme, options.promptpayLogo);
  const overlay = options.centerOverlay ?? theme === 'color';

  const matrixPath = matrixToPath(matrix);
  const modulePx = QR_BAND.width / matrix.size;
  const qrTransform = `translate(${QR_BAND.x} ${QR_BAND.y}) scale(${modulePx})`;

  // Centre overlay: navy mini-logo (icon-only crop of the header
  // artwork) inside a small white pad with rounded corners. 16 % of
  // the QR width — small enough that ECC-H recovers the obscured
  // modules cleanly.
  const overlaySize = QR_BAND.width * 0.16;
  const overlayX = QR_BAND.x + (QR_BAND.width - overlaySize) / 2;
  const overlayY = QR_BAND.y + (QR_BAND.height - overlaySize) / 2;
  const overlayMarkup = overlay
    ? [
        `<rect x="${overlayX - 4}" y="${overlayY - 4}" width="${overlaySize + 8}" height="${overlaySize + 8}" fill="#ffffff" rx="4"/>`,
        `<use href="#tqp-icon" xlink:href="#tqp-icon" x="${overlayX}" y="${overlayY}" width="${overlaySize}" height="${overlaySize}" preserveAspectRatio="xMidYMid meet"/>`,
      ].join('')
    : '';

  const labelBaseY = QR_FRAME.y + QR_FRAME.height + 38;
  const merchantText =
    options.merchantName != null
      ? `<text x="${CANVAS.width / 2}" y="${labelBaseY}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600" fill="${escapeXmlAttribute(accent)}">${escapeXmlAttribute(options.merchantName)}</text>`
      : '';

  const amountY = options.merchantName != null ? labelBaseY + 36 : labelBaseY + 6;
  const amountText =
    options.amountLabel != null
      ? `<text x="${CANVAS.width / 2}" y="${amountY}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="700" fill="${escapeXmlAttribute(accent)}">${escapeXmlAttribute(options.amountLabel)}</text>`
      : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" `,
    `viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" shape-rendering="crispEdges">`,
    `<defs>`,
    // Tight content-bbox crop so the header band renders flush — no
    // empty navy padding around the icon+wordmark.
    defineSymbol('tqp-header', headerSvg, HEADER_VIEWBOX_CROP),
    defineSymbol('tqp-icon', headerSvg, ICON_VIEWBOX),
    defineSymbol('tqp-promptpay', promptpaySvg),
    `</defs>`,
    `<rect width="${CANVAS.width}" height="${CANVAS.height}" fill="${escapeXmlAttribute(bg)}" rx="20"/>`,
    // Solid navy strip — full canvas width, no rounded corners on
    // bottom (overlaps the rounded card bg's top corners only).
    `<path d="M0 ${HEADER_BAND.height} V20 a20 20 0 0 1 20 -20 H${CANVAS.width - 20} a20 20 0 0 1 20 20 V${HEADER_BAND.height} Z" fill="${escapeXmlAttribute(theme === 'silhouette' ? accent : '#00427A')}"/>`,
    // Logo centred inside the strip with `meet` so it never overflows
    // and never gets cropped. Tight-crop viewBox keeps the icon+text
    // tight together; the strip provides the navy padding around them.
    `<use href="#tqp-header" xlink:href="#tqp-header" x="${HEADER_LOGO.x}" y="${HEADER_LOGO.y}" width="${HEADER_LOGO.width}" height="${HEADER_LOGO.height}" preserveAspectRatio="xMidYMid meet"/>`,
    `<use href="#tqp-promptpay" xlink:href="#tqp-promptpay" x="${PROMPTPAY_BAND.x}" y="${PROMPTPAY_BAND.y}" width="${PROMPTPAY_BAND.width}" height="${PROMPTPAY_BAND.height}" preserveAspectRatio="xMidYMid meet"/>`,
    // White QR frame keeps the matrix readable even with a themed bg.
    `<rect x="${QR_FRAME.x}" y="${QR_FRAME.y}" width="${QR_FRAME.width}" height="${QR_FRAME.height}" fill="#ffffff" rx="6"/>`,
    `<g transform="${qrTransform}"><path d="${matrixPath}" fill="${escapeXmlAttribute(qrColor)}"/></g>`,
    overlayMarkup,
    merchantText,
    amountText,
    `</svg>`,
  ].join('');
}
