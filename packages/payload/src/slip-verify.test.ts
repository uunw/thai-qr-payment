import { describe, expect, it } from 'vitest';
import { ThaiQRPaymentBuilder } from './builder.js';
import {
  buildSlipVerify,
  buildTrueMoneySlipVerify,
  parseSlipVerify,
  parseTrueMoneySlipVerify,
} from './slip-verify.js';

// Known-good wire-format vectors derived from the EMVCo TLV grammar +
// Slip Verify supplement. Bytes are computed by hand and cross-checked
// against the CRC routine in `crc.ts`.
const SLIP_VERIFY_WIRE = '004000060000010103002021900021231231212000115102TH91049C30';
const TRUEMONEY_WIRE = '00480002010102010203P2P0313TXN00012345670408250120249104b425';

describe('buildSlipVerify — wire-format vectors', () => {
  it('produces the canonical envelope for sendingBank=002 / a 19-char transRef', () => {
    expect(buildSlipVerify({ sendingBank: '002', transRef: '0002123123121200011' })).toBe(
      SLIP_VERIFY_WIRE,
    );
  });

  it('opens with the root template at tag 00', () => {
    const out = buildSlipVerify({ sendingBank: '002', transRef: '0002123123121200011' });
    expect(out.startsWith('0040')).toBe(true);
  });

  it('embeds the country tag 51=TH', () => {
    const out = buildSlipVerify({ sendingBank: '002', transRef: '0002123123121200011' });
    expect(out).toContain('5102TH');
  });

  it('terminates with tag 91 followed by 4 uppercase hex chars', () => {
    const out = buildSlipVerify({ sendingBank: '014', transRef: 'REF-001' });
    expect(out).toMatch(/9104[0-9A-F]{4}$/);
  });

  it('changes the CRC when sendingBank changes', () => {
    const a = buildSlipVerify({ sendingBank: '002', transRef: 'REF' });
    const b = buildSlipVerify({ sendingBank: '003', transRef: 'REF' });
    expect(a.slice(-4)).not.toBe(b.slice(-4));
  });
});

describe('parseSlipVerify — happy paths', () => {
  it('round-trips the canonical envelope', () => {
    expect(parseSlipVerify(SLIP_VERIFY_WIRE)).toEqual({
      sendingBank: '002',
      transRef: '0002123123121200011',
    });
  });

  it('round-trips every build output', () => {
    for (const sample of [
      { sendingBank: '002', transRef: '12345' },
      { sendingBank: '014', transRef: 'REF-001' },
      { sendingBank: '025', transRef: '0002123123121200011' },
    ]) {
      const wire = buildSlipVerify(sample);
      expect(parseSlipVerify(wire)).toEqual(sample);
    }
  });
});

describe('parseSlipVerify — CRC handling', () => {
  it('returns null on tampered checksum', () => {
    const tampered = `${SLIP_VERIFY_WIRE.slice(0, -4)}0000`;
    expect(parseSlipVerify(tampered)).toBeNull();
  });

  it('auto-fixes a CRC with one leading zero dropped', () => {
    // T00000086 → canonical CRC is "0539". Drop the leading '0' → "539".
    const sample = { sendingBank: '014', transRef: 'T00000086' };
    const wire = buildSlipVerify(sample);
    expect(wire.slice(-4)).toBe('0539');
    const truncated = wire.slice(0, -4) + '539';
    expect(parseSlipVerify(truncated)).toEqual(sample);
  });

  it('auto-fixes a CRC with two leading zeros dropped', () => {
    // T00000178 → canonical CRC is "00C3". Drop the two leading '0's → "C3".
    const sample = { sendingBank: '014', transRef: 'T00000178' };
    const wire = buildSlipVerify(sample);
    expect(wire.slice(-4)).toBe('00C3');
    const truncated = wire.slice(0, -4) + 'C3';
    expect(parseSlipVerify(truncated)).toEqual(sample);
  });

  it('auto-fixes a CRC with three leading zeros dropped', () => {
    // T00003342 → canonical CRC is "0004". Drop three leading '0's → "4".
    const sample = { sendingBank: '014', transRef: 'T00003342' };
    const wire = buildSlipVerify(sample);
    expect(wire.slice(-4)).toBe('0004');
    const truncated = wire.slice(0, -4) + '4';
    expect(parseSlipVerify(truncated)).toEqual(sample);
  });

  it('returns null when the CRC tail is more than 4 chars', () => {
    const malformed = `${SLIP_VERIFY_WIRE}00`;
    expect(parseSlipVerify(malformed)).toBeNull();
  });
});

