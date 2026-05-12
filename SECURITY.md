# Security Policy

## Supported versions

Only the latest minor of each `@thai-qr-payment/*` package receives security fixes. We follow semver — security patches are released as patch versions.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security reports.**

Use [GitHub Private Vulnerability Reporting](https://github.com/uunw/thai-qr-payment/security/advisories/new) and include:

- Affected package + version
- A minimal reproduction
- Impact assessment (read / write / RCE / supply chain)

You will receive an acknowledgement within 3 working days. Confirmed issues get a patch + GitHub Security Advisory + npm provenance update within 14 days.

## Threat model

These packages run untrusted user input through string parsing (EMVCo TLV) and produce SVG output that is typically embedded into a page or response. Areas of concern:

- **Payload parsing** (`@thai-qr-payment/payload`) — malformed input must throw, not silently corrupt downstream state.
- **SVG rendering** (`@thai-qr-payment/render`) — every interpolated string is XML-attribute-escaped. A bug that lets an attacker inject `<script>` via `merchantName` would be a high-severity report.
- **CLI** (`@thai-qr-payment/cli`) — must never `eval` argv or shell out.

## Out of scope

- Logos in `@thai-qr-payment/assets`: brand artwork is publicly distributed; we don't claim secrecy.
- Bugs in indirect dependencies of _dev_ tooling (rspack, vitest, oxlint, etc.) — file those upstream.
- Denial-of-service via extremely large inputs (e.g. multi-megabyte payloads). The library throws a `RangeError` past the EMVCo limits; pass-through behavior on memory exhaustion is the caller's responsibility.
