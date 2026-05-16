/**
 * Interactive demo island. Hydrated on the client via `client:load`
 * from the demo MDX page. Renders the QR live as the user types — same
 * code-path a production app would take, no mocks.
 */
import { useMemo, useState } from 'react';
import {
  payloadFor,
  parsePayload,
  renderThaiQRPayment,
  renderThaiQRPaymentMatrix,
  type PromptPayRecipientType,
  type ErrorCorrectionLevel,
} from 'thai-qr-payment';

type Mode = 'card' | 'matrix';

export function QrDemo(): JSX.Element {
  const [recipient, setRecipient] = useState('0812345678');
  const [amount, setAmount] = useState<string>('50');
  const [merchant, setMerchant] = useState('Acme Coffee');
  const [type, setType] = useState<PromptPayRecipientType | 'auto'>('auto');
  const [ecc, setEcc] = useState<ErrorCorrectionLevel>('M');
  const [mode, setMode] = useState<Mode>('card');

  const result = useMemo(() => {
    try {
      const parsedAmount = amount.trim() === '' ? undefined : Number.parseFloat(amount);
      const amt =
        parsedAmount != null && Number.isFinite(parsedAmount) && parsedAmount > 0
          ? parsedAmount
          : undefined;
      const opts = {
        recipient,
        amount: amt,
        recipientType: type === 'auto' ? undefined : type,
        errorCorrectionLevel: ecc,
      };
      const wire = payloadFor({
        recipient,
        amount: amt,
        type: type === 'auto' ? undefined : type,
      });
      const parsed = parsePayload(wire);
      const svg =
        mode === 'card'
          ? renderThaiQRPayment({
              ...opts,
              merchantName: merchant || undefined,
              amountLabel: amt != null ? `฿ ${amt.toFixed(2)}` : undefined,
            })
          : renderThaiQRPaymentMatrix({ ...opts, size: 320, quietZone: 4 });
      return { ok: true as const, wire, parsed, svg };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }, [recipient, amount, merchant, type, ecc, mode]);

  return (
    <div className="qr-demo">
      <form
        className="qr-demo__form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label>
          <span>Recipient</span>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0812345678"
          />
        </label>

        <label>
          <span>Amount (THB)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="optional"
          />
        </label>

        <label>
          <span>Merchant name</span>
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Acme Coffee"
            disabled={mode !== 'card'}
          />
        </label>

        <label>
          <span>Recipient type</span>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="auto">auto-detect</option>
            <option value="mobile">mobile (10 digits)</option>
            <option value="nationalId">nationalId (13 digits)</option>
            <option value="eWallet">eWallet (15 digits)</option>
          </select>
        </label>

        <label>
          <span>ECC level</span>
          <select value={ecc} onChange={(e) => setEcc(e.target.value as ErrorCorrectionLevel)}>
            <option value="L">L — low (~7% recovery)</option>
            <option value="M">M — medium (~15%)</option>
            <option value="Q">Q — quartile (~25%)</option>
            <option value="H">H — high (~30%)</option>
          </select>
        </label>

        <label>
          <span>Output</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="card">Branded card</option>
            <option value="matrix">Bare matrix</option>
          </select>
        </label>
      </form>

      <div className="qr-demo__output">
        {result.ok ? (
          <>
            <div
              className="qr-demo__svg"
              aria-label="Live QR preview"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG built locally from typed input
              dangerouslySetInnerHTML={{ __html: result.svg }}
            />
            <details>
              <summary>EMVCo wire payload</summary>
              <code className="qr-demo__wire">{result.wire}</code>
            </details>
            <details>
              <summary>Parsed</summary>
              <pre>{JSON.stringify(result.parsed, null, 2)}</pre>
            </details>
            <a
              className="qr-demo__download"
              download={`thai-qr-payment-${recipient}.svg`}
              href={`data:image/svg+xml;utf8,${encodeURIComponent(result.svg)}`}
            >
              ↓ download SVG
            </a>
          </>
        ) : (
          <div className="qr-demo__error" role="alert">
            <strong>Error</strong>
            <code>{result.error}</code>
          </div>
        )}
      </div>

      <style>{`
        .qr-demo {
          display: grid;
          gap: 1.5rem;
          padding: 1.5rem;
          border: 1px solid var(--sl-color-gray-5);
          border-radius: 12px;
          background: var(--sl-color-bg-nav);
        }
        @media (min-width: 768px) {
          .qr-demo { grid-template-columns: 1fr 1fr; }
        }
        .qr-demo__form {
          display: grid;
          gap: 0.75rem;
        }
        .qr-demo__form label {
          display: grid;
          gap: 0.25rem;
          font-size: 0.875rem;
        }
        .qr-demo__form input,
        .qr-demo__form select {
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--sl-color-gray-5);
          background: var(--sl-color-bg);
          color: var(--sl-color-text);
          font: inherit;
        }
        .qr-demo__output {
          display: grid;
          gap: 0.75rem;
          align-content: start;
        }
        .qr-demo__svg {
          background: white;
          border-radius: 12px;
          padding: 0.5rem;
          display: flex;
          justify-content: center;
        }
        .qr-demo__svg :global(svg) {
          max-width: 100%;
          height: auto;
        }
        .qr-demo__wire {
          word-break: break-all;
          font-size: 0.8rem;
        }
        .qr-demo__download {
          align-self: start;
          padding: 0.5rem 0.875rem;
          border-radius: 6px;
          background: var(--sl-color-accent);
          color: var(--sl-color-white);
          text-decoration: none;
          font-size: 0.875rem;
        }
        .qr-demo__error {
          padding: 1rem;
          border-radius: 6px;
          background: var(--sl-color-red-low);
          color: var(--sl-color-red-high);
        }
        details summary {
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
