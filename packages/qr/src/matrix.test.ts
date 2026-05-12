import { describe, expect, it } from 'vitest';
import { Matrix } from './matrix.js';

describe('Matrix', () => {
  it('initialises with the given dimension', () => {
    const m = new Matrix(21);
    expect(m.dim).toBe(21);
  });

  it('every module starts light + unreserved', () => {
    const m = new Matrix(21);
    for (let y = 0; y < 21; y += 1) {
      for (let x = 0; x < 21; x += 1) {
        expect(m.get(x, y)).toBe(false);
        expect(m.isReserved(x, y)).toBe(false);
        expect(m.isFree(x, y)).toBe(true);
      }
    }
  });

  it('set + get round-trip', () => {
    const m = new Matrix(21);
    m.set(5, 7, true);
    expect(m.get(5, 7)).toBe(true);
    expect(m.get(7, 5)).toBe(false);
    m.set(5, 7, false);
    expect(m.get(5, 7)).toBe(false);
  });

  it('reserve marks a module as not free', () => {
    const m = new Matrix(21);
    m.reserve(3, 4);
    expect(m.isReserved(3, 4)).toBe(true);
    expect(m.isFree(3, 4)).toBe(false);
  });

  it('fillReserved sets value AND reserves', () => {
    const m = new Matrix(21);
    m.fillReserved(2, 3, true);
    expect(m.get(2, 3)).toBe(true);
    expect(m.isReserved(2, 3)).toBe(true);
  });

  it('toBooleans returns dim × dim matrix', () => {
    const m = new Matrix(21);
    m.set(0, 0, true);
    m.set(20, 20, true);
    const arr = m.toBooleans();
    expect(arr.length).toBe(21);
    expect(arr[0]?.length).toBe(21);
    expect(arr[0]?.[0]).toBe(true);
    expect(arr[20]?.[20]).toBe(true);
    expect(arr[10]?.[10]).toBe(false);
  });

  it('snapshot + restore round-trip', () => {
    const m = new Matrix(21);
    m.set(5, 5, true);
    m.set(10, 10, true);
    const snap = m.snapshot();
    m.set(5, 5, false);
    m.set(15, 15, true);
    m.restore(snap);
    expect(m.get(5, 5)).toBe(true);
    expect(m.get(10, 10)).toBe(true);
    expect(m.get(15, 15)).toBe(false);
  });

  it('snapshot is independent of subsequent edits', () => {
    const m = new Matrix(21);
    m.set(0, 0, true);
    const snap = m.snapshot();
    m.set(0, 0, false);
    expect(snap[0]).toBe(1);
  });

  it('handles a large matrix (v40, 177×177)', () => {
    const m = new Matrix(177);
    expect(m.dim).toBe(177);
    m.set(176, 176, true);
    expect(m.get(176, 176)).toBe(true);
  });
});
