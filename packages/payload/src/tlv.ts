/**
 * TLV (Tag-Length-Value) primitives for the EMVCo QR wire format.
 *
 * Every field on the wire is `IILLDDDD…` where `II` is the 2-char tag id,
 * `LL` is the 2-char zero-padded byte length, and `DDDD…` is the value.
 * Nested templates (tags 29-31, 62, 64) contain TLV runs in their value
 * slot recursively.
 */

/** A parsed TLV field with its (possibly-nested) value text. */
export interface TlvField {
  readonly tag: string;
  readonly value: string;
}

/** Encode one TLV. The caller guarantees that `tag` is a valid 2-digit id. */
export function encodeField(tag: string, value: string): string {
  const length = value.length.toString(10).padStart(2, '0');
  if (value.length > 99) {
    throw new RangeError(
      `TLV value for tag ${tag} exceeds 99 bytes (got ${value.length}); split across multiple tags`,
    );
  }
  return tag + length + value;
}

/**
 * Encode an array of `[tag, value]` pairs in registration order. Empty or
 * `null`/`undefined` values are filtered out so callers can compose
 * optional fields without an `if` chain.
 */
export function encodeFields(
  pairs: ReadonlyArray<readonly [string, string | null | undefined]>,
): string {
  let out = '';
  for (const [tag, value] of pairs) {
    if (value == null || value === '') continue;
    out += encodeField(tag, value);
  }
  return out;
}

/**
 * Walk a TLV-encoded string and return one field at a time. Stops cleanly
 * at end-of-input; throws on malformed length headers or truncated values.
 *
 * Designed for parsing both the root payload and nested template values
 * — the same algorithm applies at any depth.
 */
export function* iterateFields(input: string): IterableIterator<TlvField> {
  let cursor = 0;
  while (cursor < input.length) {
    if (cursor + 4 > input.length) {
      throw new SyntaxError(`Truncated TLV header at offset ${cursor}`);
    }
    const tag = input.slice(cursor, cursor + 2);
    const lengthText = input.slice(cursor + 2, cursor + 4);
    const length = Number.parseInt(lengthText, 10);
    if (!Number.isFinite(length) || lengthText.length !== 2) {
      throw new SyntaxError(`Invalid TLV length "${lengthText}" at offset ${cursor + 2}`);
    }
    const valueStart = cursor + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > input.length) {
      throw new SyntaxError(
        `TLV value for tag ${tag} runs past end of input (need ${length} bytes from offset ${valueStart})`,
      );
    }
    yield { tag, value: input.slice(valueStart, valueEnd) };
    cursor = valueEnd;
  }
}

/** Convenience over `iterateFields` — collect into a Map by tag id. */
export function parseFields(input: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const field of iterateFields(input)) {
    map.set(field.tag, field.value);
  }
  return map;
}
