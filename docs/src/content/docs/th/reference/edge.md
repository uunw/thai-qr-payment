---
title: Edge runtimes
description: thai-qr-payment ทำงานได้บน Cloudflare Workers, Vercel Edge, Deno และ Bun โดยไม่ต้องปรับแก้ใด ๆ
---

umbrella เต็ม (และทุก scoped package) หลีกเลี่ยง API ที่มีเฉพาะใน Node ข้อยกเว้นเดียวคือ `@thai-qr-payment/cli` ซึ่งเป็น binary ของ CLI — ใช้ `node:fs/promises` สำหรับเขียนไฟล์ output

## ตารางความเข้ากันได้

| Runtime                                                  | สถานะ | หมายเหตุ                                               |
| -------------------------------------------------------- | ----- | ------------------------------------------------------ |
| Browsers (Chrome 80+, Safari 14+, Firefox 78+, Edge 80+) | ✓     | ESM ผ่าน `<script type="module">` หรือ bundler ใดก็ได้ |
| Node ≥ 18                                                | ✓     | มีทั้ง ESM + CJS                                       |
| Bun 1.x                                                  | ✓     | ทดสอบด้วยมือแล้ว                                       |
| Deno                                                     | ✓     | ใช้งานผ่าน specifier `npm:thai-qr-payment`             |
| Cloudflare Workers                                       | ✓     | import ได้โดยไม่ต้องเปิด flag `nodejs_compat`          |
| Vercel Edge Functions                                    | ✓     | เหมือนกัน                                              |
| Netlify Edge / Deno Deploy                               | ✓     | เหมือนกัน                                              |

## ตัวอย่าง Cloudflare Worker

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

`pnpm wrangler deploy` deploy ได้ขนาดประมาณ ~5 KB หลังจากที่ Wrangler ทำ minification อีกชั้น

## ตัวอย่าง Vercel Edge

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

## ตัวอย่าง Deno

```ts
import { payloadFor } from 'npm:thai-qr-payment';

const wire = payloadFor({ recipient: '0812345678', amount: 50 });
console.log(wire);
```

`deno run --allow-net script.ts` — ไม่ต้องใช้ flag `--allow-read` หรือ `--allow-write` เพราะไลบรารีไม่ได้เข้าถึง filesystem

## API ที่ **ไม่ได้** ใช้

- `node:fs` — มีเฉพาะใน `@thai-qr-payment/cli`
- `node:path` — มีเฉพาะใน `@thai-qr-payment/cli`
- `node:crypto` — CRC-16 + Reed-Solomon เป็น pure-JS และไม่ใช้ Web Crypto ด้วย
- `Buffer` — ใช้ `Uint8Array` ทั้งหมด
- `eval` — ไม่ใช้เด็ดขาด
- WASM — ไม่ใช้เด็ดขาด

API เหล่านี้คือสาเหตุที่มักทำให้ portability บน edge runtime พัง การไม่ใช้สิ่งเหล่านี้คือหัวใจของคำกล่าวอ้าง "zero-dependency, universal" ทั้งหมด
