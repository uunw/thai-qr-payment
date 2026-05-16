/**
 * Bun — native ESM, no bundler. Same approach as Deno but the
 * `Bun.serve` API.
 *
 * Install + run:
 *   bun add thai-qr-payment
 *   bun run bun.ts
 */

import { renderThaiQRPayment } from 'thai-qr-payment';

Bun.serve({
  port: 8000,
  fetch(request) {
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
      headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
    });
  },
});
