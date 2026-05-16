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

describe('ThaiQrPaymentBuilder — TrueMoney Wallet', () => {
  it('emits a static TrueMoney QR (no amount) with the spec-derived wire bytes', () => {
    const payload = new ThaiQrPaymentBuilder().trueMoney('0801111111').build();
    expect(payload).toBe(
      '00020101021129390016A000000677010111031514000080111111153037645802TH63047C0F',
    );
  });

  it('emits a dynamic TrueMoney QR (with amount) — POI flips to 12', () => {
    const payload = new ThaiQrPaymentBuilder().trueMoney('0801111111', { amount: 10 }).build();
    expect(payload.startsWith('00020101021229')).toBe(true);
    expect(payload).toContain('540510.00');
  });

  it('emits tag 29 with the literal "14" prefix on sub-tag 03', () => {
    const payload = new ThaiQrPaymentBuilder().trueMoney('0801111111').build();
    expect(payload).toContain('0315140000801111111');
  });

  it('pads a short mobile to the 15-char wire width', () => {
    const payload = new ThaiQrPaymentBuilder().trueMoney('801111111').build();
    // 9-digit input → padded to 13 in the wire value → final wire value
    // is '14' + '0000801111111' = '140000801111111'.
    expect(payload).toContain('0315140000801111111');
  });

  it('strips non-digits from the input mobile', () => {
    const payload = new ThaiQrPaymentBuilder().trueMoney('080-111-1111').build();
    expect(payload).toContain('0315140000801111111');
  });

  it('appends tag 81 when a personal message is supplied', () => {
    const payload = new ThaiQrPaymentBuilder()
      .trueMoney('0801111111', { message: 'Hello' })
      .build();
    // "Hello" → 5 UTF-16BE code units → 20 hex chars → length header "20".
    expect(payload).toContain('812000480065006C006C006F');
  });

  it('encodes "Hello World!" personal message to the spec-derived hex', () => {
    const payload = new ThaiQrPaymentBuilder()
      .trueMoney('0801111111', { amount: 10, message: 'Hello World!' })
      .build();
    expect(payload).toContain('814800480065006C006C006F00200057006F0072006C00640021');
  });

  it('rejects an empty mobile number', () => {
    expect(() => new ThaiQrPaymentBuilder().trueMoney('---')).toThrow(/at least one digit/);
  });

  it('rejects a mobile number longer than 13 digits', () => {
    expect(() => new ThaiQrPaymentBuilder().trueMoney('1234567890123456')).toThrow(/too long/);
  });

  it('switching from PromptPay to TrueMoney clears the previous e-wallet template', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .trueMoney('0801111111')
      .build();
    expect(payload).toContain('0315140000801111111');
    expect(payload).not.toContain('0066812345678');
  });

  it('switching from TrueMoney to BillPayment swaps the merchant template', () => {
    const payload = new ThaiQrPaymentBuilder()
      .trueMoney('0801111111')
      .billPayment({ billerId: '123456789012345' })
      .build();
    expect(payload).not.toContain('A000000677010111');
    expect(payload).toContain('A000000677010112');
  });

  it('round-trips static TrueMoney through parse → build', () => {
    const original = new ThaiQrPaymentBuilder().trueMoney('0801111111').build();
    const parsed = parsePayload(original);
    expect(parsed.merchant).toMatchObject({ kind: 'trueMoney', mobileNo: '0801111111' });
    const rebuilt = new ThaiQrPaymentBuilder().trueMoney('0801111111').build();
    expect(rebuilt).toBe(original);
  });

  it('round-trips TrueMoney with amount and message', () => {
    const original = new ThaiQrPaymentBuilder()
      .trueMoney('0801111111', { amount: 10, message: 'Hello World!' })
      .build();
    const parsed = parsePayload(original);
    expect(parsed.amount).toBe(10);
    if (parsed.merchant?.kind === 'trueMoney') {
      expect(parsed.merchant.mobileNo).toBe('0801111111');
      expect(parsed.merchant.message).toBe('Hello World!');
    } else {
      expect.fail('Expected TrueMoney merchant kind');
    }
    const rebuilt = new ThaiQrPaymentBuilder()
      .trueMoney('0801111111', { amount: 10, message: 'Hello World!' })
      .build();
    expect(rebuilt).toBe(original);
  });
});

