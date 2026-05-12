#!/usr/bin/env node
/**
 * `thai-qr-payment` CLI entry point.
 *
 * Builds the wire payload, encodes the QR matrix, and renders the
 * requested output (full card, bare matrix, or raw payload string).
 * Writes to stdout by default; `-o <path>` redirects to a file.
 */

import { writeFile } from 'node:fs/promises';
import { payloadFor } from '@thai-qr-payment/payload';
import { encodeQR } from '@thai-qr-payment/qr';
import { renderCard, renderQrSvg } from '@thai-qr-payment/render';
import { HELP_TEXT, parseArgs } from './args.js';

declare const VERSION: string;

async function main(): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`error: ${(err as Error).message}\n\n${HELP_TEXT}`);
    return 2;
  }

  if (parsed.help || (!parsed.recipient && !parsed.version)) {
    process.stdout.write(HELP_TEXT);
    return parsed.help ? 0 : 2;
  }
  if (parsed.version) {
    process.stdout.write(`${typeof VERSION === 'string' ? VERSION : 'dev'}\n`);
    return 0;
  }

  const recipient = parsed.recipient as string;
  const format = parsed.format ?? 'card';
  const errorCorrectionLevel = parsed.errorCorrection ?? 'M';

  let output: string;
  if (format === 'payload') {
    output = payloadFor({
      recipient,
      amount: parsed.amount,
      type: parsed.type,
      fromSatang: parsed.fromSatang,
    });
  } else {
    const wire = payloadFor({
      recipient,
      amount: parsed.amount,
      type: parsed.type,
      fromSatang: parsed.fromSatang,
    });
    const matrix = encodeQR(wire, { errorCorrectionLevel });
    if (format === 'matrix') {
      output = renderQrSvg(matrix, { size: parsed.size });
    } else {
      output = renderCard(matrix, {
        theme: parsed.theme,
        merchantName: parsed.merchantName,
        amountLabel: parsed.amount != null ? `฿ ${parsed.amount.toFixed(2)}` : undefined,
      });
    }
  }

  if (parsed.output != null) {
    await writeFile(parsed.output, output, 'utf8');
    process.stderr.write(`wrote ${parsed.output}\n`);
  } else {
    process.stdout.write(output);
    if (!output.endsWith('\n')) process.stdout.write('\n');
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`fatal: ${(err as Error).message}\n`);
    process.exit(1);
  },
);
