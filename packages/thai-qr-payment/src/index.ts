/**
 * `thai-qr-payment` — one-stop umbrella for the @thai-qr-payment ecosystem.
 *
 * The default entry re-exports the **lightweight** surface (payload +
 * QR encoder + SVG renderer). Assets stay out of the default bundle so
 * an `import { payloadFor } from 'thai-qr-payment'` doesn't drag the
 * brand SVGs along. Renderer helpers still work — `@thai-qr-payment/render`
 * imports assets directly at runtime; consumers just don't pay for them
 * unless they actually call `renderThaiQRPayment` / `renderCard`.
 *
 *   import { payloadFor, ThaiQRPaymentBuilder } from 'thai-qr-payment';
 *   import { encodeQR } from 'thai-qr-payment';
 *   import { renderThaiQRPayment } from 'thai-qr-payment';
 *
 * For explicit access to the brand SVGs reach for the sub-path entry:
 *
 *   import { COLOR_LOGOS, colorLogo } from 'thai-qr-payment/assets';
 *
 * Sub-paths exist for every slice so you can drop in only what you need:
 *
 *   import { ThaiQRPaymentBuilder } from 'thai-qr-payment/payload';
 *   import { encodeQR }            from 'thai-qr-payment/qr';
 *   import { renderCard }          from 'thai-qr-payment/render';
 *   import { COLOR_LOGOS }         from 'thai-qr-payment/assets';
 *
 * The scoped `@thai-qr-payment/*` packages remain available for users
 * who want the absolute minimum dep graph (e.g. payload-only on edge
 * runtimes).
 */

export * from '@thai-qr-payment/payload';
export * from '@thai-qr-payment/qr';
export * from '@thai-qr-payment/render';
