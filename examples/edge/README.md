# `examples/edge/`

`thai-qr-payment` runs the same code-path on every JS runtime — no
`node:*` imports, no `canvas`, no DOM. These files show the wiring for
the major edge / serverless platforms.

| File                    | Runtime                          | Notes                                        |
| ----------------------- | -------------------------------- | -------------------------------------------- |
| `cloudflare-workers.ts` | Cloudflare Workers               | Standard `fetch` handler; long cache header. |
| `vercel-edge.ts`        | Vercel Edge (Next.js App Router) | `export const runtime = 'edge'`; same shape. |
| `deno.ts`               | Deno + Deno Deploy               | Imports via `npm:` specifier.                |
| `bun.ts`                | Bun                              | `Bun.serve` API.                             |

All four examples accept the same query string:

```
?recipient=0812345678&amount=50&merchant=Acme%20Coffee
```

And return `Content-Type: image/svg+xml`, so a browser `<img src="…">`
renders the QR card directly.

The bundle weight at the edge is **~13 KB brotli** (umbrella, full
deps inlined). Cold-start is dominated by the runtime, not the
library.
