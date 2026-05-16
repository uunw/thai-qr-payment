# `examples/cdn/`

Run `thai-qr-payment` in a browser without a bundler. All four files
are static HTML — open them with any HTTP server (or directly via
`file://` for the script-type ESM ones).

| File                        | CDN              | Style                                                                                    |
| --------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `unpkg-esm.html`            | unpkg.com        | `<script type="module">` direct import, live form.                                       |
| `jsdelivr-sub-path.html`    | cdn.jsdelivr.net | Pulls only the payload sub-path (~3 KB brotli).                                          |
| `import-map.html`           | unpkg.com        | `<script type="importmap">` so every `import "thai-qr-payment"` resolves to the CDN URL. |
| `esm-sh-precompressed.html` | esm.sh           | Pinned `[email protected]`; brotli pre-compressed delivery.                              |

## Quick check

```bash
# Serve the directory then open the page.
npx serve examples/cdn/
# → http://localhost:3000/unpkg-esm.html
```

## Caveats

- `unpkg` and `jsdelivr` resolve `thai-qr-payment` → the umbrella `dist/index.js` (full bundle). Use the sub-path form (`/dist/payload.js`) when you only need one slice.
- `esm.sh` rewrites imports on the fly; the URL is the version-pinned source of truth.
- Browser caches the CDN response — bumping the package on npm doesn't invalidate older HTML pages immediately. Either version-pin your URL or set a low `Cache-Control` on your hosting layer.

For a fully-styled interactive playground, see the docs site demo:
<https://thai-qr-payment.js.org/demo/>.
