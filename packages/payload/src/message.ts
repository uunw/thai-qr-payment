/**
 * Personal-message codec for tag 81 (TrueMoney Wallet).
 *
 * The wire format is the UTF-16BE encoding of the message, expressed as
 * uppercase hex. Each Unicode code unit becomes 4 hex chars; `Hello` →
 * `00480065006C006C006F`. Length on the TLV header counts the hex chars,
 * not the source characters.
 *
 * Browser/edge-safe — no `node:buffer` reach-through.
 */

/** Encode a personal message string to UTF-16BE hex (uppercase). */
export function encodePersonalMessage(message: string): string {
  let out = '';
  for (let i = 0; i < message.length; i += 1) {
    const code = message.charCodeAt(i);
    out += code.toString(16).padStart(4, '0').toUpperCase();
  }
  return out;
}

/** Decode a UTF-16BE hex string back to its source message. */
export function decodePersonalMessage(hex: string): string {
  if (hex.length % 4 !== 0) {
    throw new SyntaxError(`Personal-message hex must be a multiple of 4 chars; got ${hex.length}`);
  }
  let out = '';
  for (let i = 0; i < hex.length; i += 4) {
    const unit = Number.parseInt(hex.slice(i, i + 4), 16);
    if (!Number.isFinite(unit)) {
      throw new SyntaxError(`Invalid hex unit "${hex.slice(i, i + 4)}" at offset ${i}`);
    }
    out += String.fromCharCode(unit);
  }
  return out;
}
