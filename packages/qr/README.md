# @thai-qr-payment/qr

Zero-dependency QR Code (ISO/IEC 18004) encoder. Designed for Thai QR Payment / EMVCo payloads but works on any input. Returns a boolean module matrix; pair with `@thai-qr-payment/render` for SVG output.

```bash
pnpm add @thai-qr-payment/qr
```

## Quickstart

```ts
import { encodeQR } from '@thai-qr-payment/qr';

const { size, modules, version, mask } = encodeQR('00020101021129...6304ABCD', {
  errorCorrectionLevel: 'M',
});

// modules[y][x] === true → dark module
```

## Features

- Versions 1-40 (full ISO/IEC 18004 range)
- ECC levels L / M / Q / H
- Auto mode selection: numeric / alphanumeric / byte (UTF-8)
- 8 mask patterns with automatic penalty-based selection
- Reed-Solomon ECC over GF(2^8) with primitive polynomial 0x11D
- ~10 KB minified, zero dependencies, ESM + CJS

## API

```ts
encodeQR(text: string, opts?: {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  minVersion?: number;
  maxVersion?: number;
  forceMask?: number;
}): QrMatrix
```

## License

MIT
