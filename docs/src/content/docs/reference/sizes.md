---
title: Bundle sizes
description: size-limit budgets for every published entry — measured with brotli + minification.
---

Every published `dist/*.js` ships pre-compressed `.br` + `.gz` siblings, and CI enforces a budget on every PR via `andresz1/size-limit-action`.

## Current sizes (brotli + minified)

| Entry | Budget | Actual |
|---|---:|---:|
| `thai-qr-payment` (full umbrella) | 25 KB | **13.7 KB** |
| `thai-qr-payment` (`renderThaiQrPayment` only) | 25 KB | 13.6 KB |
| `thai-qr-payment/payload` sub-path | 5 KB | 3.09 KB |
| `thai-qr-payment/qr` sub-path | 6 KB | 4.74 KB |
| `@thai-qr-payment/payload` (full) | 5 KB | 3.09 KB |
| `@thai-qr-payment/payload` (`payloadFor` only) | 4 KB | 2.98 KB |
| `@thai-qr-payment/qr` | 6 KB | 4.75 KB |
| `@thai-qr-payment/render` | 2 KB | 1.24 KB |
| `@thai-qr-payment/react` | 1 KB | 256 B |
| `@thai-qr-payment/assets` | 20 KB | 4.83 KB |

## How we got here

The umbrella started at **202 KB** brotli — the brand SVG assets were embedded as base64-encoded raster inside SVG wrappers, and SVGO can't shave a base64 blob. Two optimizations landed in v0.1.0:

1. **vtracer pass** — every logo re-traced as a true vector SVG, then SVGO multipass. Drop: 202 KB → 18.5 KB (11× smaller).
2. **Drop alt logo variants** — `-02` through `-06` + `PromptPay2` removed (commit `bdadef3`). Drop: 18.5 KB → 13.6 KB.

Total: **15× shrink** from the original raster-embedded build.

## Compression ratios

All published JS bundles compress well — typical brotli ratio is 35-45%:

| File | Raw | Brotli | Gzip |
|---|---:|---:|---:|
| `payload/dist/index.js` | 8.3 KB | 2.98 KB | 3.5 KB |
| `qr/dist/index.js` | 13 KB | 4.5 KB | 5.2 KB |
| `render/dist/index.js` | 3.5 KB | 1.5 KB | 1.7 KB |
| `react/dist/index.js` | 1.2 KB | 449 B | 522 B |

## CI enforcement

The [`size-limit.yml`](https://github.com/uunw/thai-qr-payment/blob/main/.github/workflows/size-limit.yml) workflow runs on every PR. If a budget would be exceeded, the action comments the delta on the PR and fails the check. To raise a budget, edit [`.size-limit.json`](https://github.com/uunw/thai-qr-payment/blob/main/.size-limit.json) with a one-line justification in the commit.
