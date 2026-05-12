/**
 * Capacity tables + version metadata from ISO/IEC 18004 §6.5 and Annex D.
 *
 * Each version 1-40 has 4 ECC levels (L, M, Q, H). For each (version, ECC)
 * the spec defines:
 *  - Total data codewords (`dataCodewords`)
 *  - Number of error-correction blocks (groups)
 *  - Block sizes within each group
 *
 * The matrix dimension is `(version - 1) * 4 + 21`.
 */

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface BlockSpec {
  /** Total data codewords across all blocks at this (version, ECC). */
  readonly dataCodewords: number;
  /** ECC codewords per block. */
  readonly ecPerBlock: number;
  /** `[count, dataPerBlock]` group entries (1 or 2 groups). */
  readonly groups: ReadonlyArray<readonly [number, number]>;
}

// Format-bit prefix per ECC level (used by format-info encoding too).
export const ECC_BITS: Record<ErrorCorrectionLevel, number> = {
  L: 0b01,
  M: 0b00,
  Q: 0b11,
  H: 0b10,
};

/** Matrix dimension in modules. */
export function moduleCount(version: number): number {
  return (version - 1) * 4 + 21;
}

// Block layout per (version, ECC). Sourced from ISO/IEC 18004:2015 Table 9.
// Compactly encoded as a 2-D lookup keyed by (version, ECC).
//
// Each entry = [dataCodewords, ecPerBlock, groupCount1, dataPerBlock1,
//               groupCount2?, dataPerBlock2?]
//   ecBlocks[version-1][ecc] → row above.
const ECC_INDEX: Record<ErrorCorrectionLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };

