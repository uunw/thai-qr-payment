import { describe, expect, it } from 'vitest';
import { ThaiQrPaymentBuilder } from './builder.js';
import { parsePayload } from './parser.js';

describe('ThaiQrPaymentBuilder — PromptPay mobile', () => {
  it('emits a static QR (no amount) with POI 11', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('0812345678').build();
    expect(payload.startsWith('00020101021129')).toBe(true);
    expect(payload).toContain('5802TH');
    expect(payload).toContain('5303764');
    expect(payload).not.toContain('5404');
    expect(payload).toMatch(/63[0-9]{2}[0-9A-F]{4}$/);
  });

  it('emits a dynamic QR (with amount) with POI 12', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50).build();
    expect(payload.startsWith('00020101021229')).toBe(true);
    expect(payload).toContain('540550');
  });

  it('produces a self-validating CRC', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50).build();
    const parsed = parsePayload(payload);
    expect(parsed.merchant?.kind).toBe('promptpay');
    expect(parsed.amount).toBe(50);
  });

  it('round-trips mobile recipient through parse', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('0812345678').build();
    const parsed = parsePayload(payload);
    expect(parsed.merchant).toMatchObject({
      kind: 'promptpay',
      recipientType: 'mobile',
      recipient: '0812345678',
    });
  });

  it('round-trips national-ID recipient', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('1234567890123').build();
    const parsed = parsePayload(payload);
    expect(parsed.merchant).toMatchObject({
      kind: 'promptpay',
      recipientType: 'nationalId',
      recipient: '1234567890123',
    });
  });

  it('round-trips e-wallet recipient', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('123456789012345').build();
    const parsed = parsePayload(payload);
    expect(parsed.merchant).toMatchObject({
      kind: 'promptpay',
      recipientType: 'eWallet',
      recipient: '123456789012345',
    });
  });

  it('emits PromptPay merchant template tag 29', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('0812345678').build();
    expect(payload).toMatch(/29[0-9]{2}0016A000000677010111/);
  });

  it('overrides type explicitly', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('1234567890123', 'nationalId').build();
    expect(parsePayload(payload).merchant?.kind).toBe('promptpay');
  });
});

describe('ThaiQrPaymentBuilder — BillPayment', () => {
  it('emits tag 30 with biller + references', () => {
    const payload = new ThaiQrPaymentBuilder()
      .billPayment({ billerId: '123456789012345', reference1: 'INV001', reference2: 'CUST42' })
      .amount(250.5)
      .build();
    const parsed = parsePayload(payload);
    expect(parsed.merchant).toMatchObject({
      kind: 'billPayment',
      billerId: '123456789012345',
      reference1: 'INV001',
      reference2: 'CUST42',
    });
    expect(parsed.amount).toBe(250.5);
  });

  it('handles biller-only (no references)', () => {
    const payload = new ThaiQrPaymentBuilder().billPayment({ billerId: '123456789012345' }).build();
    const parsed = parsePayload(payload);
    expect(parsed.merchant?.kind).toBe('billPayment');
    if (parsed.merchant?.kind === 'billPayment') {
      expect(parsed.merchant.billerId).toBe('123456789012345');
      expect(parsed.merchant.reference1).toBeUndefined();
      expect(parsed.merchant.reference2).toBeUndefined();
    }
  });

  it('emits BillPayment GUID A000000677010112', () => {
    const payload = new ThaiQrPaymentBuilder().billPayment({ billerId: '123456789012345' }).build();
    expect(payload).toContain('A000000677010112');
  });

  it('promptpay → billPayment switch clears the PromptPay template', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .billPayment({ billerId: '123456789012345' })
      .build();
    expect(payload).not.toContain('A000000677010111');
    expect(payload).toContain('A000000677010112');
  });

  it('billPayment → promptpay switch clears the BillPayment template', () => {
    const payload = new ThaiQrPaymentBuilder()
      .billPayment({ billerId: '123456789012345' })
      .promptpay('0812345678')
      .build();
    expect(payload).not.toContain('A000000677010112');
    expect(payload).toContain('A000000677010111');
  });
});

