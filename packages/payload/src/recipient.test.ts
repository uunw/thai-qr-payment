import { describe, expect, it } from 'vitest';
import { normaliseRecipient } from './recipient.js';

describe('normaliseRecipient — mobile', () => {
  it('maps a leading-0 phone to 0066xxxxxxxxxx', () => {
    const r = normaliseRecipient('0812345678');
    expect(r.subTag).toBe('01');
    expect(r.value).toBe('0066812345678');
    expect(r.type).toBe('mobile');
  });

  it('zero-pads a 9-digit (no leading 0) input to 13 chars', () => {
    // No leading '0' means the country-code swap is a no-op; we just
    // pad to the 13-char wire width.
    const r = normaliseRecipient('812345678');
    expect(r.value).toHaveLength(13);
    expect(r.value).toBe('0000812345678');
  });

  it('strips dashes', () => {
    expect(normaliseRecipient('081-234-5678').value).toBe('0066812345678');
  });

  it('strips spaces', () => {
    expect(normaliseRecipient('081 234 5678').value).toBe('0066812345678');
  });

  it('strips parentheses', () => {
    expect(normaliseRecipient('(081) 234-5678').value).toBe('0066812345678');
  });

  it('strips plus signs', () => {
    expect(normaliseRecipient('+66 81 234 5678').value).toBe('0066812345678');
  });

  it('strips leading whitespace', () => {
    expect(normaliseRecipient('   0812345678').value).toBe('0066812345678');
  });

  it('strips mixed punctuation', () => {
    expect(normaliseRecipient('+66.81.234.5678').value).toBe('0066812345678');
  });

  it('always emits 13-char wire format', () => {
    expect(normaliseRecipient('0812345678').value).toHaveLength(13);
    expect(normaliseRecipient('0299999999').value).toHaveLength(13);
  });

  it('uses subTag "01" for mobile', () => {
    expect(normaliseRecipient('0812345678').subTag).toBe('01');
  });
});

describe('normaliseRecipient — national ID', () => {
  it('treats 13 digits as national ID by default', () => {
    const r = normaliseRecipient('1234567890123');
    expect(r.subTag).toBe('02');
    expect(r.value).toBe('1234567890123');
    expect(r.type).toBe('nationalId');
  });

  it('strips dashes from a formatted Thai national ID', () => {
    const r = normaliseRecipient('1-2345-67890-12-3');
    expect(r.type).toBe('nationalId');
    expect(r.value).toBe('1234567890123');
  });

  it('strips spaces from a formatted national ID', () => {
    expect(normaliseRecipient('1 2345 67890 12 3').value).toBe('1234567890123');
  });

  it('uses subTag "02" for national ID', () => {
    expect(normaliseRecipient('1234567890123').subTag).toBe('02');
  });
});

describe('normaliseRecipient — e-wallet', () => {
  it('treats 15 digits as e-wallet by default', () => {
    const r = normaliseRecipient('123456789012345');
    expect(r.subTag).toBe('03');
    expect(r.value).toBe('123456789012345');
    expect(r.type).toBe('eWallet');
  });

  it('uses subTag "03" for e-wallet', () => {
    expect(normaliseRecipient('123456789012345').subTag).toBe('03');
  });
});

describe('normaliseRecipient — explicit type override', () => {
  it('lets explicit type override length-based inference (nationalId)', () => {
    const r = normaliseRecipient('1234567890123', 'nationalId');
    expect(r.type).toBe('nationalId');
  });

  it('lets explicit type override length-based inference (eWallet)', () => {
    const r = normaliseRecipient('123456789012345', 'eWallet');
    expect(r.type).toBe('eWallet');
  });

  it('lets mobile be explicit even at 13 digit boundary (truncates instead)', () => {
    // A 13-digit explicit-mobile input gets fed to the mobile formatter
    // which prepends 0066 if leading 0. With 13 digits no 0 prefix, the
    // padding logic keeps it at 13 chars.
    const r = normaliseRecipient('1234567890123', 'mobile');
    expect(r.type).toBe('mobile');
    expect(r.value).toHaveLength(13);
  });
});

describe('normaliseRecipient — error cases', () => {
  it('rejects empty input', () => {
    expect(() => normaliseRecipient('   ')).toThrow(/at least one digit/);
  });

  it('rejects empty string', () => {
    expect(() => normaliseRecipient('')).toThrow(/at least one digit/);
  });

  it('rejects pure punctuation', () => {
    expect(() => normaliseRecipient('---')).toThrow(/at least one digit/);
  });

  it('rejects mismatched length for explicit nationalId', () => {
    expect(() => normaliseRecipient('123', 'nationalId')).toThrow(/13 digits/);
    expect(() => normaliseRecipient('12345678901234', 'nationalId')).toThrow(/13 digits/);
  });

  it('rejects mismatched length for explicit eWallet', () => {
    expect(() => normaliseRecipient('123', 'eWallet')).toThrow(/15 digits/);
    expect(() => normaliseRecipient('1234567890123456', 'eWallet')).toThrow(/15 digits/);
  });

  it('throws RangeError for length mismatches', () => {
    expect(() => normaliseRecipient('123', 'nationalId')).toThrow(RangeError);
    expect(() => normaliseRecipient('123', 'eWallet')).toThrow(RangeError);
  });

  it('throws TypeError for empty input', () => {
    expect(() => normaliseRecipient('')).toThrow(TypeError);
  });
});

describe('normaliseRecipient — boundary cases', () => {
  it('throws for 14 digits with inferred nationalId (length mismatch)', () => {
    // Default inference falls into the nationalId branch (>= 13, < 15),
    // which then strictly requires exactly 13 digits.
    expect(() => normaliseRecipient('12345678901234')).toThrow(/13 digits/);
  });

  it('treats exactly 12 digits as mobile (< 13)', () => {
    const r = normaliseRecipient('123456789012');
    expect(r.type).toBe('mobile');
  });
});
