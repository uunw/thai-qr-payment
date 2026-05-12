/**
 * CRC-16/CCITT-FALSE — the variant mandated by EMVCo MPM §4 for the
 * trailing checksum tag (poly 0x1021, init 0xFFFF, no reflect, no XOR out).
 *
 * Table-driven implementation: pre-compute the 256-entry lookup at module
 * load, then xor-shift one byte per loop iteration. Roughly 4× faster than
 * the per-bit loop for typical payload sizes (~120-180 chars), and the
 * 512-byte table is dwarfed by the JS function objects around it.
 */

const CRC_TABLE: Uint16Array = (() => {
  const table = new Uint16Array(256);
  for (let byte = 0; byte < 256; byte += 1) {
    let acc = byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      acc = (acc & 0x8000) !== 0 ? ((acc << 1) ^ 0x1021) & 0xffff : (acc << 1) & 0xffff;
    }
    table[byte] = acc;
  }
  return table;
})();

/**
 * Compute the CRC-16/CCITT-FALSE checksum of an ASCII-encoded payload
 * and return it as a 4-character uppercase hex string. The EMVCo spec
 * requires the trailing zero-padding to keep the QR payload length stable.
 */
export function checksum(input: string): string {
  let acc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    const byte = input.charCodeAt(i) & 0xff;
    acc = ((acc << 8) ^ (CRC_TABLE[(acc >> 8) ^ byte] ?? 0)) & 0xffff;
  }
  return acc.toString(16).toUpperCase().padStart(4, '0');
}
