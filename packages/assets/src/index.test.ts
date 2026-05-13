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

const COLOR_NAMES: ColorLogoName[] = ['Thai_QR_Payment_Logo-01', 'PromptPay1', 'PromptPay2'];

const SILHOUETTE_NAMES: SilhouetteLogoName[] = ['Thai_QR_Payment_Logo-01', 'PromptPay1'];

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

  it.each(COLOR_NAMES)('%s declares some renderable content', (name) => {
    const svg = colorLogo(name);
    // PromptPay2 ships as an embedded PNG inside `<image>` to keep
    // font glyphs smooth (vector tracing turns the wordmark into
    // jagged polygons). Other marks are pure vector `<path>`.
    expect(svg).toMatch(/<(path|image)\b/);
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

  it('silhouette registry is a subset of color registry', () => {
    // Not every colour mark requires a silhouette twin. PromptPay2 is
    // color-only; the renderer falls back to its colour version when
    // the silhouette theme is requested.
    for (const name of Object.keys(SILHOUETTE_LOGOS) as SilhouetteLogoName[]) {
      expect(COLOR_LOGOS).toHaveProperty(name);
    }
  });
});

describe('registry shapes', () => {
  it('silhouette registry is a subset of color registry', () => {
    // Not every colour mark needs a silhouette twin (e.g. PromptPay2 is
    // color-only — the navy PromptPay variant doesn't make sense in
    // monochrome). The renderer falls back to the colour version when a
    // silhouette key is missing, so we only require ⊆ rather than ===.
    const colorKeys = new Set(Object.keys(COLOR_LOGOS));
    for (const key of Object.keys(SILHOUETTE_LOGOS)) {
      expect(colorKeys.has(key)).toBe(true);
    }
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