// prettier-ignore
const ECC_TABLE: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
  // v1
  [
    [19, 7, 1, 19],
    [16, 10, 1, 16],
    [13, 13, 1, 13],
    [9, 17, 1, 9],
  ],
  // v2
  [
    [34, 10, 1, 34],
    [28, 16, 1, 28],
    [22, 22, 1, 22],
    [16, 28, 1, 16],
  ],
  // v3
  [
    [55, 15, 1, 55],
    [44, 26, 1, 44],
    [34, 18, 2, 17],
    [26, 22, 2, 13],
  ],
  // v4
  [
    [80, 20, 1, 80],
    [64, 18, 2, 32],
    [48, 26, 2, 24],
    [36, 16, 4, 9],
  ],
  // v5
  [
    [108, 26, 1, 108],
    [86, 24, 2, 43],
    [62, 18, 2, 15, 2, 16],
    [46, 22, 2, 11, 2, 12],
  ],
  // v6
  [
    [136, 18, 2, 68],
    [108, 16, 4, 27],
    [76, 24, 4, 19],
    [60, 28, 4, 15],
  ],
  // v7
  [
    [156, 20, 2, 78],
    [124, 18, 4, 31],
    [88, 18, 2, 14, 4, 15],
    [66, 26, 4, 13, 1, 14],
  ],
  // v8
  [
    [194, 24, 2, 97],
    [154, 22, 2, 38, 2, 39],
    [110, 22, 4, 18, 2, 19],
    [86, 26, 4, 14, 2, 15],
  ],
  // v9
  [
    [232, 30, 2, 116],
    [182, 22, 3, 36, 2, 37],
    [132, 20, 4, 16, 4, 17],
    [100, 24, 4, 12, 4, 13],
  ],
  // v10
  [
    [274, 18, 2, 68, 2, 69],
    [216, 26, 4, 43, 1, 44],
    [154, 24, 6, 19, 2, 20],
    [122, 28, 6, 15, 2, 16],
  ],
  // v11
  [
    [324, 20, 4, 81],
    [254, 30, 1, 50, 4, 51],
    [180, 28, 4, 22, 4, 23],
    [140, 24, 3, 12, 8, 13],
  ],
  // v12
  [
    [370, 24, 2, 92, 2, 93],
    [290, 22, 6, 36, 2, 37],
    [206, 26, 4, 20, 6, 21],
    [158, 28, 7, 14, 4, 15],
  ],
  // v13
  [
    [428, 26, 4, 107],
    [334, 22, 8, 37, 1, 38],
    [244, 24, 8, 20, 4, 21],
    [180, 22, 12, 11, 4, 12],
  ],
  // v14
  [
    [461, 30, 3, 115, 1, 116],
    [365, 24, 4, 40, 5, 41],
    [261, 20, 11, 16, 5, 17],
    [197, 24, 11, 12, 5, 13],
  ],
  // v15
  [
    [523, 22, 5, 87, 1, 88],
    [415, 24, 5, 41, 5, 42],
    [295, 30, 5, 24, 7, 25],
    [223, 24, 11, 12, 7, 13],
  ],
  // v16
  [
    [589, 24, 5, 98, 1, 99],
    [453, 28, 7, 45, 3, 46],
    [325, 24, 15, 19, 2, 20],
    [253, 30, 3, 15, 13, 16],
  ],
  // v17
  [
    [647, 28, 1, 107, 5, 108],
    [507, 28, 10, 46, 1, 47],
    [367, 28, 1, 22, 15, 23],
    [283, 28, 2, 14, 17, 15],
  ],
  // v18
  [
    [721, 30, 5, 120, 1, 121],
    [563, 26, 9, 43, 4, 44],
    [397, 28, 17, 22, 1, 23],
    [313, 28, 2, 14, 19, 15],
  ],
  // v19
  [
    [795, 28, 3, 113, 4, 114],
    [627, 26, 3, 44, 11, 45],
    [445, 26, 17, 21, 4, 22],
    [341, 26, 9, 13, 16, 14],
  ],
  // v20
  [
    [861, 28, 3, 107, 5, 108],
    [669, 26, 3, 41, 13, 42],
    [485, 30, 15, 24, 5, 25],
    [385, 28, 15, 15, 10, 16],
  ],
  // v21
  [
    [932, 28, 4, 116, 4, 117],
    [714, 26, 17, 42],
    [512, 28, 17, 22, 6, 23],
    [406, 30, 19, 16, 6, 17],
  ],
  // v22
  [
    [1006, 28, 2, 111, 7, 112],
    [782, 28, 17, 46],
    [568, 30, 7, 24, 16, 25],
    [442, 24, 34, 13],
  ],
  // v23
  [
    [1094, 30, 4, 121, 5, 122],
    [860, 28, 4, 47, 14, 48],
    [614, 30, 11, 24, 14, 25],
    [464, 30, 16, 15, 14, 16],
  ],
  // v24
  [
    [1174, 30, 6, 117, 4, 118],
    [914, 28, 6, 45, 14, 46],
    [664, 30, 11, 24, 16, 25],
    [514, 30, 30, 16, 2, 17],
  ],
  // v25
  [
    [1276, 26, 8, 106, 4, 107],
    [1000, 28, 8, 47, 13, 48],
    [718, 30, 7, 24, 22, 25],
    [538, 30, 22, 15, 13, 16],
  ],
  // v26
  [
    [1370, 28, 10, 114, 2, 115],
    [1062, 28, 19, 46, 4, 47],
    [754, 28, 28, 22, 6, 23],
    [596, 30, 33, 16, 4, 17],
  ],
  // v27
  [
    [1468, 30, 8, 122, 4, 123],
    [1128, 28, 22, 45, 3, 46],
    [808, 30, 8, 23, 26, 24],
    [628, 30, 12, 15, 28, 16],
  ],
  // v28
  [
    [1531, 30, 3, 117, 10, 118],
    [1193, 28, 3, 45, 23, 46],
    [871, 30, 4, 24, 31, 25],
    [661, 30, 11, 15, 31, 16],
  ],
  // v29
  [
    [1631, 30, 7, 116, 7, 117],
    [1267, 28, 21, 45, 7, 46],
    [911, 30, 1, 23, 37, 24],
    [701, 30, 19, 15, 26, 16],
  ],
  // v30
  [
    [1735, 30, 5, 115, 10, 116],
    [1373, 28, 19, 47, 10, 48],
    [985, 30, 15, 24, 25, 25],
    [745, 30, 23, 15, 25, 16],
  ],
  // v31
  [
    [1843, 30, 13, 115, 3, 116],
    [1455, 28, 2, 46, 29, 47],
    [1033, 30, 42, 24, 1, 25],
    [793, 30, 23, 15, 28, 16],
  ],
  // v32
  [
    [1955, 30, 17, 115],
    [1541, 28, 10, 46, 23, 47],
    [1115, 30, 10, 24, 35, 25],
    [845, 30, 19, 15, 35, 16],
  ],
  // v33
  [
    [2071, 30, 17, 115, 1, 116],
    [1631, 28, 14, 46, 21, 47],
    [1171, 30, 29, 24, 19, 25],
    [901, 30, 11, 15, 46, 16],
  ],
  // v34
  [
    [2191, 30, 13, 115, 6, 116],
    [1725, 28, 14, 46, 23, 47],
    [1231, 30, 44, 24, 7, 25],
    [961, 30, 59, 16, 1, 17],
  ],
  // v35
  [
    [2306, 30, 12, 121, 7, 122],
    [1812, 28, 12, 47, 26, 48],
    [1286, 30, 39, 24, 14, 25],
    [986, 30, 22, 15, 41, 16],
  ],
  // v36
  [
    [2434, 30, 6, 121, 14, 122],
    [1914, 28, 6, 47, 34, 48],
    [1354, 30, 46, 24, 10, 25],
    [1054, 30, 2, 15, 64, 16],
  ],
  // v37
  [
    [2566, 30, 17, 122, 4, 123],
    [1992, 28, 29, 46, 14, 47],
    [1426, 30, 49, 24, 10, 25],
    [1096, 30, 24, 15, 46, 16],
  ],
  // v38
  [
    [2702, 30, 4, 122, 18, 123],
    [2102, 28, 13, 46, 32, 47],
    [1502, 30, 48, 24, 14, 25],
    [1142, 30, 42, 15, 32, 16],
  ],
  // v39
  [
    [2812, 30, 20, 117, 4, 118],
    [2216, 28, 40, 47, 7, 48],
    [1582, 30, 43, 24, 22, 25],
    [1222, 30, 10, 15, 67, 16],
  ],
  // v40
  [
    [2956, 30, 19, 118, 6, 119],
    [2334, 28, 18, 47, 31, 48],
    [1666, 30, 34, 24, 34, 25],
    [1276, 30, 20, 15, 61, 16],
  ],
];

