---
'thai-qr-payment': major
'@thai-qr-payment/payload': major
---

Bump `thai-qr-payment` (umbrella) and `@thai-qr-payment/payload` to `2.0.0` so every package in the linked `@thai-qr-payment/*` family advertises the same major. Last release split the family across two majors (qr/assets/render/cli/react at 2.0.0 vs payload/umbrella at 1.0.0) because the changesets `linked` rule only realigns packages that themselves have a changeset attached — empty changesets are still required for tag-along packages. This catches the two stragglers up. No source changes, version metadata only.
