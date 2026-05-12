/**
 * Append-only bit buffer used during QR data encoding.
 *
 * QR streams pack each segment's mode indicator, character-count
 * indicator, and payload bits into a continuous bit run that's later
 * sliced into 8-bit codewords. A typed-array-backed buffer keeps the
 * allocations down compared to JS array of booleans.
 */

export class BitBuffer {
  private storage: Uint8Array;
  private bitLength = 0;

  constructor(initialCapacityBits = 256) {
    this.storage = new Uint8Array(Math.ceil(initialCapacityBits / 8));
  }

  get length(): number {
    return this.bitLength;
  }

  /** Push the low `count` bits of `value`, MSB first. */
  push(value: number, count: number): void {
    if (count < 0 || count > 31) {
      throw new RangeError(`Bit width ${count} out of range (1-31)`);
    }
    this.ensureCapacity(this.bitLength + count);
    for (let i = count - 1; i >= 0; i -= 1) {
      const bit = (value >>> i) & 1;
      const byteIdx = this.bitLength >>> 3;
      const bitIdx = 7 - (this.bitLength & 7);
      if (bit === 1) {
        const current = this.storage[byteIdx] ?? 0;
        this.storage[byteIdx] = current | (1 << bitIdx);
      }
      this.bitLength += 1;
    }
  }

  /** Materialise the buffer as a packed byte view (LSB of each byte is the rightmost bit). */
  toBytes(): Uint8Array {
    const byteCount = Math.ceil(this.bitLength / 8);
    return this.storage.slice(0, byteCount);
  }

  private ensureCapacity(neededBits: number): void {
    const neededBytes = Math.ceil(neededBits / 8);
    if (neededBytes <= this.storage.length) return;
    let nextSize = this.storage.length === 0 ? 1 : this.storage.length;
    while (nextSize < neededBytes) nextSize *= 2;
    const expanded = new Uint8Array(nextSize);
    expanded.set(this.storage);
    this.storage = expanded;
  }
}
