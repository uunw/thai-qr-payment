/**
 * Compact SVG <path> serialisation of a QR module matrix.
 *
 * Emits one move + horizontal-run command per dark stretch on each
 * row. Gzip likes the repetition; for a typical 25-30-module Thai QR
 * Payment payload the path is 1-2 KB before compression.
 */

import type { QrMatrix } from '@thai-qr-payment/qr';

/** Build a path-data string covering every dark module in the matrix. */
export function matrixToPath(matrix: QrMatrix): string {
  const segments: string[] = [];
  for (let y = 0; y < matrix.size; y += 1) {
    const row = matrix.modules[y];
    if (!row) continue;
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let runEnd = x;
      while (runEnd < row.length && row[runEnd]) runEnd += 1;
      const runLen = runEnd - x;
      // Single-row rectangle: M x y h<runLen> v1 h-<runLen> z
      segments.push(`M${x} ${y}h${runLen}v1h-${runLen}z`);
      x = runEnd;
    }
  }
  return segments.join('');
}

export interface QrSvgOptions {
  /** Output width in user units (px by default). Defaults to module count. */
  size?: number;
  /** Quiet-zone width in modules. EMVCo recommends 4. */
  quietZone?: number;
  /** Dark module colour. Defaults to `#000`. */
  foreground?: string;
  /** Background colour (set to `transparent` to omit). Defaults to `#fff`. */
  background?: string;
  /** Additional attributes added verbatim to the root `<svg>` element. */
  rootAttributes?: Record<string, string>;
}

/** Render a QR matrix to a self-contained `<svg>` string. */
export function renderQrSvg(matrix: QrMatrix, options: QrSvgOptions = {}): string {
  const quietZone = options.quietZone ?? 4;
  const fg = options.foreground ?? '#000';
  const bg = options.background ?? '#fff';
  const total = matrix.size + quietZone * 2;
  const size = options.size ?? total;
  const path = matrixToPath(matrix);

  const extra = options.rootAttributes
    ? ' ' +
      Object.entries(options.rootAttributes)
        .map(([k, v]) => `${k}="${escapeXmlAttribute(v)}"`)
        .join(' ')
    : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" ` +
    `width="${size}" height="${size}" shape-rendering="crispEdges"${extra}>` +
    (bg === 'transparent'
      ? ''
      : `<rect width="${total}" height="${total}" fill="${escapeXmlAttribute(bg)}"/>`) +
    `<g transform="translate(${quietZone} ${quietZone})">` +
    `<path d="${path}" fill="${escapeXmlAttribute(fg)}"/>` +
    `</g></svg>`
  );
}

function escapeXmlAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
    }
    return c;
  });
}

export { escapeXmlAttribute };
