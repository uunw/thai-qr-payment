import { describe, expect, it } from 'vitest';
import {
  COLOR_LOGOS,
  type ColorLogoName,
  colorLogo,
  DEFAULT_LOGOS,
  SILHOUETTE_LOGOS,
  type SilhouetteLogoName,
  silhouetteLogo,
} from './index.js';

const COLOR_NAMES: ColorLogoName[] = ['Thai_QR_Payment_Logo-01', 'PromptPay1'];

const SILHOUETTE_NAMES: SilhouetteLogoName[] = [...COLOR_NAMES];

describe('COLOR_LOGOS registry', () => {
  it('exposes every Thai QR Payment color logo', () => {
    for (const name of COLOR_NAMES) {
      expect(COLOR_LOGOS).toHaveProperty(name);
    }
  });

  it.each(COLOR_NAMES)('%s SVG starts with <svg', (name) => {
    expect(colorLogo(name)).toMatch(/^<svg/);
  });

  it.each(COLOR_NAMES)('%s SVG ends with </svg>', (name) => {
    expect(colorLogo(name)).toContain('</svg>');
  });

  it.each(COLOR_NAMES)('%s carries vector <path> data, not embedded raster', (name) => {
    const svg = colorLogo(name);
    expect(svg).toContain('<path');
    expect(svg).not.toContain('data:image/');
  });

  it.each(COLOR_NAMES)('%s declares SVG dimensions or viewBox', (name) => {
    expect(colorLogo(name)).toMatch(/(viewBox=|width=|height=)/);
  });

  it.each(COLOR_NAMES)('%s declares the SVG namespace', (name) => {
    expect(colorLogo(name)).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

describe('SILHOUETTE_LOGOS registry', () => {
  it('exposes every silhouette logo', () => {
    for (const name of SILHOUETTE_NAMES) {
      expect(SILHOUETTE_LOGOS).toHaveProperty(name);
    }
  });

  it.each(SILHOUETTE_NAMES)('%s contains a <path>', (name) => {
    expect(silhouetteLogo(name)).toContain('<path');
  });

  it.each(SILHOUETTE_NAMES)('%s does not contain a base64 <image>', (name) => {
    expect(silhouetteLogo(name)).not.toContain('data:image/');
  });

  it.each(SILHOUETTE_NAMES)('%s declares the SVG namespace', (name) => {
    expect(silhouetteLogo(name)).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

describe('DEFAULT_LOGOS', () => {
  it('points to a real color logo entry', () => {
    expect(COLOR_LOGOS).toHaveProperty(DEFAULT_LOGOS.thaiQrPayment);
    expect(COLOR_LOGOS).toHaveProperty(DEFAULT_LOGOS.promptpay);
  });

  it('points to a real silhouette logo entry', () => {
    expect(SILHOUETTE_LOGOS).toHaveProperty(DEFAULT_LOGOS.thaiQrPaymentSilhouette);
    expect(SILHOUETTE_LOGOS).toHaveProperty(DEFAULT_LOGOS.promptpaySilhouette);
  });

  it('has stable string values', () => {
    expect(DEFAULT_LOGOS.thaiQrPayment).toBe('Thai_QR_Payment_Logo-01');
    expect(DEFAULT_LOGOS.promptpay).toBe('PromptPay1');
  });
});

describe('accessor functions', () => {
  it('colorLogo returns the same value as COLOR_LOGOS index', () => {
    expect(colorLogo('PromptPay1')).toBe(COLOR_LOGOS.PromptPay1);
  });

  it('silhouetteLogo returns the same value as SILHOUETTE_LOGOS index', () => {
    expect(silhouetteLogo('PromptPay1')).toBe(SILHOUETTE_LOGOS.PromptPay1);
  });

  it('every color logo has a matching silhouette', () => {
    for (const name of Object.keys(COLOR_LOGOS) as ColorLogoName[]) {
      expect(SILHOUETTE_LOGOS).toHaveProperty(name);
    }
  });
});

describe('registry shapes', () => {
  it('color + silhouette registries have the same key set', () => {
    expect(Object.keys(COLOR_LOGOS).sort()).toEqual(Object.keys(SILHOUETTE_LOGOS).sort());
  });

  it('color logos are non-empty SVG strings', () => {
    for (const v of Object.values(COLOR_LOGOS)) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(50);
      expect(v).toContain('<svg');
    }
  });

  it('silhouette logos are non-empty SVG strings', () => {
    for (const v of Object.values(SILHOUETTE_LOGOS)) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(50);
      expect(v).toContain('<svg');
    }
  });

  it('every logo is under 50 KB (true vectors, not embedded raster)', () => {
    for (const v of Object.values(COLOR_LOGOS)) {
      expect(v.length).toBeLessThan(50_000);
    }
    for (const v of Object.values(SILHOUETTE_LOGOS)) {
      expect(v.length).toBeLessThan(50_000);
    }
  });
});
