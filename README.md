# thai-qr-payment

<!-- npm -->

[![npm version](https://img.shields.io/npm/v/thai-qr-payment?logo=npm&label=npm)](https://www.npmjs.com/package/thai-qr-payment)
[![npm downloads](https://img.shields.io/npm/dm/thai-qr-payment?label=downloads)](https://www.npmjs.com/package/thai-qr-payment)
[![bundle size](https://img.shields.io/bundlephobia/minzip/thai-qr-payment?label=brotli)](https://bundlephobia.com/package/thai-qr-payment)
[![types](https://img.shields.io/npm/types/thai-qr-payment)](https://www.npmjs.com/package/thai-qr-payment)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?logo=npm)](https://www.npmjs.com/package/thai-qr-payment?activeTab=dependencies)
[![provenance](https://img.shields.io/badge/provenance-signed-blue?logo=sigstore)](https://www.npmjs.com/package/thai-qr-payment)

<!-- repo -->

[![docs](https://img.shields.io/badge/docs-thai--qr--payment.js.org-3245ff?logo=astro&logoColor=white)](https://thai-qr-payment.js.org)
[![CI](https://github.com/uunw/thai-qr-payment/actions/workflows/ci.yml/badge.svg)](https://github.com/uunw/thai-qr-payment/actions/workflows/ci.yml)
[![release](https://github.com/uunw/thai-qr-payment/actions/workflows/release.yml/badge.svg)](https://github.com/uunw/thai-qr-payment/actions/workflows/release.yml)
[![CodeQL](https://github.com/uunw/thai-qr-payment/actions/workflows/codeql.yml/badge.svg)](https://github.com/uunw/thai-qr-payment/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/github/license/uunw/thai-qr-payment?color=blue)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/uunw/thai-qr-payment?logo=github)](https://github.com/uunw/thai-qr-payment/stargazers)

<!-- tech -->

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![rspack](https://img.shields.io/badge/rspack-2.0-fb6b00?logo=rspack&logoColor=white)](https://rspack.dev)
[![vitest](https://img.shields.io/badge/vitest-4.x-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev)
[![oxc](https://img.shields.io/badge/oxlint%20%2B%20oxfmt-1.x-000?logo=oxc&logoColor=white)](https://oxc.rs)

<!-- scoped packages -->

[![@thai-qr-payment/payload](https://img.shields.io/npm/v/@thai-qr-payment/payload?label=%40thai-qr-payment%2Fpayload)](https://www.npmjs.com/package/@thai-qr-payment/payload)
[![@thai-qr-payment/qr](https://img.shields.io/npm/v/@thai-qr-payment/qr?label=%40thai-qr-payment%2Fqr)](https://www.npmjs.com/package/@thai-qr-payment/qr)
[![@thai-qr-payment/render](https://img.shields.io/npm/v/@thai-qr-payment/render?label=%40thai-qr-payment%2Frender)](https://www.npmjs.com/package/@thai-qr-payment/render)
[![@thai-qr-payment/assets](https://img.shields.io/npm/v/@thai-qr-payment/assets?label=%40thai-qr-payment%2Fassets)](https://www.npmjs.com/package/@thai-qr-payment/assets)
[![@thai-qr-payment/react](https://img.shields.io/npm/v/@thai-qr-payment/react?label=%40thai-qr-payment%2Freact)](https://www.npmjs.com/package/@thai-qr-payment/react)
[![@thai-qr-payment/cli](https://img.shields.io/npm/v/@thai-qr-payment/cli?label=%40thai-qr-payment%2Fcli)](https://www.npmjs.com/package/@thai-qr-payment/cli)

A zero-dependency, browser + Node + edge-runtime-compatible toolkit for **Thai QR Payment** (PromptPay, BillPayment, KShop). Builds the EMVCo Merchant-Presented-Mode wire payload, encodes it as a QR Code (no `qrcode` peer dep), renders the official Thai QR Payment SVG card, and ships a CLI.

## Install

One install — payload + QR encoder + SVG renderer + brand assets + CLI:

```bash
pnpm add thai-qr-payment
# or: npm install thai-qr-payment
# or: bun add thai-qr-payment
```

```ts
import { renderThaiQrPayment } from 'thai-qr-payment';

const svg = renderThaiQrPayment({
  recipient: '0812345678',
  amount: 50,
  merchantName: 'Acme Coffee',
  amountLabel: '฿ 50.00',
  errorCorrectionLevel: 'H',
});
```

Want a tighter dep graph? Reach for the scoped packages instead — `@thai-qr-payment/payload`, `@thai-qr-payment/qr`, `@thai-qr-payment/render`, `@thai-qr-payment/assets`, or `@thai-qr-payment/cli`. Sub-path imports also work: `import { ThaiQrPaymentBuilder } from 'thai-qr-payment/payload'`.

**Note:** brand logos (`@thai-qr-payment/assets`) are **not re-exported by the default umbrella entry** — that keeps `import { payloadFor } from 'thai-qr-payment'` at ~3 KB. Grab them via the sub-path when you need them: `import { COLOR_LOGOS } from 'thai-qr-payment/assets'`. The renderer helpers still work without changes — they reach for the assets internally on demand.

## CDN

Skip the bundler — load straight from a CDN. Pre-compressed `.br` + `.gz` files ship in the package so any CDN that honours `Accept-Encoding` serves the smallest variant automatically.

```html
<!-- unpkg -->
<script type="module">
  import { renderThaiQrPayment } from 'https://unpkg.com/thai-qr-payment/dist/index.js';
  document.body.innerHTML = renderThaiQrPayment({ recipient: '0812345678', amount: 50 });
</script>

<!-- JSDelivr -->
<script type="module">
  import { payloadFor } from 'https://cdn.jsdelivr.net/npm/thai-qr-payment/dist/index.js';
</script>
```

Self-hosting? Serve the `.br` / `.gz` variants directly when the request's `Accept-Encoding` allows it. Every published `dist/*.js` file ships with its pre-compressed siblings (`.js.br`, `.js.gz`) so no runtime compression is required.

## Highlights

- **Zero runtime dependencies** — no `qrcode`, no `canvas`, no `crc16`. Everything is in-house TypeScript.
- **Universal** — browsers, Node ≥ 18, Bun, Deno, Cloudflare Workers, Vercel Edge.
- **Type-safe & tree-shakable** — ESM + CJS dual output, sideEffects: false, every public API typed.
- **Bundled small** — payload ≈ 8 KB, QR encoder ≈ 13 KB, render ≈ 3.6 KB (ESM, minified).
- **EMVCo compliant** — implements ISO/IEC 18004 QR Model 2 + EMVCo MPM 1.1 + Bank of Thailand Thai QR Payment supplement.
- **Includes Thai QR Payment + PromptPay logos** as SVG (`@thai-qr-payment/assets`), both color and silhouette flavors.

## Packages

| Package                                          | Description                                                        | Bundle (min) |
| ------------------------------------------------ | ------------------------------------------------------------------ | ------------ |
| [`thai-qr-payment`](./packages/thai-qr-payment)  | **Umbrella** — payload + qr + render + assets + CLI in one install | ~1 KB shim   |
| [`@thai-qr-payment/payload`](./packages/payload) | EMVCo TLV builder + parser (PromptPay, BillPayment)                | ~8 KB        |
| [`@thai-qr-payment/qr`](./packages/qr)           | Zero-dep QR Code (ISO/IEC 18004) encoder                           | ~13 KB       |
| [`@thai-qr-payment/assets`](./packages/assets)   | Thai QR Payment + PromptPay logos as SVG                           | varies       |
| [`@thai-qr-payment/render`](./packages/render)   | High-level SVG card composer                                       | ~3.6 KB      |
| [`@thai-qr-payment/react`](./packages/react)     | React component bindings (peer-dep React)                          | ~1.2 KB      |
| [`@thai-qr-payment/cli`](./packages/cli)         | `thai-qr-payment` / `tqp` CLI (standalone)                         | ~4 KB        |

## CLI

```bash
# Zero-install one-off
npx thai-qr-payment 0812345678 --amount 50 -o qr.svg

# Global install
pnpm add -g thai-qr-payment
thai-qr-payment 0812345678 --amount 50 --merchant "Acme Coffee" -o qr.svg
tqp 0812345678 --format payload

# CLI-only (skips the lib)
npx @thai-qr-payment/cli 0812345678 --amount 50
```

## Spec coverage

Following the **Bank of Thailand / Thai Bankers' Association / KASIKORN BANK Thai QR Payment supplement** layered on top of EMVCo MPM 1.1:

| Tag   | Field                                                                    | Status                          |
| ----- | ------------------------------------------------------------------------ | ------------------------------- |
| 00    | Payload Format Indicator (`01`)                                          | ✓                               |
| 01    | Point of Initiation (`11` static / `12` dynamic)                         | ✓                               |
| 29    | Merchant Account Information — **PromptPay** (GUID `A000000677010111`)   | ✓ mobile / nationalId / eWallet |
| 30    | Merchant Account Information — **BillPayment** (GUID `A000000677010112`) | ✓                               |
| 52    | Merchant Category Code                                                   | ✓                               |
| 53    | Transaction Currency (`764` THB)                                         | ✓                               |
| 54    | Transaction Amount                                                       | ✓ baht + satang                 |
| 55–57 | Tip / convenience indicator                                              | ✓ prompt / fixed / percentage   |
| 58    | Country Code (`TH`)                                                      | ✓                               |
| 59    | Merchant Name                                                            | ✓                               |
| 60    | Merchant City                                                            | ✓                               |
| 61    | Postal Code                                                              | ✓                               |
| 62    | Additional Data Field Template                                           | ✓ all sub-tags                  |
| 63    | CRC-16/CCITT-FALSE checksum                                              | ✓                               |

## Edge-runtime smoke

Tested on:

- Node 20 + 22 (CI matrix)
- Bun 1.x (manual)
- Cloudflare Workers
- Vercel Edge
- Browsers (no jsdom dependency)

## Development

```bash
git clone https://github.com/uunw/thai-qr-payment.git
cd thai-qr-payment
pnpm install
pnpm build
pnpm test
```

Tooling:

- **Build**: [rspack](https://rspack.dev) + swc (treeshake + minify)
- **Format**: [oxfmt](https://oxc.rs) (oxc formatter)
- **Lint**: [oxlint](https://oxc.rs)
- **Test**: [Vitest](https://vitest.dev)
- **Versioning**: [Changesets](https://github.com/changesets/changesets)
- **Monorepo**: pnpm workspaces + [Turborepo](https://turbo.build)

## Brand assets

`@thai-qr-payment/assets` redistributes the official Thai QR Payment and PromptPay logos as SVG. The artwork belongs to the **Bank of Thailand**, **Thai Bankers' Association**, and **National ITMX**. Downstream apps must comply with the official Thai QR Payment Brand Guidelines.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Bug reports + feature requests in [GitHub Issues](https://github.com/uunw/thai-qr-payment/issues).

## License

MIT — see [LICENSE](./LICENSE).