describe('ThaiQrPaymentBuilder — merchant info', () => {
  it('truncates merchant name to 25 chars', () => {
    const long = 'A'.repeat(40);
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .merchant({ name: long, city: 'BANGKOK', categoryCode: '5814' })
      .build();
    const parsed = parsePayload(payload);
    expect(parsed.merchantName).toHaveLength(25);
    expect(parsed.merchantCity).toBe('BANGKOK');
    expect(parsed.merchantCategoryCode).toBe('5814');
  });

  it('truncates merchant city to 15 chars', () => {
    const long = 'B'.repeat(40);
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .merchant({ city: long })
      .build();
    expect(parsePayload(payload).merchantCity).toHaveLength(15);
  });

  it('keeps the postal code as-is', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .merchant({ postalCode: '10310' })
      .build();
    expect(parsePayload(payload).postalCode).toBe('10310');
  });

  it('merges merchant info across multiple calls', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .merchant({ name: 'Acme Coffee' })
      .merchant({ city: 'BANGKOK' })
      .build();
    const parsed = parsePayload(payload);
    expect(parsed.merchantName).toBe('Acme Coffee');
    expect(parsed.merchantCity).toBe('BANGKOK');
  });

  it('does not emit merchant fields when unset', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('0812345678').build();
    const parsed = parsePayload(payload);
    expect(parsed.merchantName).toBeUndefined();
    expect(parsed.merchantCity).toBeUndefined();
    expect(parsed.postalCode).toBeUndefined();
    expect(parsed.merchantCategoryCode).toBeUndefined();
  });
});

describe('ThaiQrPaymentBuilder — additional data', () => {
  it('emits additional-data sub-fields', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .additionalData({ billNumber: 'BILL01', terminalLabel: 'T01' })
      .build();
    const parsed = parsePayload(payload);
    expect(parsed.additionalData?.billNumber).toBe('BILL01');
    expect(parsed.additionalData?.terminalLabel).toBe('T01');
  });

  it('emits every additional-data sub-field', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .additionalData({
        billNumber: 'BILL01',
        mobileNumber: '02-123-4567',
        storeLabel: 'STR01',
        loyaltyNumber: 'LOY42',
        referenceLabel: 'REF99',
        customerLabel: 'CUST42',
        terminalLabel: 'T01',
        purposeOfTransaction: 'PURCHASE',
        consumerDataRequest: 'EMAIL',
      })
      .build();
    const parsed = parsePayload(payload);
    expect(parsed.additionalData).toMatchObject({
      billNumber: 'BILL01',
      mobileNumber: '02-123-4567',
      storeLabel: 'STR01',
      loyaltyNumber: 'LOY42',
      referenceLabel: 'REF99',
      customerLabel: 'CUST42',
      terminalLabel: 'T01',
      purposeOfTransaction: 'PURCHASE',
      consumerDataRequest: 'EMAIL',
    });
  });

  it('does not emit tag 62 when all sub-fields are unset', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('0812345678').build();
    expect(parsePayload(payload).additionalData).toBeUndefined();
  });

  it('merges additional data across multiple calls', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .additionalData({ billNumber: 'BILL01' })
      .additionalData({ terminalLabel: 'T01' })
      .build();
    const parsed = parsePayload(payload);
    expect(parsed.additionalData?.billNumber).toBe('BILL01');
    expect(parsed.additionalData?.terminalLabel).toBe('T01');
  });
});

describe('ThaiQrPaymentBuilder — tip policy', () => {
  it('emits tag 55=01 for prompt mode', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(100)
      .tipPolicy({ mode: 'prompt' })
      .build();
    expect(payload).toContain('550201');
  });

  it('emits tags 55=02 + 56 for fixed mode', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(100)
      .tipPolicy({ mode: 'fixed', value: 10 })
      .build();
    expect(payload).toContain('550202');
    expect(payload).toContain('5605');
  });

  it('emits tags 55=03 + 57 for percentage mode', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(100)
      .tipPolicy({ mode: 'percentage', value: 5 })
      .build();
    expect(payload).toContain('550203');
    expect(payload).toContain('5704');
  });

  it('clears tip policy when set to undefined', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(100)
      .tipPolicy({ mode: 'prompt' })
      .tipPolicy(undefined)
      .build();
    expect(payload).not.toContain('550201');
  });

  it('accepts fixed-tip in satang mode', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(100)
      .tipPolicy({ mode: 'fixed', value: 1000, fromSatang: true })
      .build();
    expect(payload).toContain('550202');
  });

  it('throws if fixed-tip is zero', () => {
    expect(() =>
      new ThaiQrPaymentBuilder()
        .promptpay('0812345678')
        .amount(100)
        .tipPolicy({ mode: 'fixed', value: 0 })
        .build(),
    ).toThrow(/Tip fixed amount must be positive/);
  });
});

describe('ThaiQrPaymentBuilder — POI flag', () => {
  it('flips POI to dynamic when amount added', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50).build();
    expect(parsePayload(payload).pointOfInitiation).toBe('dynamic');
  });

  it('flips POI back to static when amount cleared', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(50)
      .amount(undefined)
      .build();
    expect(parsePayload(payload).pointOfInitiation).toBe('static');
  });

  it('honours manual pointOfInitiation override (static)', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(50)
      .pointOfInitiation('static')
      .build();
    expect(parsePayload(payload).pointOfInitiation).toBe('static');
  });

  it('honours manual pointOfInitiation override (dynamic)', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .pointOfInitiation('dynamic')
      .build();
    expect(parsePayload(payload).pointOfInitiation).toBe('dynamic');
  });
});

