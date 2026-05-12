/**
 * Format-information and version-information bit strings.
 *
 * Format info encodes (ECC level, mask index) as a 15-bit BCH (15, 5)
 * codeword XOR'd with the spec's fixed mask `0x5412`. Version info
 * encodes the version as an 18-bit BCH (18, 6) codeword for v7+.
 */

import { ECC_BITS, type ErrorCorrectionLevel } from './version.js';

const FORMAT_MASK = 0x5412;
const FORMAT_GENERATOR = 0x537; // 0b10100110111
const VERSION_GENERATOR = 0x1f25;

/** BCH(15,5) encode the (ecc, mask) tuple and XOR with the format mask. */
export function encodeFormatBits(ecc: ErrorCorrectionLevel, mask: number): number {
  const data = ((ECC_BITS[ecc] & 0b11) << 3) | (mask & 0b111);
  let value = data << 10;
  for (let i = 4; i >= 0; i -= 1) {
    if (((value >> (i + 10)) & 1) !== 0) {
      value ^= FORMAT_GENERATOR << i;
    }
  }
  const bch = (data << 10) | (value & 0x3ff);
  return bch ^ FORMAT_MASK;
}

/** BCH(18,6) encode the version number (only used for v7+). */
export function encodeVersionBits(version: number): number {
  let value = version << 12;
  for (let i = 5; i >= 0; i -= 1) {
    if (((value >> (i + 12)) & 1) !== 0) {
      value ^= VERSION_GENERATOR << i;
    }
  }
  return (version << 12) | (value & 0xfff);
}
