/**
 * Module-grid layout for a single QR code.
 *
 * Wraps a `Uint8Array` of size `dim*dim` storing one bit per module.
 * A parallel "reserved" mask tracks which modules belong to fixed
 * patterns (finders, alignment, timing, format, version) so the data
 * placement skips them during the zigzag walk.
 */

const DARK = 1;
const LIGHT = 0;
const RESERVED = 1;
const FREE = 0;

export class Matrix {
  readonly dim: number;
  private readonly modules: Uint8Array;
  private readonly reserved: Uint8Array;

  constructor(dim: number) {
    this.dim = dim;
    this.modules = new Uint8Array(dim * dim);
    this.reserved = new Uint8Array(dim * dim);
  }

  get(x: number, y: number): boolean {
    return (this.modules[y * this.dim + x] ?? 0) === DARK;
  }

  set(x: number, y: number, dark: boolean): void {
    this.modules[y * this.dim + x] = dark ? DARK : LIGHT;
  }

  reserve(x: number, y: number): void {
    this.reserved[y * this.dim + x] = RESERVED;
  }

  isReserved(x: number, y: number): boolean {
    return (this.reserved[y * this.dim + x] ?? 0) === RESERVED;
  }

  /** Export as a 2-D boolean array; useful for renderers. */
  toBooleans(): boolean[][] {
    const rows: boolean[][] = [];
    for (let y = 0; y < this.dim; y += 1) {
      const row: boolean[] = Array.from({ length: this.dim }, () => false);
      for (let x = 0; x < this.dim; x += 1) {
        row[x] = this.get(x, y);
      }
      rows.push(row);
    }
    return rows;
  }

  /** Snapshot just the data-module bits (used during mask scoring). */
  snapshot(): Uint8Array {
    return this.modules.slice();
  }

  restore(snapshot: Uint8Array): void {
    this.modules.set(snapshot);
  }

  /** True if a module at (x, y) is on the free-data path. */
  isFree(x: number, y: number): boolean {
    return !this.isReserved(x, y);
  }

  fillReserved(x: number, y: number, dark: boolean): void {
    this.set(x, y, dark);
    this.reserve(x, y);
  }
}

export { DARK, LIGHT, RESERVED, FREE };
