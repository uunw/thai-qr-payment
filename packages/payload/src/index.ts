/**
 * `@thai-qr-payment/payload` — public surface.
 *
 * Wire-format helpers for the Thai QR Payment EMVCo MPM standard. Zero
 * runtime dependencies; works in browsers, Node, Bun, Deno, and edge
 * runtimes (Cloudflare Workers, Vercel Edge, Netlify, Deno Deploy).
 */

export { ThaiQrPaymentBuilder } from './builder.js';
export type { AdditionalDataFields, MerchantInfo, TipMode, VatTqrcInput } from './builder.js';

export { parsePayload } from './parser.js';
export type {
  ParsedAdditionalData,
  ParsedBillPayment,
  ParsedCrc,
  ParsedPayload,
  ParsedPromptPay,
  ParsedTrueMoney,
  ParsedVatTqrc,
  ParsePayloadOptions,
} from './parser.js';

export { normaliseBankAccount, normaliseRecipient } from './recipient.js';
export type { NormalisedRecipient, PromptPayRecipientType } from './recipient.js';

export { formatAmount } from './amount.js';
export type { FormatAmountOptions } from './amount.js';

export { checksum } from './crc.js';

export { decodePersonalMessage, encodePersonalMessage } from './message.js';

export {
  buildSlipVerify,
  buildTrueMoneySlipVerify,
  parseSlipVerify,
  parseTrueMoneySlipVerify,
} from './slip-verify.js';
export type {
  ParsedSlipVerify,
  ParsedTrueMoneySlipVerify,
  SlipVerifyInput,
  TrueMoneySlipVerifyInput,
} from './slip-verify.js';

export { buildBotBarcode, parseBotBarcode } from './barcode.js';
export type { BotBarcodeInput, ParsedBotBarcode } from './barcode.js';

export { encodeField, encodeFields, parseFields, iterateFields } from './tlv.js';
export type { TlvField } from './tlv.js';

export * as Tags from './tags.js';

import { ThaiQrPaymentBuilder } from './builder.js';
import type { PromptPayRecipientType } from './recipient.js';
import type { FormatAmountOptions } from './amount.js';

/**
 * Shorthand for the common "make me a PromptPay QR for this recipient
 * with this amount" use case. Returns the wire payload string.
 *
 * @example
 *   payloadFor({ recipient: '0812345678', amount: 100 })
 *   // → '00020101021229370016A00000067701011101130066812345678530376454...'
 */
export function payloadFor(input: {
  recipient: string;
  amount?: number;
  type?: PromptPayRecipientType;
  fromSatang?: boolean;
}): string {
  const opts: FormatAmountOptions | undefined = input.fromSatang ? { fromSatang: true } : undefined;
  return new ThaiQrPaymentBuilder()
    .promptpay(input.recipient, input.type)
    .amount(input.amount, opts)
    .build();
}
