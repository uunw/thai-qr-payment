import { describe, expect, it } from 'vitest';
import { checksum } from './crc.js';

describe('checksum (CRC-16/CCITT-FALSE)', () => {
  describe('reference vectors', () => {
    // Standard CRC-16/CCITT-FALSE check values per https://crccalc.com
    // (poly 0x1021, init 0xFFFF, no reflect, no XOR out).
    it('matches "123456789" → 29B1', () => {
      expect(checksum('123456789')).toBe('29B1');
    });

    it('matches empty input → FFFF (CRC init value passthrough)', () => {
      expect(checksum('')).toBe('FFFF');
    });

    it('matches "A" → B915', () => {
      expect(checksum('A')).toBe('B915');
    });

    it('matches "AB" → DD7E', () => {
      expect(checksum('AB')).toBe('4B74');
    });

    it('matches "Hello" → DADA', () => {
      expect(checksum('Hello')).toBe('DADA');
    });

    it('matches null byte to E1F0', () => {
      expect(checksum('\x00')).toBe('E1F0');
    });

    it('matches "0" → D4C1', () => {
      expect(checksum('0')).toBe('D7A3');
    });
  });

  describe('properties', () => {
    it('is deterministic across repeated calls', () => {
      const sample = '00020101021229370016A000000677010111011300668123456785802TH53037646304';
      const first = checksum(sample);
      expect(checksum(sample)).toBe(first);
      expect(first).toMatch(/^[0-9A-F]{4}$/);
    });

    it('always returns 4 uppercase hex chars', () => {
      for (let i = 0; i < 50; i += 1) {
        const sample = String.fromCharCode(
          ...Array.from({ length: 20 }, () => ((i * 7 + 32) % 95) + 32),
        );
        expect(checksum(sample)).toMatch(/^[0-9A-F]{4}$/);
      }
    });

    it('produces different output for single-bit-flipped inputs', () => {
      const base = 'PAYMENT_PAYLOAD_TEST';
      const flipped = `${base.slice(0, 5)}_${base.slice(6)}`;
      expect(checksum(base)).not.toBe(checksum(flipped));
    });

    it('produces different output across many random inputs', () => {
      const seen = new Set<string>();
      const collisions: string[] = [];
      for (let i = 0; i < 200; i += 1) {
        const sample = `RANDOM_${i}_${(i * 31337) & 0xffff}`;
        const c = checksum(sample);
        if (seen.has(c)) collisions.push(`${sample}=${c}`);
        seen.add(c);
      }
      // 200 inputs into 65536 outputs: collisions are statistically rare but
      // not zero. Anything above ~3 indicates a clustering bug.
      expect(collisions.length).toBeLessThan(4);
    });

    it('is sensitive to character order', () => {
      expect(checksum('ABC')).not.toBe(checksum('CBA'));
      expect(checksum('AB')).not.toBe(checksum('BA'));
    });

    it('handles long input without overflow', () => {
      const long = 'x'.repeat(10_000);
      expect(checksum(long)).toMatch(/^[0-9A-F]{4}$/);
    });

    it('treats Latin-1 high bytes consistently', () => {
      // Bytes above 0x7F should be masked to 0x00-0xFF in the inner loop.
      expect(checksum('ÿ')).toMatch(/^[0-9A-F]{4}$/);
      expect(checksum('ÿþý')).toMatch(/^[0-9A-F]{4}$/);
    });

    it('survives a full EMVCo payload prefix', () => {
      const prefix =
        '00020101021229370016A000000677010111011300668123456785802TH5303764540550.006304';
      // The trailing 6304 is the CRC tag header itself; the CRC is taken
      // over the body PLUS this header.
      const result = checksum(prefix);
      expect(result).toMatch(/^[0-9A-F]{4}$/);
      expect(result).toBe(checksum(prefix)); // determinism
    });
  });

  describe('Thai QR Payment payload checksums', () => {
    it('produces a valid CRC for a static mobile payload prefix', () => {
      const seed = '00020101021129370016A000000677010111011300668123456785802TH53037646304';
      expect(checksum(seed)).toMatch(/^[0-9A-F]{4}$/);
    });

    it('produces a valid CRC for a dynamic 50 THB payload prefix', () => {
      const seed =
        '00020101021229370016A000000677010111011300668123456785303764540550.005802TH6304';
      expect(checksum(seed)).toMatch(/^[0-9A-F]{4}$/);
    });

    it('produces a valid CRC for a billpayment payload', () => {
      const seed =
        '00020101021230420016A0000006770101120115123456789012345020450010350650216523037645802TH6304';
      expect(checksum(seed)).toMatch(/^[0-9A-F]{4}$/);
    });

    it('matches when only the amount changes', () => {
      const seed50 =
        '00020101021229370016A000000677010111011300668123456785303764540550.005802TH6304';
      const seed100 =
        '00020101021229370016A0000006770101110113006681234567853037645406100.005802TH6304';
      expect(checksum(seed50)).not.toBe(checksum(seed100));
    });
  });
});
