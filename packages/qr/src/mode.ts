/**
 * Encoding mode detection + bit emission for QR data segments.
 *
 * We support the three modes that matter for Thai QR Payment:
 *  - **Numeric** (3 chars → 10 bits): for amount-only payloads
 *  - **Alphanumeric** (2 chars → 11 bits): the EMVCo payload character
 *    set fits entirely here ([0-9A-Z $%*+-./:])
 *  - **Byte** (1 char → 8 bits): fallback for arbitrary text
 *
 * Mode indicators are 4-bit constants prefixed to each segment.
 */

import type { BitBuffer } from './bitbuffer.js';

export type EncodingMode = 'numeric' | 'alphanumeric' | 'byte';

export const MODE_INDICATOR: Record<EncodingMode, number> = {
  numeric: 0b0001,
  alphanumeric: 0b0010,
  byte: 0b0100,
};

const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

/** Reverse-lookup map for alphanumeric encoding. */
const ALPHANUMERIC_INDEX: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  for (let i = 0; i < ALPHANUMERIC_CHARS.length; i += 1) {
    map.set(ALPHANUMERIC_CHARS[i]!, i);
  }
  return map;
})();

/** Width of the character-count indicator (depends on mode + version range). */
export function charCountBits(mode: EncodingMode, version: number): number {
  if (version <= 9) {
    return mode === 'numeric' ? 10 : mode === 'alphanumeric' ? 9 : 8;
  }
  if (version <= 26) {
    return mode === 'numeric' ? 12 : mode === 'alphanumeric' ? 11 : 16;
  }
  return mode === 'numeric' ? 14 : mode === 'alphanumeric' ? 13 : 16;
}

const DIGITS_RE = /^[0-9]+$/;
const ALPHANUM_RE = /^[0-9A-Z $%*+\-./:]+$/;

/** Detect the narrowest mode that can encode the entire input. */
export function detectMode(text: string): EncodingMode {
  if (DIGITS_RE.test(text)) return 'numeric';
  if (ALPHANUM_RE.test(text)) return 'alphanumeric';
  return 'byte';
}

/** Bit length of the encoded payload (mode indicator + counter + data). */
export function dataBitLength(mode: EncodingMode, text: string, version: number): number {
  const header = 4 + charCountBits(mode, version);
  switch (mode) {
    case 'numeric': {
      const full = Math.floor(text.length / 3);
      const remainder = text.length - full * 3;
      const tail = remainder === 0 ? 0 : remainder === 1 ? 4 : 7;
      return header + full * 10 + tail;
    }
    case 'alphanumeric': {
      const pairs = Math.floor(text.length / 2);
      const remainder = text.length - pairs * 2;
      return header + pairs * 11 + (remainder === 0 ? 0 : 6);
    }
    case 'byte':
      return header + utf8Length(text) * 8;
  }
}

function utf8Length(text: string): number {
  // Most Thai QR payloads are ASCII; this branch keeps correctness for
  // hypothetical UTF-8 byte-mode segments without paying for a full
  // TextEncoder allocation on the hot path.
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) count += 1;
    else if (code < 0x800) count += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      count += 4;
      i += 1; // surrogate pair
    } else count += 3;
  }
  return count;
}

/** Emit a numeric segment. */
function emitNumeric(text: string, bits: BitBuffer): void {
  let i = 0;
  while (i + 3 <= text.length) {
    const triple = Number.parseInt(text.slice(i, i + 3), 10);
    bits.push(triple, 10);
    i += 3;
  }
  const remainder = text.length - i;
  if (remainder === 2) bits.push(Number.parseInt(text.slice(i), 10), 7);
  else if (remainder === 1) bits.push(Number.parseInt(text.slice(i), 10), 4);
}

/** Emit an alphanumeric segment. */
function emitAlphanumeric(text: string, bits: BitBuffer): void {
  let i = 0;
  while (i + 2 <= text.length) {
    const high = ALPHANUMERIC_INDEX.get(text[i]!);
    const low = ALPHANUMERIC_INDEX.get(text[i + 1]!);
    if (high == null || low == null) throw new TypeError(`Char outside alphanumeric set at ${i}`);
    bits.push(high * 45 + low, 11);
    i += 2;
  }
  if (i < text.length) {
    const value = ALPHANUMERIC_INDEX.get(text[i]!);
    if (value == null) throw new TypeError(`Char outside alphanumeric set at ${i}`);
    bits.push(value, 6);
  }
}

/** Emit a byte segment (UTF-8 encoded). */
function emitByte(text: string, bits: BitBuffer): void {
  const encoded =
    typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text) : utf8EncodeFallback(text);
  for (let i = 0; i < encoded.length; i += 1) {
    bits.push(encoded[i] ?? 0, 8);
  }
}

function utf8EncodeFallback(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i += 1;
      }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

/** Append the full segment (mode + count + data) to the bit buffer. */
export function emitSegment(
  text: string,
  mode: EncodingMode,
  version: number,
  bits: BitBuffer,
): void {
  bits.push(MODE_INDICATOR[mode], 4);
  bits.push(text.length, charCountBits(mode, version));
  switch (mode) {
    case 'numeric':
      emitNumeric(text, bits);
      return;
    case 'alphanumeric':
      emitAlphanumeric(text, bits);
      return;
    case 'byte':
      emitByte(text, bits);
      return;
  }
}
