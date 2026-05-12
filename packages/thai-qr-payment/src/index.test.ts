import { describe, expect, it } from 'vitest';
import * as umbrella from './index.js';

describe('thai-qr-payment (umbrella) — payload surface', () => {
  it('re-exports ThaiQrPaymentBuilder', () => {
    expect(typeof umbrella.ThaiQrPaymentBuilder).toBe('function');
  });

  it('re-exports payloadFor', () => {
    expect(typeof umbrella.payloadFor).toBe('function');
  });

  it('re-exports parsePayload', () => {
    expect(typeof umbrella.parsePayload).toBe('function');
  });

  it('re-exports checksum', () => {
    expect(typeof umbrella.checksum).toBe('function');
  });

  it('re-exports normaliseRecipient', () => {
    expect(typeof umbrella.normaliseRecipient).toBe('function');
  });

  it('re-exports formatAmount', () => {
    expect(typeof umbrella.formatAmount).toBe('function');
  });

  it('re-exports TLV helpers', () => {
    expect(typeof umbrella.encodeField).toBe('function');
    expect(typeof umbrella.encodeFields).toBe('function');
    expect(typeof umbrella.parseFields).toBe('function');
    expect(typeof umbrella.iterateFields).toBe('function');
  });

  it('re-exports Tags namespace', () => {
    expect(typeof umbrella.Tags).toBe('object');
    expect((umbrella.Tags as { GUID_PROMPTPAY: string }).GUID_PROMPTPAY).toBe('A000000677010111');
  });
});

describe('thai-qr-payment (umbrella) — qr surface', () => {
  it('re-exports encodeQR', () => {
    expect(typeof umbrella.encodeQR).toBe('function');
  });

  it('re-exports detectMode', () => {
    expect(typeof umbrella.detectMode).toBe('function');
  });
});

describe('thai-qr-payment (umbrella) — render surface', () => {
  it('re-exports renderThaiQrPayment', () => {
    expect(typeof umbrella.renderThaiQrPayment).toBe('function');
  });

  it('re-exports renderThaiQrPaymentMatrix', () => {
    expect(typeof umbrella.renderThaiQrPaymentMatrix).toBe('function');
  });

  it('re-exports renderCard', () => {
    expect(typeof umbrella.renderCard).toBe('function');
  });

  it('re-exports renderQrSvg', () => {
    expect(typeof umbrella.renderQrSvg).toBe('function');
  });

  it('re-exports matrixToPath', () => {
    expect(typeof umbrella.matrixToPath).toBe('function');
  });
});

describe('thai-qr-payment (umbrella) — assets are NOT in the default bundle', () => {
  it('does not re-export COLOR_LOGOS from the umbrella root', () => {
    expect((umbrella as Record<string, unknown>).COLOR_LOGOS).toBeUndefined();
    expect((umbrella as Record<string, unknown>).SILHOUETTE_LOGOS).toBeUndefined();
    expect((umbrella as Record<string, unknown>).colorLogo).toBeUndefined();
  });

  it('still exposes the assets via the dedicated sub-path entry', async () => {
    const assets = await import('thai-qr-payment/assets');
    expect(assets.COLOR_LOGOS).toBeDefined();
    expect(assets.colorLogo('PromptPay1')).toContain('<svg');
  });
});

describe('thai-qr-payment (umbrella) — end-to-end', () => {
  it('builds a wire payload via top-level helper', () => {
    const wire = umbrella.payloadFor({ recipient: '0812345678', amount: 50 });
    expect(wire).toMatch(/^000201/);
    expect(wire.length).toBeGreaterThan(50);
  });

  it('round-trips payload through parser', () => {
    const wire = umbrella.payloadFor({ recipient: '0812345678', amount: 50 });
    const parsed = umbrella.parsePayload(wire);
    expect(parsed.amount).toBe(50);
    expect(parsed.merchant?.kind).toBe('promptpay');
  });

  it('renders a card via the one-shot helper', () => {
    const svg = umbrella.renderThaiQrPayment({
      recipient: '0812345678',
      amount: 50,
      merchantName: 'Acme Coffee',
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('Acme Coffee');
  });

  it('renders a bare matrix via the one-shot helper', () => {
    const svg = umbrella.renderThaiQrPaymentMatrix({
      recipient: '0812345678',
      amount: 50,
      size: 256,
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="256"');
  });

  it('encodes a QR matrix directly', () => {
    const matrix = umbrella.encodeQR('HELLO', { errorCorrectionLevel: 'M' });
    expect(matrix.size).toBeGreaterThanOrEqual(21);
    expect(matrix.modules.length).toBe(matrix.size);
  });

  it('chains builder → encoder → renderer manually', () => {
    const wire = new umbrella.ThaiQrPaymentBuilder()
      .promptpay('0812345678')
      .amount(120.5)
      .merchant({ name: 'Acme Coffee', city: 'BANGKOK', categoryCode: '5814' })
      .build();
    const matrix = umbrella.encodeQR(wire, { errorCorrectionLevel: 'H' });
    const svg = umbrella.renderCard(matrix, {
      merchantName: 'Acme Coffee',
      amountLabel: '฿ 120.50',
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('Acme Coffee');
  });
});

describe('thai-qr-payment (umbrella) — guarantees', () => {
  it('exposes at least 15 named exports (lean default — assets are opt-in)', () => {
    const names = Object.keys(umbrella);
    expect(names.length).toBeGreaterThanOrEqual(15);
  });

  it('does not leak the upstream package names as exports', () => {
    const names = Object.keys(umbrella);
    for (const name of names) {
      expect(name).not.toMatch(/^@thai-qr-payment/);
    }
  });

  it('every exported function is callable without crashing on smoke input', () => {
    expect(() => umbrella.checksum('123456789')).not.toThrow();
    expect(() => umbrella.detectMode('123')).not.toThrow();
    expect(() => umbrella.payloadFor({ recipient: '0812345678' })).not.toThrow();
  });
});
