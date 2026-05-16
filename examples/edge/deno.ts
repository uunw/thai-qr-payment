/**
 * Deno (CLI or Deno Deploy) — import from npm directly, serve SVGs.
 *
 * Run locally:
 *   deno run --allow-net deno.ts
 *
 * Deploy:
 *   deployctl deploy --project=thai-qr-edge deno.ts
 *
 * Request:
 *   curl 'http://localhost:8000/?recipient=0812345678&amount=50'
 */

import { renderThaiQRPayment } from 'npm:thai-qr-payment';

Deno.serve((request) => {
  const url = new URL(request.url);
  const recipient = url.searchParams.get('recipient') ?? '0812345678';
  const amountParam = url.searchParams.get('amount');
  const amount = amountParam == null ? undefined : Number.parseFloat(amountParam);
  const merchantName = url.searchParams.get('merchant') ?? undefined;

  const svg = renderThaiQRPayment({
    recipient,
    amount,
    merchantName,
    amountLabel: amount != null ? `฿ ${amount.toFixed(2)}` : undefined,
    errorCorrectionLevel: 'H',
  });

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
});
