---
title: Edge runtimes
description: thai-qr-payment runs unchanged on Cloudflare Workers, Vercel Edge, Deno, Bun.
---

The full umbrella (and every scoped package) avoids Node-only APIs. The only exception is `@thai-qr-payment/cli`, which is the CLI binary — that one uses `node:fs/promises` for file output.

## Compatibility matrix

| Runtime                                                  | Status | Notes                                           |
| -------------------------------------------------------- | ------ | ----------------------------------------------- |
| Browsers (Chrome 80+, Safari 14+, Firefox 78+, Edge 80+) | ✓      | ESM via `<script type="module">` or any bundler |
| Node ≥ 18                                                | ✓      | ESM + CJS both shipped                          |
| Bun 1.x                                                  | ✓      | tested manually                                 |
| Deno                                                     | ✓      | works via `npm:thai-qr-payment` specifier       |
| Cloudflare Workers                                       | ✓      | imports cleanly; no `nodejs_compat` flag needed |
| Vercel Edge Functions                                    | ✓      | same                                            |
| Netlify Edge / Deno Deploy                               | ✓      | same                                            |

## Cloudflare Worker example

```ts
import { renderThaiQRPayment } from 'thai-qr-payment';

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const recipient = url.searchParams.get('recipient');
    const amount = Number(url.searchParams.get('amount'));

    if (!recipient || !Number.isFinite(amount)) {
      return new Response('?recipient=…&amount=…', { status: 400 });
    }

    const svg = renderThaiQRPayment({
      recipient,
      amount,
      errorCorrectionLevel: 'H',
    });

    return new Response(svg, {
      headers: {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    });
  },
};
```

`pnpm wrangler deploy` ships in ~5 KB after Wrangler's own minification.

## Vercel Edge example

```ts
// pages/api/qr.ts
import { renderThaiQRPayment } from 'thai-qr-payment';

export const config = { runtime: 'edge' };

export default function handler(req: Request): Response {
  const { searchParams } = new URL(req.url);
  const svg = renderThaiQRPayment({
    recipient: searchParams.get('recipient') ?? '0812345678',
    amount: Number(searchParams.get('amount')) || undefined,
  });
  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
  });
}
```

## Deno example

```ts
import { payloadFor } from 'npm:thai-qr-payment';

const wire = payloadFor({ recipient: '0812345678', amount: 50 });
console.log(wire);
```

`deno run --allow-net script.ts` — no `--allow-read` or `--allow-write` flags since the lib doesn't touch the filesystem.

## What we DON'T use

- `node:fs` — only `@thai-qr-payment/cli`
- `node:path` — only `@thai-qr-payment/cli`
- `node:crypto` — CRC-16 + Reed-Solomon are pure-JS, no Web Crypto either
- `Buffer` — we use `Uint8Array` exclusively
- `eval` — never
- WASM — never

These are the things that typically break edge-runtime portability. Their absence is the entire point of the "zero-dependency, universal" claim.
