import { describe, expect, it } from 'vitest';
import { encodeQR } from '@thai-qr-payment/qr';
import { renderCard } from './card.js';
import { escapeXmlAttribute, matrixToPath, renderQrSvg } from './matrix-svg.js';
import { renderThaiQrPayment, renderThaiQrPaymentMatrix } from './index.js';

describe('renderQrSvg — structural', () => {
  it('emits a self-contained SVG with the right viewBox', () => {
    const matrix = encodeQR('TEST', { errorCorrectionLevel: 'M' });
    const svg = renderQrSvg(matrix);
    const inner = matrix.size + 8; // default quiet zone = 4 on each side
    expect(svg).toContain(`viewBox="0 0 ${inner} ${inner}"`);
    expect(svg).toContain('<path');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('honours transparent background', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderQrSvg(matrix, { background: 'transparent' });
    expect(svg).not.toContain('<rect');
  });

  it('emits a background rect by default', () => {
    const matrix = encodeQR('HELLO');
    expect(renderQrSvg(matrix)).toContain('<rect');
  });

  it('honours custom foreground colour', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderQrSvg(matrix, { foreground: '#0055ff' });
    expect(svg).toContain('fill="#0055ff"');
  });

  it('honours custom background colour', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderQrSvg(matrix, { background: '#fafafa' });
    expect(svg).toContain('fill="#fafafa"');
  });

  it('honours custom size', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderQrSvg(matrix, { size: 512 });
    expect(svg).toContain('width="512"');
    expect(svg).toContain('height="512"');
  });

  it('honours quiet zone of 0', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderQrSvg(matrix, { quietZone: 0 });
    expect(svg).toContain(`viewBox="0 0 ${matrix.size} ${matrix.size}"`);
  });

  it('honours larger quiet zone', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderQrSvg(matrix, { quietZone: 8 });
    const inner = matrix.size + 16;
    expect(svg).toContain(`viewBox="0 0 ${inner} ${inner}"`);
  });

  it('emits crispEdges shape-rendering for sharp QR modules', () => {
    expect(renderQrSvg(encodeQR('A'))).toContain('shape-rendering="crispEdges"');
  });

  it('appends rootAttributes verbatim to <svg>', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderQrSvg(matrix, { rootAttributes: { 'data-testid': 'qr-1' } });
    expect(svg).toContain('data-testid="qr-1"');
  });

  it('escapes special chars in rootAttributes', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderQrSvg(matrix, { rootAttributes: { 'data-x': 'a"b<c>' } });
    expect(svg).toContain('data-x="a&quot;b&lt;c&gt;"');
  });
});

describe('matrixToPath', () => {
  it('produces a non-empty path string', () => {
    const matrix = encodeQR('HELLO');
    const path = matrixToPath(matrix);
    expect(path.length).toBeGreaterThan(0);
    expect(path.startsWith('M')).toBe(true);
  });

  it('returns empty string for all-light matrix', () => {
    const matrix = encodeQR('A');
    // Replace modules with all light
    const empty = {
      ...matrix,
      modules: matrix.modules.map((row) => row.map(() => false)),
    };
    expect(matrixToPath(empty)).toBe('');
  });

  it('emits one M command per horizontal run', () => {
    const matrix = encodeQR('A');
    const path = matrixToPath(matrix);
    const moves = (path.match(/M/g) ?? []).length;
    expect(moves).toBeGreaterThan(0);
    expect(moves).toBeLessThanOrEqual(matrix.size * matrix.size);
  });
});

describe('escapeXmlAttribute', () => {
  it('escapes ampersands', () => {
    expect(escapeXmlAttribute('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes angle brackets', () => {
    expect(escapeXmlAttribute('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeXmlAttribute('"a"')).toBe('&quot;a&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeXmlAttribute("'a'")).toBe('&apos;a&apos;');
  });

  it('leaves benign chars untouched', () => {
    expect(escapeXmlAttribute('hello world')).toBe('hello world');
    expect(escapeXmlAttribute('123abc')).toBe('123abc');
  });

  it('escapes all special chars combined', () => {
    expect(escapeXmlAttribute('<"a&b">')).toBe('&lt;&quot;a&amp;b&quot;&gt;');
  });
});

describe('renderCard', () => {
  it('produces a card SVG containing the QR + brand band', () => {
    const matrix = encodeQR('00020101021129');
    const svg = renderCard(matrix, { merchantName: 'Acme Coffee', amountLabel: '฿ 50.00' });
    expect(svg).toContain('symbol id="tqp-header"');
    expect(svg).toContain('symbol id="tqp-promptpay"');
    expect(svg).toContain('Acme Coffee');
    expect(svg).toContain('50.00');
  });

  it('renders without merchantName when omitted', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix);
    expect(svg).not.toContain('<text');
  });

  it('renders amountLabel when supplied', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix, { amountLabel: '฿ 100.00' });
    expect(svg).toContain('100.00');
  });

  it('switches to silhouette theme', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix, { theme: 'silhouette' });
    expect(svg).toContain('symbol id="tqp-header"');
    expect(svg).toMatch(/<symbol[^>]*id="tqp-header"[^>]*>[\s\S]*?<path/);
  });

  it('emits a 1000 × 1280 canvas', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix);
    expect(svg).toContain('viewBox="0 0 1000 1280"');
  });

  it('honours custom background', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix, { background: '#222222' });
    expect(svg).toContain('fill="#222222"');
  });

  it('honours custom accent colour', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix, { accent: '#ff0066' });
    expect(svg).toContain('fill="#ff0066"');
  });

  it('escapes HTML in merchantName (XSS prevention)', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix, { merchantName: '<script>alert(1)</script>' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('escapes HTML in amountLabel', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix, { amountLabel: 'A & B' });
    expect(svg).toContain('A &amp; B');
  });

  it('honours headerLogo override (same logo, same output)', () => {
    const matrix = encodeQR('HELLO');
    const a = renderCard(matrix);
    const b = renderCard(matrix, { headerLogo: 'Thai_QR_Payment_Logo-01' });
    expect(a).toBe(b);
  });

  it('emits the header logo as a <symbol>', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix);
    expect(svg).toMatch(/<symbol id="tqp-header"[\s\S]*?<\/symbol>/);
  });

  it('emits the PromptPay logo as a <symbol>', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix);
    expect(svg).toMatch(/<symbol id="tqp-promptpay"[\s\S]*?<\/symbol>/);
  });

  it('output starts with <svg and ends with </svg>', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
  });
});

