/**
 * Vercel Edge Function — same idea as the Cloudflare Workers example,
 * different runtime adapter.
 *
 * File path: `api/qr.ts` in a Next.js app, or `app/api/qr/route.ts` for
 * the App Router. Below is the App Router form.
 *
 * Request:
 *   curl https://your-app.vercel.app/api/qr?recipient=0812345678&amount=50
 */

import { renderThaiQRPayment } from 'thai-qr-payment';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const recipient = searchParams.get('recipient') ?? '0812345678';
  const amountParam = searchParams.get('amount');
  const amount = amountParam == null ? undefined : Number.parseFloat(amountParam);
  const merchantName = searchParams.get('merchant') ?? undefined;

  if (amountParam != null && !Number.isFinite(amount)) {
    return new Response('amount must be a number', { status: 400 });
  }

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
}
