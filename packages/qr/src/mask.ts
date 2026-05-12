/**
 * Mask pattern selection + penalty scoring per ISO/IEC 18004 §7.8.
 *
 * QR defines 8 mask patterns. After data placement, each candidate mask
 * is applied to the free-data modules and scored on four rule
 * categories; the lowest-scoring mask wins.
 */

import type { Matrix } from './matrix.js';

const MASK_PREDICATES: ReadonlyArray<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Toggle every free-data module that matches the mask predicate. */
export function applyMask(matrix: Matrix, maskIndex: number): void {
  const predicate = MASK_PREDICATES[maskIndex];
  if (!predicate) throw new RangeError(`Mask index ${maskIndex} out of range`);
  for (let y = 0; y < matrix.dim; y += 1) {
    for (let x = 0; x < matrix.dim; x += 1) {
      if (matrix.isReserved(x, y)) continue;
      if (predicate(x, y)) matrix.set(x, y, !matrix.get(x, y));
    }
  }
}

// ── Penalty rules ─────────────────────────────────────────────────────

/** Rule 1: penalty for consecutive runs of same-colour modules. */
function penaltyRunLength(matrix: Matrix): number {
  let total = 0;
  const { dim } = matrix;
  for (let y = 0; y < dim; y += 1) {
    let runColor = matrix.get(0, y);
    let runLen = 1;
    for (let x = 1; x < dim; x += 1) {
      const c = matrix.get(x, y);
      if (c === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) total += runLen - 2;
        runColor = c;
        runLen = 1;
      }
    }
    if (runLen >= 5) total += runLen - 2;
  }
  for (let x = 0; x < dim; x += 1) {
    let runColor = matrix.get(x, 0);
    let runLen = 1;
    for (let y = 1; y < dim; y += 1) {
      const c = matrix.get(x, y);
      if (c === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) total += runLen - 2;
        runColor = c;
        runLen = 1;
      }
    }
    if (runLen >= 5) total += runLen - 2;
  }
  return total;
}

/** Rule 2: penalty for 2×2 blocks of same-colour modules. */
function penaltyBlocks(matrix: Matrix): number {
  let count = 0;
  const { dim } = matrix;
  for (let y = 0; y < dim - 1; y += 1) {
    for (let x = 0; x < dim - 1; x += 1) {
      const c = matrix.get(x, y);
      if (
        matrix.get(x + 1, y) === c &&
        matrix.get(x, y + 1) === c &&
        matrix.get(x + 1, y + 1) === c
      ) {
        count += 1;
      }
    }
  }
  return count * 3;
}

/** Rule 3: penalty for finder-like patterns 10111010000 / 00001011101. */
function penaltyFinderLike(matrix: Matrix): number {
  const { dim } = matrix;
  let count = 0;
  const pattern1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const pattern2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const matches = (line: number[]): number => {
    let hits = 0;
    for (let i = 0; i <= line.length - 11; i += 1) {
      let ok1 = true;
      let ok2 = true;
      for (let j = 0; j < 11; j += 1) {
        if (line[i + j] !== pattern1[j]) ok1 = false;
        if (line[i + j] !== pattern2[j]) ok2 = false;
        if (!ok1 && !ok2) break;
      }
      if (ok1) hits += 1;
      if (ok2) hits += 1;
    }
    return hits;
  };
  for (let y = 0; y < dim; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < dim; x += 1) row.push(matrix.get(x, y) ? 1 : 0);
    count += matches(row);
  }
  for (let x = 0; x < dim; x += 1) {
    const col: number[] = [];
    for (let y = 0; y < dim; y += 1) col.push(matrix.get(x, y) ? 1 : 0);
    count += matches(col);
  }
  return count * 40;
}

/** Rule 4: penalty for dark/light imbalance. */
function penaltyBalance(matrix: Matrix): number {
  let dark = 0;
  const total = matrix.dim * matrix.dim;
  for (let y = 0; y < matrix.dim; y += 1) {
    for (let x = 0; x < matrix.dim; x += 1) {
      if (matrix.get(x, y)) dark += 1;
    }
  }
  const ratio = (dark * 100) / total;
  const off = Math.floor(Math.abs(ratio - 50) / 5);
  return off * 10;
}

/** Total penalty (lower is better). */
export function scoreMask(matrix: Matrix): number {
  return (
    penaltyRunLength(matrix) +
    penaltyBlocks(matrix) +
    penaltyFinderLike(matrix) +
    penaltyBalance(matrix)
  );
}

export const MASK_COUNT = MASK_PREDICATES.length;
