# Deploying the docs + API

The docs site (`@thai-qr-payment/docs`) and the `/api/promptpay/*` HTTP API are
hosted on **Vercel**. The Astro site stays statically prerendered; only the API
route runs as a serverless function (`output: 'static'` default + the
`@astrojs/vercel` adapter + `export const prerender = false` on the endpoint).

Vercel's Git integration handles everything: push to `main` → production
deploy, open a PR → preview deploy. There is no GitHub Actions deploy workflow
(the old `.github/workflows/docs.yml` Pages pipeline was retired in this
change).

## One-time cutover: GitHub Pages → Vercel

Do these in order. The live site stays up on the last Pages deploy until DNS
flips in step 4, so there's no downtime.

1. **Connect Vercel.** vercel.com → Add New Project → import `uunw/thai-qr-payment`.
   Set **Root Directory = `docs`** (Vercel auto-detects Astro). Or from `docs/`:
   ```sh
   npx vercel        # interactive login + link
   npx vercel --prod # first production deploy
   ```
2. **Smoke-test the `*.vercel.app` URL** before touching DNS:
   - `/` and `/th/` render (docs + Thai i18n)
   - `/api/promptpay/0812345678/100.png` returns a PNG
   - `/api/promptpay/0812345678/100.svg` returns SVG
3. **Add the domain in Vercel:** project → Settings → Domains → add
   `thai-qr-payment.js.org`. Vercel shows the DNS target: `cname.vercel-dns.com`.
4. **Repoint js.org DNS.** PR to [`js-org/js.org`](https://github.com/js-org/js.org),
   editing `cnames_active.js`. Find the `thai-qr-payment` entry and set its
   target to Vercel:
   ```diff
   -  "thai-qr-payment": "uunw.github.io",
   +  "thai-qr-payment": "cname.vercel-dns.com",
   ```
   (Confirm the exact current value first — `grep thai-qr-payment cnames_active.js`.)
5. After the PR merges and DNS propagates, verify
   `https://thai-qr-payment.js.org/api/promptpay/0812345678/100.png` serves from
   Vercel. Done.

The GitHub Pages "github-pages" environment + `public/CNAME` file were removed —
Vercel manages the domain from its dashboard, not a CNAME file.

## Cost / limits (Vercel Hobby, free)

OSS/personal use → Hobby tier (free, non-commercial). Comfortable headroom:
1M function invocations, 4 CPU-hrs, 100 GB transfer per month. The API's
`Cache-Control: immutable` means repeat hits serve from the CDN edge and never
re-invoke the function, so real usage stays far inside these caps. Hobby can't
exceed caps (it throttles, never bills) — no surprise charges. Move to Pro
($20/mo) only if it goes commercial or genuinely outgrows the free allotment.
