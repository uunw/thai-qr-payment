/**
 * Fixed-pattern placement: finder, separator, alignment, timing, dark
 * module, format-info reservation, and version-info reservation.
 *
 * Each routine reserves the modules it touches so the data placement
 * pass can skip over them.
 */

import { Matrix } from './matrix.js';
import { alignmentCentres, moduleCount } from './version.js';

function placeFinder(m: Matrix, originX: number, originY: number): void {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const x = originX + dx;
      const y = originY + dy;
      if (x < 0 || y < 0 || x >= m.dim || y >= m.dim) continue;
      const onEdge = dx === 0 || dx === 6 || dy === 0 || dy === 6;
      const insideCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      const isBorder = dx === -1 || dx === 7 || dy === -1 || dy === 7;
      const dark = !isBorder && (onEdge || insideCore);
      m.fillReserved(x, y, dark);
    }
  }
}

function placeAlignment(m: Matrix, cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const dark = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
      m.fillReserved(cx + dx, cy + dy, dark);
    }
  }
}

function placeTimingPatterns(m: Matrix): void {
  for (let i = 8; i < m.dim - 8; i += 1) {
    const dark = i % 2 === 0;
    m.fillReserved(i, 6, dark);
    m.fillReserved(6, i, dark);
  }
}

function placeDarkModule(m: Matrix, version: number): void {
  // The dark module is the single forced-on module at (8, 4*v + 9).
  m.fillReserved(8, 4 * version + 9, true);
}

function reserveFormatInfo(m: Matrix): void {
  const dim = m.dim;
  // Around top-left finder
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) m.reserve(i, 8);
    if (i !== 6) m.reserve(8, i);
  }
  // Bottom-left + top-right format strips
  for (let i = 0; i < 7; i += 1) m.reserve(8, dim - 1 - i);
  for (let i = 0; i < 8; i += 1) m.reserve(dim - 1 - i, 8);
}

function reserveVersionInfo(m: Matrix, version: number): void {
  if (version < 7) return;
  const dim = m.dim;
  for (let row = 0; row < 6; row += 1) {
    for (let col = dim - 11; col < dim - 8; col += 1) {
      m.reserve(col, row);
      m.reserve(row, col);
    }
  }
}

/**
 * Lay down every fixed pattern for the given version. Returns the
 * matrix in a state where the only unreserved modules are those
 * available for data placement (still empty / 0).
 */
export function buildBaseMatrix(version: number): Matrix {
  const dim = moduleCount(version);
  const m = new Matrix(dim);

  placeFinder(m, 0, 0);
  placeFinder(m, dim - 7, 0);
  placeFinder(m, 0, dim - 7);

  for (const cx of alignmentCentres(version)) {
    for (const cy of alignmentCentres(version)) {
      // Skip alignment patterns that overlap finder patterns.
      const onTopLeftFinder = cx <= 8 && cy <= 8;
      const onTopRightFinder = cx >= dim - 9 && cy <= 8;
      const onBottomLeftFinder = cx <= 8 && cy >= dim - 9;
      if (onTopLeftFinder || onTopRightFinder || onBottomLeftFinder) continue;
      placeAlignment(m, cx, cy);
    }
  }

  placeTimingPatterns(m);
  placeDarkModule(m, version);
  reserveFormatInfo(m);
  reserveVersionInfo(m, version);

  return m;
}
