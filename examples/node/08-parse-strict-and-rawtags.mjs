// `parsePayload` extras: strict CRC mode, truncated-CRC auto-fix
// bookkeeping, and raw-tag accessors for unknown / future tags.
import { ThaiQRPaymentBuilder, parsePayload, checksum } from 'thai-qr-payment';

const good = new ThaiQRPaymentBuilder().promptpay('0812345678').amount(50).build();

// Strict mode: throws on mismatched / missing CRC.
const parsed = parsePayload(good, { strict: true });
console.log('strict-ok :', parsed.crc);

// Truncated CRC (banks sometimes drop the trailing 1–3 hex chars).
const truncated = `${good.slice(0, -2)}`; // chop the last 2 chars of CRC
try {
  const recovered = parsePayload(truncated); // lax mode auto-fixes
  console.log('recovered :', recovered.crc); // { value: <2 chars>, valid: true, truncated: true }
} catch (err) {
  console.log('lax also failed:', err.message);
}

// Tampered CRC — strict throws; lax also throws because the recompute
// can't recover (it's not a truncation, it's a swap). Wrap both calls.
const tampered = `${good.slice(0, -4)}DEAD`;
try {
  parsePayload(tampered);
} catch (err) {
  console.log('lax-bad   :', err.message);
}
try {
  parsePayload(tampered, { strict: true });
} catch (err) {
  console.log('strict-bad:', err.message);
}

// Raw tag access — read any tag (known or unknown) directly.
console.log('tag 53    :', parsed.getTagValue('53')); // currency code
console.log('tag 58    :', parsed.getTagValue('58')); // country code
console.log('tag 29.00 :', parsed.getTagValue('29', '00')); // AID inside merchant template

// `rawTags` exposes the entire decoded tree for ad-hoc inspection.
console.log(
  'raw       :',
  parsed.rawTags.map((t) => `${t.id}=${t.value.slice(0, 16)}…`),
);

// `checksum()` is the same helper the builder + parser use internally.
const body = good.slice(0, -4); // body includes the `6304` CRC header
console.log('crc check :', checksum(body) === parsed.crc.value);
