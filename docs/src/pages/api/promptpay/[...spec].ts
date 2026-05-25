import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { renderThaiQRPayment } from 'thai-qr-payment/render';

// On-demand route: opt out of static prerender so it builds as a Vercel
// serverless function. Every other (Starlight) route stays prerendered.
export const prerender = false;

// Raster formats → sharp encoder + MIME. `svg` is handled separately
// (the library already emits SVG, no rasterisation needed).
const RASTER = {
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
} as const;
type RasterExt = keyof typeof RASTER;

// Public, read-only, no-credentials generator → open CORS so cross-origin
// `fetch()` works (PHP / no-code / web callers). `<img src>` embeds don't
// need this, but JS fetches from other origins do. GET-only: input is in the
// URL, nothing mutates, so there's no POST/PUT. Astro auto-handles HEAD (runs
// GET, strips body) and OPTIONS; other methods fall through to a 404.
const CORS = { 'access-control-allow-origin': '*' };

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });

/**
 * `GET /api/promptpay/<recipient>[/<amount>].<ext>`
 *
 *   /api/promptpay/0812345678.svg            → mobile, no amount, SVG
 *   /api/promptpay/0812345678/100.png        → mobile, ฿100, PNG
 *   /api/promptpay/1234567890123/49.50.webp  → national ID, ฿49.50, WebP
 *
 * Recipient type (mobile / national ID / e-Wallet) is inferred from digit
 * count by the library. `.svg` is the default when no extension is given.
 *
 * PRIVACY: `recipient` is PromptPay PII (phone / 13-digit national ID) and
 * `amount` is a payment value — neither is ever logged.
 */
export const GET: APIRoute = async ({ params }) => {
  const segs = (params.spec ?? '').split('/').filter(Boolean);
  if (segs.length < 1 || segs.length > 2) {
    return json({ error: 'expected /api/promptpay/<recipient>[/<amount>].<ext>' }, 404);
  }

  const last = segs[segs.length - 1];
  const dot = last.lastIndexOf('.');
  // National-ID / phone / e-Wallet recipients are digits only, so the last
  // dot always separates the extension (amounts like `49.50` only appear in
  // the 2-segment form where the recipient is its own segment).
  const ext = (dot >= 0 ? last.slice(dot + 1) : 'svg').toLowerCase();
  const lastBare = dot >= 0 ? last.slice(0, dot) : last;

  if (ext !== 'svg' && !(ext in RASTER)) {
    return json({ error: `unsupported format ".${ext}" — use svg, png, webp, or jpg` }, 400);
  }

  const recipient = segs.length === 2 ? segs[0] : lastBare;
  const amountStr = segs.length === 2 ? lastBare : undefined;

  let amount: number | undefined;
  if (amountStr) {
    amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'amount must be a positive number' }, 400);
    }
  }

  let svg: string;
  try {
    svg = renderThaiQRPayment({
      recipient,
      amount,
      amountLabel: amount != null ? `฿ ${amount.toFixed(2)}` : undefined,
    });
  } catch (err) {
    // Library validation throws TypeError/RangeError/SyntaxError on malformed
    // input → surface as 400. Messages quote counts ("got 13 digits"), never
    // the raw value, so no PII leaks into the response.
    if (err instanceof TypeError || err instanceof RangeError || err instanceof SyntaxError) {
      return json({ error: err.message }, 400);
    }
    throw err;
  }

  // Output is a pure function of (recipient, amount, ext) → cache hard at the
  // CDN edge so repeat hits never re-invoke the function. Keeps usage well
  // inside the Vercel free tier regardless of traffic.
  const cacheControl = 'public, max-age=31536000, immutable';

  if (ext === 'svg') {
    return new Response(svg, {
      headers: {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': cacheControl,
        ...CORS,
      },
    });
  }

  // density 144 → crisp raster at the 1024px target. JPEG uses 4:4:4 chroma
  // so lossy compression doesn't bleed colour across the QR module edges
  // (PNG / WebP still scan more reliably — JPEG offered on request only).
  const rasterExt = ext as RasterExt;
  const pipeline = sharp(Buffer.from(svg), { density: 144 }).resize({
    width: 1024,
    fit: 'contain',
    background: '#ffffff',
  });
  const buf =
    rasterExt === 'png'
      ? await pipeline.png().toBuffer()
      : rasterExt === 'webp'
        ? await pipeline.webp({ quality: 90 }).toBuffer()
        : await pipeline.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();

  return new Response(new Uint8Array(buf), {
    headers: { 'content-type': RASTER[rasterExt], 'cache-control': cacheControl, ...CORS },
  });
};