describe('ThaiQrPaymentBuilder — builder reuse', () => {
  it('rebuilds with updated amount without leaking state', () => {
    const builder = new ThaiQrPaymentBuilder().promptpay('0812345678');
    const first = builder.amount(50).build();
    const second = builder.amount(100).build();
    expect(first).not.toBe(second);
    expect(parsePayload(first).amount).toBe(50);
    expect(parsePayload(second).amount).toBe(100);
  });

  it('reverts to static when amount is cleared', () => {
    const builder = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50);
    const cleared = builder.amount(undefined).build();
    expect(parsePayload(cleared).pointOfInitiation).toBe('static');
    expect(parsePayload(cleared).amount).toBeNull();
  });

  it('two independent builders produce independent output', () => {
    const a = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50).build();
    const b = new ThaiQrPaymentBuilder().promptpay('0911111111').amount(100).build();
    expect(a).not.toBe(b);
    expect(parsePayload(a).amount).toBe(50);
    expect(parsePayload(b).amount).toBe(100);
  });

  it('build() is idempotent on stable state', () => {
    const builder = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50);
    expect(builder.build()).toBe(builder.build());
  });
});

describe('ThaiQrPaymentBuilder — buildWithChecksum / toBytes', () => {
  it('buildWithChecksum returns body, checksum, and full payload', () => {
    const builder = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50);
    const { body, checksum, payload } = builder.buildWithChecksum();
    expect(body + checksum).toBe(payload);
    expect(checksum).toMatch(/^[0-9A-F]{4}$/);
    expect(body.endsWith('6304')).toBe(true);
  });

  it('toBytes returns a Uint8Array matching the payload length', () => {
    const builder = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50);
    const bytes = builder.toBytes();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(builder.build().length);
  });

  it('toBytes maps each ASCII char to its code', () => {
    const builder = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50);
    const bytes = builder.toBytes();
    const text = builder.build();
    for (let i = 0; i < text.length; i += 1) {
      expect(bytes[i]).toBe(text.charCodeAt(i) & 0xff);
    }
  });
});

describe('ThaiQrPaymentBuilder — tag ordering', () => {
  it('emits tags in ascending order', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(50)
      .merchant({ name: 'Acme', city: 'BANGKOK', categoryCode: '5814', postalCode: '10310' })
      .additionalData({ billNumber: 'BILL01' })
      .build();

    const tags: string[] = [];
    let i = 0;
    while (i + 4 <= payload.length) {
      const tag = payload.slice(i, i + 2);
      const len = Number.parseInt(payload.slice(i + 2, i + 4), 10);
      tags.push(tag);
      i += 4 + len;
      if (tag === '63') break; // CRC tag is last
    }
    for (let k = 1; k < tags.length; k += 1) {
      expect(tags[k - 1]! <= tags[k]!).toBe(true);
    }
  });
});

describe('ThaiQrPaymentBuilder — CRC integrity', () => {
  it('appends exactly 8 chars for CRC tag + length + value', () => {
    const builder = new ThaiQrPaymentBuilder().promptpay('0812345678');
    const payload = builder.build();
    expect(payload.endsWith(payload.slice(-8))).toBe(true);
    expect(payload.slice(-8, -4)).toBe('6304');
  });

  it('changes the CRC when any field changes', () => {
    const a = new ThaiQrPaymentBuilder().promptpay('0812345678').build();
    const b = new ThaiQrPaymentBuilder().promptpay('0812345679').build();
    expect(a.slice(-4)).not.toBe(b.slice(-4));
  });

  it('changes the CRC when amount changes', () => {
    const a = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(50).build();
    const b = new ThaiQrPaymentBuilder().promptpay('0812345678').amount(100).build();
    expect(a.slice(-4)).not.toBe(b.slice(-4));
  });
});

describe('ThaiQrPaymentBuilder — combined real-world flows', () => {
  it('builds a complete dynamic merchant payment QR', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(120.5)
      .merchant({ name: 'Acme Coffee', city: 'BANGKOK', categoryCode: '5814' })
      .additionalData({ billNumber: 'INV-2026-001' })
      .tipPolicy({ mode: 'prompt' })
      .build();
    const parsed = parsePayload(payload);
    expect(parsed.amount).toBe(120.5);
    expect(parsed.merchantName).toBe('Acme Coffee');
    expect(parsed.merchantCity).toBe('BANGKOK');
    expect(parsed.merchantCategoryCode).toBe('5814');
    expect(parsed.additionalData?.billNumber).toBe('INV-2026-001');
  });

  it('builds a static QR with no amount and no merchant info', () => {
    const payload = new ThaiQrPaymentBuilder().promptpay('0812345678').build();
    const parsed = parsePayload(payload);
    expect(parsed.amount).toBeNull();
    expect(parsed.pointOfInitiation).toBe('static');
    expect(parsed.merchant?.kind).toBe('promptpay');
  });
});
