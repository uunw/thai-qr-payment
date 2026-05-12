/**
 * Galois field GF(2^8) arithmetic over the QR-spec primitive polynomial
 * 0x11D (binary 100011101) — the same field used by Reed-Solomon error
 * correction throughout ISO/IEC 18004.
 *
 * Lookup tables (`EXP` / `LOG`) trade 512 bytes for constant-time
 * multiplication and inversion. We build them once at module load using
 * the standard alpha-power generator.
 */

const PRIMITIVE = 0x11d;

export const EXP: Uint8Array = new Uint8Array(512);
export const LOG: Uint8Array = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= PRIMITIVE;
  }
  // Mirror the first 255 entries into [255, 510] so callers can compute
  // (LOG[a] + LOG[b]) without modulo.
  for (let i = 255; i < 512; i += 1) {
    EXP[i] = EXP[i - 255] ?? 0;
  }
})();

/** Multiply two field elements. Returns 0 when either operand is 0. */
export function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] ?? 0) + (LOG[b] ?? 0)] ?? 0;
}
