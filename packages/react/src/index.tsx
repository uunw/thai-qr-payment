/**
 * `@thai-qr-payment/react` — drop-in React components.
 *
 * Two surfaces:
 *  - `<ThaiQrPayment />` renders the full Thai QR Payment card
 *  - `<ThaiQrPaymentMatrix />` renders just the QR matrix
 *
 * Both components produce an inline SVG. The underlying SVG string is
 * generated via the framework-agnostic `@thai-qr-payment/render`, then
 * injected with `dangerouslySetInnerHTML` so the result can be styled
 * with CSS / animated / passed to print pipelines just like any DOM
 * SVG.
 */

import { useMemo, type CSSProperties, type ReactElement } from 'react';
import type { PromptPayRecipientType } from '@thai-qr-payment/payload';
import type { ErrorCorrectionLevel } from '@thai-qr-payment/qr';
import {
  renderThaiQrPayment,
  renderThaiQrPaymentMatrix,
  type CardOptions,
  type QrSvgOptions,
} from '@thai-qr-payment/render';

export interface ThaiQrPaymentProps extends CardOptions {
  recipient: string;
  amount?: number;
  recipientType?: PromptPayRecipientType;
  fromSatang?: boolean;
  errorCorrectionLevel?: ErrorCorrectionLevel;
  className?: string;
  style?: CSSProperties;
  /** Optional aria-label override; defaults to "Thai QR Payment for <recipient>". */
  ariaLabel?: string;
}

export interface ThaiQrPaymentMatrixProps extends QrSvgOptions {
  recipient: string;
  amount?: number;
  recipientType?: PromptPayRecipientType;
  fromSatang?: boolean;
  errorCorrectionLevel?: ErrorCorrectionLevel;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

/** Full Thai QR Payment card (header logo + QR + amount). */
export function ThaiQrPayment({
  recipient,
  amount,
  recipientType,
  fromSatang,
  errorCorrectionLevel,
  className,
  style,
  ariaLabel,
  ...cardOptions
}: ThaiQrPaymentProps): ReactElement {
  const svg = useMemo(
    () =>
      renderThaiQrPayment({
        recipient,
        amount,
        recipientType,
        fromSatang,
        errorCorrectionLevel,
        ...cardOptions,
      }),
    [recipient, amount, recipientType, fromSatang, errorCorrectionLevel, cardOptions],
  );

  return (
    <span
      role="img"
      aria-label={ariaLabel ?? `Thai QR Payment for ${recipient}`}
      className={className}
      style={style}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is generated locally from typed input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Just the QR matrix (no card chrome). */
export function ThaiQrPaymentMatrix({
  recipient,
  amount,
  recipientType,
  fromSatang,
  errorCorrectionLevel,
  className,
  style,
  ariaLabel,
  ...qrOptions
}: ThaiQrPaymentMatrixProps): ReactElement {
  const svg = useMemo(
    () =>
      renderThaiQrPaymentMatrix({
        recipient,
        amount,
        recipientType,
        fromSatang,
        errorCorrectionLevel,
        ...qrOptions,
      }),
    [recipient, amount, recipientType, fromSatang, errorCorrectionLevel, qrOptions],
  );

  return (
    <span
      role="img"
      aria-label={ariaLabel ?? `QR code for ${recipient}`}
      className={className}
      style={style}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is generated locally from typed input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
