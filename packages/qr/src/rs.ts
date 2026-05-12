/**
 * Reed-Solomon error correction over GF(2^8).
 *
 * QR uses a punctured Reed-Solomon code with the generator polynomial
 *   g(x) = ∏ (x − α^i) for i ∈ [0, ecLen)
 * built incrementally from the alpha exponents in `gf.EXP`. The encoder
 * computes the codeword remainder via long division and appends it to
 * the data stream.
 */

import { EXP, LOG, mul } from './gf.js';

/** Pre-compute the RS generator polynomial of the requested length. */
function buildGenerator(ecLen: number): Uint8Array {
  // Start with the constant polynomial g(x) = 1.
  let poly = new Uint8Array([1]);
  for (let i = 0; i < ecLen; i += 1) {
    // Multiply by (x − α^i): new coefficients have length+1 entries.
    const next = new Uint8Array(poly.length + 1);
    const alphaI = EXP[i] ?? 0;
    for (let j = 0; j < poly.length; j += 1) {
      const coeff = poly[j] ?? 0;
      const carry = next[j] ?? 0;
      next[j] = carry ^ coeff;
      const tail = next[j + 1] ?? 0;
      next[j + 1] = tail ^ mul(coeff, alphaI);
    }
    poly = next;
  }
  return poly;
}

/**
 * Encode a data block with `ecLen` ECC codewords appended. The output
 * is `data.length + ecLen` bytes long and matches the per-block format
 * used by QR's interleaved data layout.
 */
export function encodeBlock(data: Uint8Array, ecLen: number): Uint8Array {
  const generator = buildGenerator(ecLen);
  const buffer = new Uint8Array(data.length + ecLen);
  buffer.set(data, 0);

  for (let i = 0; i < data.length; i += 1) {
    const lead = buffer[i] ?? 0;
    if (lead === 0) continue;
    const leadLog = LOG[lead] ?? 0;
    for (let j = 0; j < generator.length; j += 1) {
      const coeff = generator[j] ?? 0;
      if (coeff === 0) continue;
      const slot = buffer[i + j] ?? 0;
      buffer[i + j] = slot ^ (EXP[leadLog + (LOG[coeff] ?? 0)] ?? 0);
    }
  }

  return buffer.slice(data.length);
}