describe('ThaiQrPaymentBuilder — bankAccount recipient', () => {
  it('emits tag 29 with sub-tag 04 and the standard PromptPay AID', () => {
    const payload = new ThaiQrPaymentBuilder().bankAccount('014', '1234567890').amount(100).build();
    expect(payload).toBe(
      '00020101021229370016A0000006770101110413014123456789053037645406100.005802TH6304901D',
    );
  });

  it('flips POI to dynamic when paired with an amount', () => {
    const payload = new ThaiQrPaymentBuilder().bankAccount('014', '1234567890').amount(100).build();
    expect(parsePayload(payload).pointOfInitiation).toBe('dynamic');
  });

  it('round-trips a bank-account recipient through parse', () => {
    const payload = new ThaiQrPaymentBuilder().bankAccount('014', '1234567890').amount(100).build();
    const parsed = parsePayload(payload);
    expect(parsed.merchant).toMatchObject({
      kind: 'promptpay',
      recipientType: 'bankAccount',
      recipient: '0141234567890',
      bankCode: '014',
      accountNo: '1234567890',
    });
    expect(parsed.amount).toBe(100);
  });

  it('round-trips a bank-account recipient via parse → re-encode', () => {
    const original = new ThaiQrPaymentBuilder()
      .bankAccount('014', '1234567890')
      .amount(100)
      .build();
    const parsed = parsePayload(original);
    if (parsed.merchant?.kind !== 'promptpay' || parsed.merchant.recipientType !== 'bankAccount') {
      expect.fail('Expected bankAccount recipient');
    }
    const rebuilt = new ThaiQrPaymentBuilder()
      .bankAccount(parsed.merchant.bankCode!, parsed.merchant.accountNo!)
      .amount(100)
      .build();
    expect(rebuilt).toBe(original);
  });

  it('strips non-digits from bank code and account number', () => {
    const payload = new ThaiQrPaymentBuilder().bankAccount('0-1-4', '123 456 7890').build();
    expect(payload).toContain('04130141234567890');
  });

  it('rejects a bank code with the wrong number of digits', () => {
    expect(() => new ThaiQrPaymentBuilder().bankAccount('01', '1234567890')).toThrow(
      /Bank code must be 3 digits/,
    );
    expect(() => new ThaiQrPaymentBuilder().bankAccount('0140', '1234567890')).toThrow(
      /Bank code must be 3 digits/,
    );
  });

  it('rejects an empty account number', () => {
    expect(() => new ThaiQrPaymentBuilder().bankAccount('014', '')).toThrow(/at least one digit/);
  });

  it('rejects values that exceed the 43-char EMVCo cap', () => {
    const tooLong = '1'.repeat(41);
    expect(() => new ThaiQrPaymentBuilder().bankAccount('014', tooLong)).toThrow(/exceeds 43/);
  });

  it('switching from bankAccount to billPayment clears tag 29', () => {
    const payload = new ThaiQrPaymentBuilder()
      .bankAccount('014', '1234567890')
      .billPayment({ billerId: '123456789012345' })
      .build();
    expect(payload).not.toContain('04130141234567890');
    expect(payload).toContain('A000000677010112');
  });

  it('switching from promptpay mobile to bankAccount swaps the sub-tag', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .bankAccount('014', '1234567890')
      .build();
    expect(payload).not.toContain('0066812345678');
    expect(payload).toContain('04130141234567890');
  });

  it('refuses an explicit "bankAccount" type on the .promptpay() helper', () => {
    expect(() => new ThaiQrPaymentBuilder().promptpay('0141234567890', 'bankAccount')).toThrow(
      /\.bankAccount/,
    );
  });
});

describe('ThaiQrPaymentBuilder — OTA credit transfer', () => {
  it('emits the OTA AID and sub-tag 05 on top of a mobile recipient', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .ota('1234567890')
      .amount(50)
      .build();
    expect(payload).toBe(
      '00020101021229510016A00000067701011401130066812345678051012345678905303764540550.005802TH63048856',
    );
  });

  it('contains the OTA AID A000000677010114 and not the standard …0111', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .ota('1234567890')
      .amount(50)
      .build();
    expect(payload).toContain('A000000677010114');
    expect(payload).not.toContain('A000000677010111');
  });

  it('round-trips OTA + mobile through parse', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .ota('1234567890')
      .amount(50)
      .build();
    const parsed = parsePayload(payload);
    expect(parsed.merchant).toMatchObject({
      kind: 'promptpay',
      recipientType: 'mobile',
      recipient: '0812345678',
      ota: '1234567890',
    });
    expect(parsed.amount).toBe(50);
  });

  it('lets call order be flexible (ota first, then promptpay)', () => {
    const a = new ThaiQrPaymentBuilder().promptpay('0812345678').ota('1234567890').build();
    const b = new ThaiQrPaymentBuilder().ota('1234567890').promptpay('0812345678').build();
    expect(a).toBe(b);
  });

  it('round-trips OTA via parse → re-encode', () => {
    const original = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .ota('1234567890')
      .amount(50)
      .build();
    const parsed = parsePayload(original);
    if (parsed.merchant?.kind !== 'promptpay' || parsed.merchant.ota == null) {
      expect.fail('Expected OTA promptpay merchant');
    }
    const rebuilt = new ThaiQrPaymentBuilder()
      .promptpay(parsed.merchant.recipient)
      .ota(parsed.merchant.ota)
      .amount(50)
      .build();
    expect(rebuilt).toBe(original);
  });

  it('combines OTA with a bankAccount recipient', () => {
    const payload = new ThaiQrPaymentBuilder()
      .bankAccount('014', '1234567890')
      .ota('1234567890')
      .build();
    const parsed = parsePayload(payload);
    expect(parsed.merchant).toMatchObject({
      kind: 'promptpay',
      recipientType: 'bankAccount',
      bankCode: '014',
      accountNo: '1234567890',
      ota: '1234567890',
    });
  });

  it('rejects an OTA code that is not exactly 10 chars', () => {
    expect(() => new ThaiQrPaymentBuilder().promptpay('0812345678').ota('123')).toThrow(
      /must be 10 chars/,
    );
    expect(() => new ThaiQrPaymentBuilder().promptpay('0812345678').ota('12345678901')).toThrow(
      /must be 10 chars/,
    );
  });

  it('switching to billPayment after OTA clears OTA state', () => {
    const payload = new ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .ota('1234567890')
      .billPayment({ billerId: '123456789012345' })
      .promptpay('0812345678')
      .build();
    expect(payload).toContain('A000000677010111');
    expect(payload).not.toContain('A000000677010114');
    expect(payload).not.toContain('05101234567890');
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
