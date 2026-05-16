// Low-level TLV codec — `encodeField`, `encodeFields`, `parseFields`,
// `iterateFields`. Reach for these when you need a tag the builder
// doesn't expose, or to inspect an unknown payload byte-by-byte.
import { encodeField, encodeFields, parseFields, iterateFields, Tags } from 'thai-qr-payment';

// Encode a single field. Length is auto-prefixed.
console.log('single  :', encodeField(Tags.TAG_COUNTRY_CODE, 'TH')); // → "5802TH"

// Encode a list of fields in order.
console.log(
  'list    :',
  encodeFields([
    [Tags.TAG_PAYLOAD_FORMAT, '01'],
    [Tags.TAG_POINT_OF_INITIATION, '11'],
    [Tags.TAG_COUNTRY_CODE, 'TH'],
  ]),
);

// Decode a flat sub-template into a Map.
const wire = '00020101021129370016A000000677010111011300668123456785303764540550.005802TH63042042';
const top = parseFields(wire);
console.log('map     :', Array.from(top.entries()));

// Walk every TLV field (preserves order, supports nesting via re-iterate).
for (const field of iterateFields(wire)) {
  console.log(`tag ${field.id} (len ${field.length}) = ${field.value}`);
}
