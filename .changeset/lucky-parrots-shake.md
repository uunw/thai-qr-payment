---
'@thai-qr-payment/cli': minor
'@thai-qr-payment/react': minor
'@thai-qr-payment/render': minor
'thai-qr-payment': minor
---

Make the card caption opt-in, and centre the logo overlay evenly

`renderCard` / `renderThaiQRPayment` gain `showCaption` (default `false`).
`merchantName` and `amountLabel` now only draw when it is set, so a card built
from a payload that carries a merchant name stays clean unless you ask for the
text. The CLI exposes the same switch as `--caption`.

**Breaking-ish:** passing `merchantName` / `amountLabel` alone no longer
renders them — add `showCaption: true` (or `--caption`) to restore the old
output.

The centre logo also sat off-centre: its box was square while the glyph is
325 × 376, so `xMidYMid meet` letterboxed it and left the side padding ~2× the
top and bottom. The box now carries the icon's aspect ratio, giving equal white
padding on all four sides. The glyph itself is unchanged in size.
