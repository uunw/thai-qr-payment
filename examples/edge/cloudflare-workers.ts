/**
 * Cloudflare Workers — generate a Thai QR Payment SVG on the edge.
 *
 * Deploy:
 *   pnpm add thai-qr-payment
 *   npx wrangler deploy
 *
 * `wrangler.toml`:
 *   name = "thai-qr-edge"
 *   compatibility_date = "2026-05-01"
 *   main = "src/worker.ts"
 *
 * Request:
 *   curl https://thai-qr-edge.<your>.workers.dev/?recipient=0812345678&amount=50
 *
 * Returns: image/svg+xml so a browser <img src> can render it directly.
 */

import { renderThaiQRPayment } from 'thai-qr-payment';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const recipient = url.searchParams.get('recipient') ?? '0812345678';
    const amountParam = url.searchParams.get('amount');
    const amount = amountParam == null ? undefined : Number.parseFloat(amountParam);
    const merchantName = url.searchParams.get('merchant') ?? undefined;

    if (!Number.isFinite(amount as number) && amount !== undefined) {
      return new Response('amount must be a number', { status: 400 });
    }

    const svg = renderThaiQRPayment({
      recipient,
      amount,
      merchantName,
      amountLabel: amount != null ? `฿ ${(amount as number).toFixed(2)}` : undefined,
      errorCorrectionLevel: 'H',
    });

    return new Response(svg, {
      headers: {
        'content-type': 'image/svg+xml; charset=utf-8',
        // Long cache — the QR payload is deterministic.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  },
} satisfies ExportedHandler;
