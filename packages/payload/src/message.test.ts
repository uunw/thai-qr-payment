import { describe, expect, it } from 'vitest';
import { decodePersonalMessage, encodePersonalMessage } from './message.js';

describe('encodePersonalMessage', () => {
  it('encodes "Hello" to the spec-derived UTF-16BE hex', () => {
    expect(encodePersonalMessage('Hello')).toBe('00480065006C006C006F');
  });

  it('encodes "Hello World!" to the spec-derived UTF-16BE hex', () => {
    expect(encodePersonalMessage('Hello World!')).toBe(
      '00480065006C006C006F00200057006F0072006C00640021',
    );
  });

  it('encodes the empty string to the empty string', () => {
    expect(encodePersonalMessage('')).toBe('');
  });

  it('uses uppercase hex digits', () => {
    expect(encodePersonalMessage('a')).toBe('0061');
    expect(encodePersonalMessage('AF')).toBe('00410046');
  });
});

describe('decodePersonalMessage', () => {
  it('round-trips ASCII strings', () => {
    for (const sample of ['Hello', 'Hello World!', 'thai-qr-payment', 'A']) {
      expect(decodePersonalMessage(encodePersonalMessage(sample))).toBe(sample);
    }
  });

  it('rejects hex that is not a multiple of 4', () => {
    expect(() => decodePersonalMessage('00')).toThrow(/multiple of 4/);
    expect(() => decodePersonalMessage('00480065006')).toThrow(/multiple of 4/);
  });

  it('decodes the empty string to the empty string', () => {
    expect(decodePersonalMessage('')).toBe('');
  });
});