/** Look up the block specification for a (version, ECC) pair. */
export function getBlockSpec(version: number, ecc: ErrorCorrectionLevel): BlockSpec {
  const row = ECC_TABLE[version - 1];
  if (!row) throw new RangeError(`Version ${version} out of range (1-40)`);
  const entry = row[ECC_INDEX[ecc]];
  if (!entry) throw new RangeError(`No spec for version ${version} ECC ${ecc}`);
  const dataCodewords = entry[0] ?? 0;
  const ecPerBlock = entry[1] ?? 0;
  const groups: Array<readonly [number, number]> = [];
  for (let i = 2; i < entry.length; i += 2) {
    const count = entry[i] ?? 0;
    const dataPerBlock = entry[i + 1] ?? 0;
    groups.push([count, dataPerBlock]);
  }
  return { dataCodewords, ecPerBlock, groups };
}

/** Total codewords (data + ECC) on the wire for a given version. */
export function totalCodewords(version: number, ecc: ErrorCorrectionLevel): number {
  const spec = getBlockSpec(version, ecc);
  let blocks = 0;
  for (const [count] of spec.groups) blocks += count;
  return spec.dataCodewords + blocks * spec.ecPerBlock;
}

/** Locations of alignment-pattern centres for a given version. */
export function alignmentCentres(version: number): readonly number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const dim = moduleCount(version);
  const last = dim - 7;
  const step = version === 32 ? 26 : 2 * Math.ceil((last - 6) / (2 * (count - 1)));
  const centres: number[] = [6];
  for (let i = count - 1; i > 0; i -= 1) centres.unshift(last - (count - 1 - i) * step);
  centres.shift();
  centres.unshift(6);
  // Deduplicate in case rounding produced a duplicate boundary.
  const unique: number[] = [];
  for (const c of centres) if (!unique.includes(c)) unique.push(c);
  return unique;
}
