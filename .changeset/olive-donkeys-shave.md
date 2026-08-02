---
'@thai-qr-payment/assets': minor
'@thai-qr-payment/cli': minor
'@thai-qr-payment/payload': minor
'@thai-qr-payment/qr': minor
'@thai-qr-payment/react': minor
'@thai-qr-payment/render': minor
'thai-qr-payment': minor
---

Raise the Node floor to `>= 22`

`engines.node` moves from `>= 18` to `>= 22`. Node 18 and 20 both reached
end-of-life, and 22 is the oldest LTS still receiving security fixes — it is
also what the build and CI matrices already target. No runtime API in these
packages changed; installs on Node < 22 will now warn (or fail under
`engine-strict`).
