/**
 * Module placement: data zigzag, format-info embed, version-info embed.
 */

import { encodeFormatBits, encodeVersionBits } from './format-info.js';
import type { Matrix } from './matrix.js';
import type { ErrorCorrectionLevel } from './version.js';

/**
 * Walk the QR data area right-to-left in 2-column vertical zigzag and
 * place data bits. Columns at x=6 are skipped (timing pattern lives there).
 */
export function placeData(matrix: Matrix, bytes: Uint8Array): void {
  const { dim } = matrix;
  let bitIndex = 0;
  let upward = true;

  for (let right = dim - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1; // skip the vertical timing column

    for (let v = 0; v < dim; v += 1) {
      const y = upward ? dim - 1 - v : v;
      for (let off = 0; off < 2; off += 1) {
        const x = right - off;
        if (matrix.isReserved(x, y)) continue;
        const byteIdx = bitIndex >>> 3;
        const bitOffset = 7 - (bitIndex & 7);
        const bit = (((bytes[byteIdx] ?? 0) >>> bitOffset) & 1) === 1;
        matrix.set(x, y, bit);
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

/** Embed the 15-bit format-info word in the two canonical strips. */
export function placeFormatInfo(matrix: Matrix, ecc: ErrorCorrectionLevel, mask: number): void {
  const bits = encodeFormatBits(ecc, mask);
  const { dim } = matrix;

  // Top-left strip (around the top-left finder)
  for (let i = 0; i < 6; i += 1) matrix.set(8, i, ((bits >>> i) & 1) === 1);
  matrix.set(8, 7, ((bits >>> 6) & 1) === 1);
  matrix.set(8, 8, ((bits >>> 7) & 1) === 1);
  matrix.set(7, 8, ((bits >>> 8) & 1) === 1);
  for (let i = 9; i < 15; i += 1) matrix.set(14 - i, 8, ((bits >>> i) & 1) === 1);

  // Bottom-left + top-right strips
  for (let i = 0; i < 8; i += 1) matrix.set(dim - 1 - i, 8, ((bits >>> i) & 1) === 1);
  for (let i = 8; i < 15; i += 1) matrix.set(8, dim - 15 + i, ((bits >>> i) & 1) === 1);
}

/** Embed the version-info word for v7+. No-op for v1-6. */
export function placeVersionInfo(matrix: Matrix, version: number): void {
  if (version < 7) return;
  const bits = encodeVersionBits(version);
  const { dim } = matrix;
  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >>> i) & 1) === 1;
    const row = Math.floor(i / 3);
    const col = (i % 3) + dim - 11;
    matrix.set(col, row, bit);
    matrix.set(row, col, bit);
  }
}
