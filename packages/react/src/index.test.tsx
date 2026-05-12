import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThaiQrPayment, ThaiQrPaymentMatrix } from './index.js';

function renderHtml(node: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(node);
}

describe('ThaiQrPayment component', () => {
  it('is exported as a function', () => {
    expect(typeof ThaiQrPayment).toBe('function');
  });

  it('renders without crashing for a static PromptPay', () => {
    const html = renderHtml(createElement(ThaiQrPayment, { recipient: '0812345678' }));
    expect(html).toContain('<svg');
  });

  it('renders a dynamic payment with amount', () => {
    const html = renderHtml(createElement(ThaiQrPayment, { recipient: '0812345678', amount: 50 }));
    expect(html).toContain('<svg');
  });

  it('emits a role="img" wrapper', () => {
    const html = renderHtml(createElement(ThaiQrPayment, { recipient: '0812345678' }));
    expect(html).toContain('role="img"');
  });

  it('uses the default aria-label when none is given', () => {
    const html = renderHtml(createElement(ThaiQrPayment, { recipient: '0812345678' }));
    expect(html).toContain('aria-label="Thai QR Payment for 0812345678"');
  });

  it('honours custom aria-label', () => {
    const html = renderHtml(
      createElement(ThaiQrPayment, { recipient: '0812345678', ariaLabel: 'Pay 50 baht' }),
    );
    expect(html).toContain('aria-label="Pay 50 baht"');
  });

  it('passes className through to the wrapper', () => {
    const html = renderHtml(
      createElement(ThaiQrPayment, { recipient: '0812345678', className: 'qr-card' }),
    );
    expect(html).toContain('class="qr-card"');
  });

  it('passes style through to the wrapper', () => {
    const html = renderHtml(
      createElement(ThaiQrPayment, {
        recipient: '0812345678',
        style: { width: 256, height: 256 },
      }),
    );
    expect(html).toMatch(/style="[^"]*width:256px/);
  });

  it('renders merchant name inside the SVG', () => {
    const html = renderHtml(
      createElement(ThaiQrPayment, {
        recipient: '0812345678',
        amount: 50,
        merchantName: 'Acme Coffee',
      }),
    );
    expect(html).toContain('Acme Coffee');
  });

  it('renders amount label inside the SVG', () => {
    const html = renderHtml(
      createElement(ThaiQrPayment, {
        recipient: '0812345678',
        amount: 50,
        amountLabel: '฿ 50.00',
      }),
    );
    expect(html).toContain('50.00');
  });

  it('is deterministic for identical input', () => {
    const a = renderHtml(createElement(ThaiQrPayment, { recipient: '0812345678', amount: 50 }));
    const b = renderHtml(createElement(ThaiQrPayment, { recipient: '0812345678', amount: 50 }));
    expect(a).toBe(b);
  });

  it('produces different output for different recipients', () => {
    const a = renderHtml(createElement(ThaiQrPayment, { recipient: '0812345678' }));
    const b = renderHtml(createElement(ThaiQrPayment, { recipient: '0911111111' }));
    expect(a).not.toBe(b);
  });
});

describe('ThaiQrPaymentMatrix component', () => {
  it('is exported as a function', () => {
    expect(typeof ThaiQrPaymentMatrix).toBe('function');
  });

  it('renders without crashing', () => {
    const html = renderHtml(createElement(ThaiQrPaymentMatrix, { recipient: '0812345678' }));
    expect(html).toContain('<svg');
  });

  it('uses default aria-label "QR code for <recipient>"', () => {
    const html = renderHtml(createElement(ThaiQrPaymentMatrix, { recipient: '0812345678' }));
    expect(html).toContain('aria-label="QR code for 0812345678"');
  });

  it('does not include the brand band (no <symbol>)', () => {
    const html = renderHtml(createElement(ThaiQrPaymentMatrix, { recipient: '0812345678' }));
    expect(html).not.toContain('symbol');
  });

  it('honours size parameter', () => {
    const html = renderHtml(
      createElement(ThaiQrPaymentMatrix, { recipient: '0812345678', size: 320 }),
    );
    expect(html).toContain('width="320"');
  });

  it('honours className', () => {
    const html = renderHtml(
      createElement(ThaiQrPaymentMatrix, { recipient: '0812345678', className: 'qr' }),
    );
    expect(html).toContain('class="qr"');
  });

  it('produces different output for different ECC levels', () => {
    const m = renderHtml(
      createElement(ThaiQrPaymentMatrix, { recipient: '0812345678', errorCorrectionLevel: 'M' }),
    );
    const h = renderHtml(
      createElement(ThaiQrPaymentMatrix, { recipient: '0812345678', errorCorrectionLevel: 'H' }),
    );
    expect(m).not.toBe(h);
  });
});
