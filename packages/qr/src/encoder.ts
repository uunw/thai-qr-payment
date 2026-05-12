/**
 * Top-level QR encoder.
 *
 * Pipeline:
 *  1. Detect the narrowest mode for the input.
 *  2. Find the smallest version that fits the (mode, ECC) bit budget.
 *  3. Pack data → codewords → split into blocks → append Reed-Solomon ECC.
 *  4. Interleave codewords into the final byte stream + remainder bits.
 *  5. Lay down fixed patterns, place data in zigzag, try all 8 masks,
 *     pick the one with the lowest penalty.
 *  6. Embed format-info and (for v7+) version-info, then return.
 */

import { BitBuffer } from './bitbuffer.js';
import { buildBaseMatrix } from './patterns.js';
import { applyMask, MASK_COUNT, scoreMask } from './mask.js';
import { placeData, placeFormatInfo, placeVersionInfo } from './placement.js';
import { dataBitLength, detectMode, emitSegment } from './mode.js';
import { encodeBlock } from './rs.js';
import {
  type BlockSpec,
  type ErrorCorrectionLevel,
  getBlockSpec,
  totalCodewords,
} from './version.js';

export interface EncodeOptions {
  errorCorrectionLevel?: ErrorCorrectionLevel;
  minVersion?: number;
  maxVersion?: number;
  forceMask?: number;
}

export interface QrMatrix {
  readonly size: number;
  readonly modules: boolean[][];
  readonly version: number;
  readonly errorCorrectionLevel: ErrorCorrectionLevel;
  readonly mask: number;
}

/** Pad a partial last codeword with 0 bits, then alternate `0xEC 0x11` filler. */
function padToCapacity(bits: BitBuffer, dataCodewords: number): Uint8Array {
  const target = dataCodewords * 8;
  // Terminator: up to 4 trailing 0 bits.
  const terminator = Math.min(4, target - bits.length);
  if (terminator > 0) bits.push(0, terminator);
  // Pad to byte boundary.
  if (bits.length % 8 !== 0) bits.push(0, 8 - (bits.length % 8));
  // Filler bytes alternate 0xEC / 0x11 per spec until full.
  const bytes = new Uint8Array(dataCodewords);
  const partial = bits.toBytes();
  bytes.set(partial.slice(0, dataCodewords));
  let toggle = false;
  for (let i = partial.length; i < dataCodewords; i += 1) {
    bytes[i] = toggle ? 0x11 : 0xec;
    toggle = !toggle;
  }
  return bytes;
}

/** Split data into ECC blocks and append Reed-Solomon parity to each. */
function buildCodewordBlocks(
  spec: BlockSpec,
  data: Uint8Array,
): {
  dataBlocks: Uint8Array[];
  ecBlocks: Uint8Array[];
} {
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (const [count, perBlock] of spec.groups) {
    for (let i = 0; i < count; i += 1) {
      const block = data.slice(offset, offset + perBlock);
      offset += perBlock;
      dataBlocks.push(block);
      ecBlocks.push(encodeBlock(block, spec.ecPerBlock));
    }
  }
  return { dataBlocks, ecBlocks };
}

/** Interleave data + ECC blocks column-major per ISO/IEC 18004 §7.6. */
function interleave(dataBlocks: Uint8Array[], ecBlocks: Uint8Array[]): Uint8Array {
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  const maxEcLen = Math.max(...ecBlocks.map((b) => b.length));
  const out: number[] = [];
  for (let i = 0; i < maxDataLen; i += 1) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i] ?? 0);
  }
  for (let i = 0; i < maxEcLen; i += 1) {
    for (const block of ecBlocks) if (i < block.length) out.push(block[i] ?? 0);
  }
  return Uint8Array.from(out);
}

/** Select the smallest version that can hold the encoded segment. */
function pickVersion(
  text: string,
  mode: ReturnType<typeof detectMode>,
  ecc: ErrorCorrectionLevel,
  min: number,
  max: number,
): number {
  for (let version = min; version <= max; version += 1) {
    const needBits = dataBitLength(mode, text, version);
    const capacity = getBlockSpec(version, ecc).dataCodewords * 8;
    if (needBits <= capacity) return version;
  }
  throw new RangeError(
    `Input does not fit in versions ${min}-${max} at ECC ${ecc} (${text.length} chars)`,
  );
}

/**
 * Encode `text` as a QR Code matrix.
 *
 * The returned matrix is a square 2-D boolean array (`true` = dark
 * module). Render with any output (SVG, canvas, PNG, terminal).
 */
export function encodeQR(text: string, options: EncodeOptions = {}): QrMatrix {
  const ecc = options.errorCorrectionLevel ?? 'M';
  const minVersion = options.minVersion ?? 1;
  const maxVersion = options.maxVersion ?? 40;

  const mode = detectMode(text);
  const version = pickVersion(text, mode, ecc, minVersion, maxVersion);
  const spec = getBlockSpec(version, ecc);

  // 1) Bit-encode the segment + pad to full data-codeword capacity.
  const bits = new BitBuffer();
  emitSegment(text, mode, version, bits);
  const codewords = padToCapacity(bits, spec.dataCodewords);

  // 2) ECC + interleave into final byte stream.
  const { dataBlocks, ecBlocks } = buildCodewordBlocks(spec, codewords);
  const finalBytes = interleave(dataBlocks, ecBlocks);

  // QR may require a few zero "remainder bits" at the end of the stream.
  const totalBytesNeeded = Math.ceil(
    (totalCodewords(version, ecc) * 8 + REMAINDER_BITS[version]!) / 8,
  );
  const padded = new Uint8Array(totalBytesNeeded);
  padded.set(finalBytes);

  // 3) Build the base matrix and place data, format, version info.
  const base = buildBaseMatrix(version);
  placeData(base, padded);

  // 4) Pick the lowest-penalty mask.
  const snapshot = base.snapshot();
  let bestMask = options.forceMask ?? 0;
  let bestScore = Number.POSITIVE_INFINITY;
  if (options.forceMask == null) {
    for (let mask = 0; mask < MASK_COUNT; mask += 1) {
      base.restore(snapshot);
      placeFormatInfo(base, ecc, mask);
      placeVersionInfo(base, version);
      applyMask(base, mask);
      const score = scoreMask(base);
      if (score < bestScore) {
        bestScore = score;
        bestMask = mask;
      }
    }
  }

  base.restore(snapshot);
  placeFormatInfo(base, ecc, bestMask);
  placeVersionInfo(base, version);
  applyMask(base, bestMask);

  return {
    size: base.dim,
    modules: base.toBooleans(),
    version,
    errorCorrectionLevel: ecc,
    mask: bestMask,
  };
}

// Remainder-bit table per ISO/IEC 18004 §7.7.
const REMAINDER_BITS: Record<number, number> = {
  1: 0,
  2: 7,
  3: 7,
  4: 7,
  5: 7,
  6: 7,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: 0,
  14: 3,
  15: 3,
  16: 3,
  17: 3,
  18: 3,
  19: 3,
  20: 3,
  21: 4,
  22: 4,
  23: 4,
  24: 4,
  25: 4,
  26: 4,
  27: 4,
  28: 3,
  29: 3,
  30: 3,
  31: 3,
  32: 3,
  33: 3,
  34: 3,
  35: 0,
  36: 0,
  37: 0,
  38: 0,
  39: 0,
  40: 0,
};
