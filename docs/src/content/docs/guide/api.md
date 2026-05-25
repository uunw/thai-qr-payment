---
title: HTTP API
description: Generate Thai QR Payment codes over a plain URL — no install, any language, any stack.
---

![Sample QR card](/img/samples/qr-card-hero.svg)

A hosted endpoint that turns a PromptPay recipient + amount into a QR image
over plain HTTP. For callers that can't `npm install` the library — PHP,
Python, no-code tools (n8n, Zapier), LINE bots, Google Sheets, or a bare
`<img>` tag in an email or web page.

> [!NOTE]
> Already on JS/TS? Skip the network round-trip — `npm i thai-qr-payment` and
> call [`renderThaiQRPayment`](/guide/render/) locally. The HTTP API exists for
> everything that _isn't_ JavaScript.

## URL shape

```
GET https://thai-qr-payment.js.org/api/promptpay/<recipient>[/<amount>].<ext>
```

```
# Mobile number, no amount (payer types the amount), SVG
/api/promptpay/0812345678.svg

# Mobile number, ฿100, PNG
/api/promptpay/0812345678/100.png

# National ID, ฿49.50, WebP
/api/promptpay/1234567890123/49.50.webp
```

## Parameters

| Part        | Required | Notes                                                                            |
| ----------- | -------- | -------------------------------------------------------------------------------- |
| `recipient` | yes      | Phone, 13-digit national ID, or 15-digit e-Wallet. Type is inferred from length. |
| `amount`    | no       | Baht. Decimals allowed (`49.50`). Omit for a static QR the payer fills in.       |
| `ext`       | no       | `svg` (default), `png`, `webp`, `jpg`. Determines the response format.           |

## Formats

| Extension      | Content-Type    | Notes                                                       |
| -------------- | --------------- | ----------------------------------------------------------- |
| `.svg`         | `image/svg+xml` | Native output, smallest, infinitely scalable. Best for web. |
| `.png`         | `image/png`     | Lossless raster. Best for email `<img>` and printing.       |
| `.webp`        | `image/webp`    | Lossless-quality raster, smaller than PNG.                  |
| `.jpg` `.jpeg` | `image/jpeg`    | Lossy. Offered on request — prefer PNG/WebP for QR.         |

> [!WARNING]
> JPEG is lossy: compression can blur the sharp edges of QR modules and hurt
> scan reliability. The API encodes it at high quality with 4:4:4 chroma to
> minimise this, but **PNG or WebP scan more reliably**.

## Examples

```html
<!-- Embed directly — no JavaScript needed -->
<img src="https://thai-qr-payment.js.org/api/promptpay/0812345678/100.png" alt="Pay ฿100" />
```

```js
// Cross-origin fetch (CORS is open)
const res = await fetch('https://thai-qr-payment.js.org/api/promptpay/0812345678/100.svg');
const svg = await res.text();
```

```php
// PHP — drop the URL straight into an <img>, or fetch the bytes
$png = file_get_contents('https://thai-qr-payment.js.org/api/promptpay/0812345678/100.png');
```

## Behaviour

- **GET only.** Input lives in the URL; nothing is stored or mutated.
- **CORS open** (`Access-Control-Allow-Origin: *`) — call it from any origin.
- **Cached hard.** Output is a pure function of the URL, so responses carry
  `Cache-Control: public, max-age=31536000, immutable` and are served from the
  CDN edge.
- **Errors** return JSON with a `400` (malformed recipient/amount or
  unsupported format) or `404` (bad path).

> [!NOTE]
> **Privacy** — the recipient (phone / national ID) and amount are payment PII
> and are **never logged**. Error messages quote counts ("got 13 digits"),
> never the value itself.