describe('parseSlipVerify — rejects non-slip-verify payloads', () => {
  it('returns null for a regular PromptPay QR (wrong CRC tag — 63 not 91)', () => {
    const promptpay = new ThaiQRPaymentBuilder().promptpay('0812345678').amount(50).build();
    expect(parseSlipVerify(promptpay)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseSlipVerify('')).toBeNull();
  });

  it('returns null when the API-type sub-tag is wrong', () => {
    // Build a payload with a different SUB_API_TYPE value and re-CRC it.
    // This proves the parser rejects payloads that share the envelope but
    // not the slip-verify marker.
    const tm = buildTrueMoneySlipVerify({
      eventType: 'P2P',
      transactionId: 'TXN0001234567',
      date: '25012024',
    });
    expect(parseSlipVerify(tm)).toBeNull();
  });

  it('returns null for garbage with valid length', () => {
    expect(parseSlipVerify('Z'.repeat(60))).toBeNull();
  });
});

describe('buildTrueMoneySlipVerify — wire-format vectors', () => {
  it('produces the canonical envelope for P2P / TXN0001234567 / 25012024', () => {
    expect(
      buildTrueMoneySlipVerify({
        eventType: 'P2P',
        transactionId: 'TXN0001234567',
        date: '25012024',
      }),
    ).toBe(TRUEMONEY_WIRE);
  });

  it('emits a LOWERCASE-hex CRC at tag 91', () => {
    const out = buildTrueMoneySlipVerify({
      eventType: 'P2P',
      transactionId: 'TXN0001234567',
      date: '25012024',
    });
    expect(out).toMatch(/9104[0-9a-f]{4}$/);
    expect(out.slice(-4)).toBe(out.slice(-4).toLowerCase());
  });

  it('opens with the root template at tag 00 carrying both marker sub-tags', () => {
    const out = buildTrueMoneySlipVerify({
      eventType: 'P2P',
      transactionId: 'TXN0001234567',
      date: '25012024',
    });
    expect(out.startsWith('0048')).toBe(true);
    expect(out).toContain('010201');
  });

  it('throws on date with the wrong length', () => {
    expect(() =>
      buildTrueMoneySlipVerify({ eventType: 'P2P', transactionId: 'TXN1', date: '2025' }),
    ).toThrow(/8 chars/);
    expect(() =>
      buildTrueMoneySlipVerify({ eventType: 'P2P', transactionId: 'TXN1', date: '' }),
    ).toThrow(/8 chars/);
    expect(() =>
      buildTrueMoneySlipVerify({
        eventType: 'P2P',
        transactionId: 'TXN1',
        date: '250120240',
      }),
    ).toThrow(/8 chars/);
  });
});

describe('parseTrueMoneySlipVerify — happy paths', () => {
  it('round-trips the canonical envelope', () => {
    expect(parseTrueMoneySlipVerify(TRUEMONEY_WIRE)).toEqual({
      eventType: 'P2P',
      transactionId: 'TXN0001234567',
      date: '25012024',
    });
  });

  it('round-trips every build output', () => {
    for (const sample of [
      { eventType: 'P2P', transactionId: 'TXN0001234567', date: '25012024' },
      { eventType: 'TOPUP', transactionId: 'A1B2C3D4', date: '01012025' },
      { eventType: 'BILL', transactionId: '999', date: '31122026' },
    ]) {
      const wire = buildTrueMoneySlipVerify(sample);
      expect(parseTrueMoneySlipVerify(wire)).toEqual(sample);
    }
  });
});

describe('parseTrueMoneySlipVerify — CRC handling', () => {
  it('accepts an UPPERCASE CRC variant of the same payload', () => {
    const upper = TRUEMONEY_WIRE.slice(0, -4) + TRUEMONEY_WIRE.slice(-4).toUpperCase();
    expect(parseTrueMoneySlipVerify(upper)).toEqual({
      eventType: 'P2P',
      transactionId: 'TXN0001234567',
      date: '25012024',
    });
  });

  it('returns null on tampered checksum', () => {
    const tampered = `${TRUEMONEY_WIRE.slice(0, -4)}0000`;
    expect(parseTrueMoneySlipVerify(tampered)).toBeNull();
  });

  it('auto-fixes a CRC with one leading zero dropped', () => {
    // TXN0000000005 → canonical CRC is "0549". Drop the leading '0' → "549".
    const sample = {
      eventType: 'P2P',
      transactionId: 'TXN0000000005',
      date: '25012024',
    };
    const wire = buildTrueMoneySlipVerify(sample);
    expect(wire.slice(-4)).toBe('0549');
    const truncated = wire.slice(0, -4) + '549';
    expect(parseTrueMoneySlipVerify(truncated)).toEqual(sample);
  });
});

describe('parseTrueMoneySlipVerify — rejects non-truemoney payloads', () => {
  it('returns null for a standard slip-verify payload (missing marker pair)', () => {
    expect(parseTrueMoneySlipVerify(SLIP_VERIFY_WIRE)).toBeNull();
  });

  it('returns null for a regular PromptPay QR', () => {
    const promptpay = new ThaiQRPaymentBuilder().promptpay('0812345678').amount(50).build();
    expect(parseTrueMoneySlipVerify(promptpay)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseTrueMoneySlipVerify('')).toBeNull();
  });
});