describe('renderThaiQrPayment (one-shot)', () => {
  it('builds payload + encodes + renders', () => {
    const svg = renderThaiQrPayment({
      recipient: '0812345678',
      amount: 50,
      merchantName: 'Acme Coffee',
      amountLabel: '฿ 50.00',
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('Acme Coffee');
  });

  it('renders static QR when amount is omitted', () => {
    const svg = renderThaiQrPayment({ recipient: '0812345678' });
    expect(svg).toContain('<svg');
  });

  it('honours errorCorrectionLevel option', () => {
    const svgM = renderThaiQrPayment({
      recipient: '0812345678',
      amount: 50,
      errorCorrectionLevel: 'M',
    });
    const svgH = renderThaiQrPayment({
      recipient: '0812345678',
      amount: 50,
      errorCorrectionLevel: 'H',
    });
    expect(svgM).not.toBe(svgH);
  });

  it('honours fromSatang flag', () => {
    const svg1 = renderThaiQrPayment({ recipient: '0812345678', amount: 5000, fromSatang: true });
    const svg2 = renderThaiQrPayment({ recipient: '0812345678', amount: 50 });
    // Same wire payload regardless of satang vs baht expression of 50.00.
    expect(svg1).toBe(svg2);
  });

  it('handles nationalId recipient', () => {
    const svg = renderThaiQrPayment({
      recipient: '1234567890123',
      recipientType: 'nationalId',
      amount: 50,
    });
    expect(svg).toContain('<svg');
  });

  it('produces deterministic output for identical input', () => {
    const a = renderThaiQrPayment({ recipient: '0812345678', amount: 50 });
    const b = renderThaiQrPayment({ recipient: '0812345678', amount: 50 });
    expect(a).toBe(b);
  });
});

describe('renderThaiQrPaymentMatrix (bare QR helper)', () => {
  it('returns just the QR', () => {
    const svg = renderThaiQrPaymentMatrix({ recipient: '0812345678', amount: 50 });
    expect(svg).toContain('<path');
    expect(svg).not.toContain('symbol');
  });

  it('honours size parameter', () => {
    const svg = renderThaiQrPaymentMatrix({ recipient: '0812345678', amount: 50, size: 256 });
    expect(svg).toContain('width="256"');
  });

  it('honours quietZone parameter', () => {
    const svg = renderThaiQrPaymentMatrix({ recipient: '0812345678', amount: 50, quietZone: 8 });
    expect(svg).toContain('<svg');
  });
});

describe('SVG validity', () => {
  it('renderCard output round-trips through XML-ish heuristic', () => {
    const svg = renderCard(encodeQR('HELLO'), { merchantName: 'Acme', amountLabel: '50' });
    // Count <svg> tags should match </svg>
    expect((svg.match(/<svg/g) ?? []).length).toBe(1);
    expect((svg.match(/<\/svg>/g) ?? []).length).toBe(1);
  });

  it('renderQrSvg output round-trips through XML-ish heuristic', () => {
    const svg = renderQrSvg(encodeQR('HELLO'));
    expect((svg.match(/<svg/g) ?? []).length).toBe(1);
    expect((svg.match(/<\/svg>/g) ?? []).length).toBe(1);
  });

  it('all SVGs declare the SVG namespace', () => {
    const a = renderCard(encodeQR('A'));
    const b = renderQrSvg(encodeQR('A'));
    expect(a).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(b).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

describe('edge cases', () => {
  it('handles long merchant name (browser apps will overflow visually but SVG stays valid)', () => {
    const matrix = encodeQR('HELLO');
    const longName = 'X'.repeat(200);
    const svg = renderCard(matrix, { merchantName: longName });
    expect(svg).toContain(longName);
  });

  it('handles Thai script in merchantName', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix, { merchantName: 'ร้านกาแฟ Acme' });
    expect(svg).toContain('ร้านกาแฟ Acme');
  });

  it('handles emoji in merchantName', () => {
    const matrix = encodeQR('HELLO');
    const svg = renderCard(matrix, { merchantName: 'Coffee ☕ Shop' });
    expect(svg).toContain('☕');
  });

  it('renders v40-sized matrix without crashing', () => {
    const matrix = encodeQR('0'.repeat(4000), { errorCorrectionLevel: 'L' });
    const svg = renderCard(matrix);
    expect(svg).toContain('<svg');
  });
});
