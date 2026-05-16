/**
 * Interactive demo island. Hydrated on the client via `client:load`
 * from the demo MDX page. Three top-level tabs cover every shipped
 * wire format: payment QR (PromptPay / BillPayment / TrueMoney /
 * BankAccount + optional OTA + optional VAT TQRC), slip-verify
 * Mini-QR (standard + TrueMoney variants), and BOT 1D barcode.
 * Renders live as the user types — same code-path a production app
 * would take, no mocks, no network.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  parsePayload,
  renderCard,
  renderQRSvg,
  encodeQR,
  ThaiQRPaymentBuilder,
  buildSlipVerify,
  parseSlipVerify,
  buildTrueMoneySlipVerify,
  parseTrueMoneySlipVerify,
  buildBOTBarcode,
  parseBOTBarcode,
  type PromptPayRecipientType,
  type ErrorCorrectionLevel,
} from 'thai-qr-payment';

type Tab = 'payment' | 'slip' | 'barcode';
type Mode = 'card' | 'matrix';
type Application = 'promptpay' | 'billPayment' | 'trueMoney' | 'bankAccount';
type SlipVariant = 'standard' | 'trueMoney';

function CopyButton({ text }: { text: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="qr-demo__copy"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? '✓ copied' : '⧉ copy'}
    </button>
  );
}

function Section({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <details open={defaultOpen} className="qr-demo__section">
      <summary>{label}</summary>
      <div className="qr-demo__section-body">{children}</div>
    </details>
  );
}

function PaymentTab(): ReactNode {
  // Core
  const [application, setApplication] = useState<Application>('promptpay');
  const [mode, setMode] = useState<Mode>('card');
  const [ecc, setEcc] = useState<ErrorCorrectionLevel>('M');
  // PromptPay
  const [recipient, setRecipient] = useState('0812345678');
  const [recipientType, setRecipientType] = useState<PromptPayRecipientType | 'auto'>('auto');
  const [otaCode, setOtaCode] = useState('');
  // BankAccount
  const [bankCode, setBankCode] = useState('014');
  const [accountNo, setAccountNo] = useState('1234567890');
  // BillPayment
  const [billerId, setBillerId] = useState('099400016550100');
  const [ref1, setRef1] = useState('CUST001');
  const [ref2, setRef2] = useState('');
  const [crossBorder, setCrossBorder] = useState(false);
  // TrueMoney
  const [tmMobile, setTmMobile] = useState('0801111111');
  const [tmMessage, setTmMessage] = useState('Hello');
  // Amount + merchant
  const [amount, setAmount] = useState('50');
  const [merchantName, setMerchantName] = useState('Acme Coffee');
  const [merchantCity, setMerchantCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [mcc, setMcc] = useState('');
  // Additional data
  const [billNumber, setBillNumber] = useState('');
  const [terminalLabel, setTerminalLabel] = useState('');
  const [storeLabel, setStoreLabel] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  // VAT TQRC
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatBranch, setVatBranch] = useState('0001');
  const [vatRate, setVatRate] = useState('7');
  const [vatAmount, setVatAmount] = useState('3.27');
  // Tip
  const [tipMode, setTipMode] = useState<'off' | 'prompt' | 'fixed' | 'percentage'>('off');
  const [tipValue, setTipValue] = useState('5');

  const result = useMemo(() => {
    try {
      const parsedAmount = amount.trim() === '' ? undefined : Number.parseFloat(amount);
      const amt =
        parsedAmount != null && Number.isFinite(parsedAmount) && parsedAmount > 0
          ? parsedAmount
          : undefined;

      // For matrix-only mode + simple PromptPay, use payloadFor shortcut.
      // Otherwise compose via builder so every advanced option round-trips.
      const builder = new ThaiQRPaymentBuilder();

      if (application === 'promptpay') {
        builder.promptpay(recipient, recipientType === 'auto' ? undefined : recipientType);
        if (otaCode.length === 10) builder.ota(otaCode);
      } else if (application === 'bankAccount') {
        builder.bankAccount(bankCode, accountNo);
        if (otaCode.length === 10) builder.ota(otaCode);
      } else if (application === 'billPayment') {
        builder.billPayment({
          billerId,
          reference1: ref1 || undefined,
          reference2: ref2 || undefined,
          crossBorder,
        });
      } else {
        builder.trueMoney(tmMobile, {
          amount: amt,
          message: tmMessage || undefined,
        });
      }

      if (amt != null && application !== 'trueMoney') builder.amount(amt);

      if (merchantName || merchantCity || postalCode || mcc) {
        builder.merchant({
          name: merchantName || undefined,
          city: merchantCity || undefined,
          postalCode: postalCode || undefined,
          categoryCode: mcc || undefined,
        });
      }

      const addl: Record<string, string> = {};
      if (billNumber) addl.billNumber = billNumber;
      if (terminalLabel) addl.terminalLabel = terminalLabel;
      if (storeLabel) addl.storeLabel = storeLabel;
      if (referenceLabel) addl.referenceLabel = referenceLabel;
      if (Object.keys(addl).length > 0) builder.additionalData(addl);

      if (vatEnabled && vatBranch.length === 4 && vatAmount) {
        builder.vatTqrc({
          sellerTaxBranchId: vatBranch,
          vatRate: vatRate || undefined,
          vatAmount,
        });
      }

      if (tipMode === 'prompt') builder.tipPolicy({ mode: 'prompt' });
      else if (tipMode === 'fixed' && tipValue) {
        builder.tipPolicy({ mode: 'fixed', value: Number.parseFloat(tipValue) });
      } else if (tipMode === 'percentage' && tipValue) {
        builder.tipPolicy({ mode: 'percentage', value: Number.parseFloat(tipValue) });
      }

      const wire = builder.build();
      const parsed = parsePayload(wire);
      // Render directly from the wire so every application path
      // (PromptPay / BankAccount / BillPayment / TrueMoney) shows the
      // exact bytes the builder produced. The card overlay still uses
      // the human inputs above for the title strip.
      const matrix = encodeQR(wire, { errorCorrectionLevel: ecc });
      const svg =
        mode === 'card'
          ? renderCard(matrix, {
              merchantName: merchantName || undefined,
              amountLabel: amt != null ? `฿ ${amt.toFixed(2)}` : undefined,
            })
          : renderQRSvg(matrix, { size: 320, quietZone: 4 });

      return { ok: true as const, wire, parsed, svg };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }, [
    application,
    mode,
    ecc,
    recipient,
    recipientType,
    otaCode,
    bankCode,
    accountNo,
    billerId,
    ref1,
    ref2,
    crossBorder,
    tmMobile,
    tmMessage,
    amount,
    merchantName,
    merchantCity,
    postalCode,
    mcc,
    billNumber,
    terminalLabel,
    storeLabel,
    referenceLabel,
    vatEnabled,
    vatBranch,
    vatRate,
    vatAmount,
    tipMode,
    tipValue,
  ]);

  return (
    <div className="qr-demo__grid">
      <form className="qr-demo__form" onSubmit={(e) => e.preventDefault()}>
        <div className="qr-demo__row">
          <label>
            <span>Application</span>
            <select
              value={application}
              onChange={(e) => setApplication(e.target.value as Application)}
            >
              <option value="promptpay">PromptPay credit transfer</option>
              <option value="bankAccount">PromptPay → bank account</option>
              <option value="billPayment">Bill payment</option>
              <option value="trueMoney">TrueMoney Wallet</option>
            </select>
          </label>
          <label>
            <span>Output</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="card">Branded card</option>
              <option value="matrix">Bare matrix</option>
            </select>
          </label>
        </div>

        {application === 'promptpay' && (
          <div className="qr-demo__row">
            <label>
              <span>Recipient</span>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0812345678 / 1234567890123 / 15-digit eWallet"
              />
            </label>
            <label>
              <span>Type</span>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as typeof recipientType)}
              >
                <option value="auto">auto-detect</option>
                <option value="mobile">mobile (10)</option>
                <option value="nationalId">nationalId (13)</option>
                <option value="eWallet">eWallet (15)</option>
              </select>
            </label>
          </div>
        )}

        {application === 'bankAccount' && (
          <div className="qr-demo__row">
            <label>
              <span>Bank code (3)</span>
              <input
                type="text"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                placeholder="014"
                maxLength={3}
              />
            </label>
            <label>
              <span>Account #</span>
              <input
                type="text"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="1234567890"
              />
            </label>
          </div>
        )}

        {(application === 'promptpay' || application === 'bankAccount') && (
          <label>
            <span>OTA code (10 chars, optional — swaps AID to one-time-authorization)</span>
            <input
              type="text"
              value={otaCode}
              onChange={(e) => setOtaCode(e.target.value)}
              placeholder="1234567890"
              maxLength={10}
            />
          </label>
        )}

        {application === 'billPayment' && (
          <>
            <label>
              <span>Biller ID (15 digits)</span>
              <input
                type="text"
                value={billerId}
                onChange={(e) => setBillerId(e.target.value)}
                placeholder="099400016550100"
              />
            </label>
            <div className="qr-demo__row">
              <label>
                <span>Reference 1</span>
                <input
                  type="text"
                  value={ref1}
                  onChange={(e) => setRef1(e.target.value)}
                  placeholder="INV001"
                />
              </label>
              <label>
                <span>Reference 2</span>
                <input
                  type="text"
                  value={ref2}
                  onChange={(e) => setRef2(e.target.value)}
                  placeholder="optional"
                />
              </label>
            </div>
            <label className="qr-demo__checkbox">
              <input
                type="checkbox"
                checked={crossBorder}
                onChange={(e) => setCrossBorder(e.target.checked)}
              />
              <span>Cross-border (ASEAN PayNow / DuitNow / QRIS interop)</span>
            </label>
          </>
        )}

        {application === 'trueMoney' && (
          <>
            <label>
              <span>TrueMoney mobile</span>
              <input
                type="text"
                value={tmMobile}
                onChange={(e) => setTmMobile(e.target.value)}
                placeholder="0801111111"
              />
            </label>
            <label>
              <span>Personal message (UTF-16BE in tag 81)</span>
              <input
                type="text"
                value={tmMessage}
                onChange={(e) => setTmMessage(e.target.value)}
                placeholder="optional"
              />
            </label>
          </>
        )}

        <div className="qr-demo__row">
          <label>
            <span>Amount (THB)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="static if blank"
            />
          </label>
          <label>
            <span>ECC level</span>
            <select value={ecc} onChange={(e) => setEcc(e.target.value as ErrorCorrectionLevel)}>
              <option value="L">L — ~7%</option>
              <option value="M">M — ~15%</option>
              <option value="Q">Q — ~25%</option>
              <option value="H">H — ~30%</option>
            </select>
          </label>
        </div>

        <Section label="Merchant info">
          <label>
            <span>Name (≤ 25)</span>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Acme Coffee"
              maxLength={25}
            />
          </label>
          <div className="qr-demo__row">
            <label>
              <span>City (≤ 15)</span>
              <input
                type="text"
                value={merchantCity}
                onChange={(e) => setMerchantCity(e.target.value)}
                placeholder="BANGKOK"
                maxLength={15}
              />
            </label>
            <label>
              <span>Postal code</span>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="10310"
                maxLength={10}
              />
            </label>
          </div>
          <label>
            <span>MCC (ISO 18245, 4 digits)</span>
            <input
              type="text"
              value={mcc}
              onChange={(e) => setMcc(e.target.value)}
              placeholder="5814"
              maxLength={4}
            />
          </label>
        </Section>

        <Section label="Additional data">
          <div className="qr-demo__row">
            <label>
              <span>Bill #</span>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="INV-001"
                maxLength={26}
              />
            </label>
            <label>
              <span>Terminal</span>
              <input
                type="text"
                value={terminalLabel}
                onChange={(e) => setTerminalLabel(e.target.value)}
                placeholder="T01"
                maxLength={26}
              />
            </label>
          </div>
          <div className="qr-demo__row">
            <label>
              <span>Store</span>
              <input
                type="text"
                value={storeLabel}
                onChange={(e) => setStoreLabel(e.target.value)}
                placeholder="Branch 1"
                maxLength={26}
              />
            </label>
            <label>
              <span>Reference</span>
              <input
                type="text"
                value={referenceLabel}
                onChange={(e) => setReferenceLabel(e.target.value)}
                placeholder="REF-X"
                maxLength={26}
              />
            </label>
          </div>
        </Section>

        <Section label="VAT TQRC (Thai e-tax receipt)">
          <label className="qr-demo__checkbox">
            <input
              type="checkbox"
              checked={vatEnabled}
              onChange={(e) => setVatEnabled(e.target.checked)}
            />
            <span>Emit tag 80</span>
          </label>
          {vatEnabled && (
            <>
              <div className="qr-demo__row">
                <label>
                  <span>Seller tax branch (4)</span>
                  <input
                    type="text"
                    value={vatBranch}
                    onChange={(e) => setVatBranch(e.target.value)}
                    maxLength={4}
                  />
                </label>
                <label>
                  <span>VAT rate (1–5)</span>
                  <input
                    type="text"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    placeholder="7"
                    maxLength={5}
                  />
                </label>
              </div>
              <label>
                <span>VAT amount (1–13)</span>
                <input
                  type="text"
                  value={vatAmount}
                  onChange={(e) => setVatAmount(e.target.value)}
                  placeholder="3.27"
                  maxLength={13}
                />
              </label>
            </>
          )}
        </Section>

        <Section label="Tip policy">
          <div className="qr-demo__row">
            <label>
              <span>Mode</span>
              <select
                value={tipMode}
                onChange={(e) => setTipMode(e.target.value as typeof tipMode)}
              >
                <option value="off">off</option>
                <option value="prompt">prompt at scan</option>
                <option value="fixed">fixed amount</option>
                <option value="percentage">percentage</option>
              </select>
            </label>
            {(tipMode === 'fixed' || tipMode === 'percentage') && (
              <label>
                <span>{tipMode === 'fixed' ? 'THB' : '%'}</span>
                <input
                  type="number"
                  step="0.01"
                  value={tipValue}
                  onChange={(e) => setTipValue(e.target.value)}
                />
              </label>
            )}
          </div>
        </Section>
      </form>

      <OutputPanel result={result} downloadName={`thai-qr-${application}`} />
    </div>
  );
}

function SlipTab(): ReactNode {
  const [variant, setVariant] = useState<SlipVariant>('standard');
  const [sendingBank, setSendingBank] = useState('002');
  const [transRef, setTransRef] = useState('0002123123121200011');
  const [eventType, setEventType] = useState('P2P');
  const [transactionId, setTransactionId] = useState('TXN0001234567');
  const [date, setDate] = useState('25012024');

  const result = useMemo(() => {
    try {
      const wire =
        variant === 'standard'
          ? buildSlipVerify({ sendingBank, transRef })
          : buildTrueMoneySlipVerify({ eventType, transactionId, date });
      const parsed =
        variant === 'standard' ? parseSlipVerify(wire) : parseTrueMoneySlipVerify(wire);
      return { ok: true as const, wire, parsed };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }, [variant, sendingBank, transRef, eventType, transactionId, date]);

  return (
    <div className="qr-demo__grid">
      <form className="qr-demo__form" onSubmit={(e) => e.preventDefault()}>
        <label>
          <span>Variant</span>
          <select value={variant} onChange={(e) => setVariant(e.target.value as SlipVariant)}>
            <option value="standard">Standard slip-verify (Bank of Thailand)</option>
            <option value="trueMoney">TrueMoney slip-verify (lowercase CRC)</option>
          </select>
        </label>

        {variant === 'standard' ? (
          <>
            <label>
              <span>Sending bank code (3 digits)</span>
              <input
                type="text"
                value={sendingBank}
                onChange={(e) => setSendingBank(e.target.value)}
                maxLength={3}
                placeholder="002 (BBL)"
              />
            </label>
            <label>
              <span>Transaction reference</span>
              <input
                type="text"
                value={transRef}
                onChange={(e) => setTransRef(e.target.value)}
                placeholder="0002123123121200011"
              />
            </label>
          </>
        ) : (
          <>
            <label>
              <span>Event type</span>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="P2P"
              />
            </label>
            <label>
              <span>Transaction ID</span>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="TXN0001234567"
              />
            </label>
            <label>
              <span>Date (DDMMYYYY)</span>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                maxLength={8}
                placeholder="25012024"
              />
            </label>
          </>
        )}
      </form>

      <div className="qr-demo__output">
        {result.ok ? (
          <>
            <div className="qr-demo__wire-card">
              <strong>Wire payload</strong>
              <CopyButton text={result.wire} />
              <code className="qr-demo__wire">{result.wire}</code>
            </div>
            <details open>
              <summary>Parsed</summary>
              <pre>{JSON.stringify(result.parsed, null, 2)}</pre>
            </details>
          </>
        ) : (
          <div className="qr-demo__error" role="alert">
            <strong>Error</strong>
            <code>{result.error}</code>
          </div>
        )}
      </div>
    </div>
  );
}

function BarcodeTab(): ReactNode {
  const [billerId, setBillerId] = useState('099400016550100');
  const [ref1, setRef1] = useState('123456789012');
  const [ref2, setRef2] = useState('670429');
  const [amount, setAmount] = useState('3649.22');

  const result = useMemo(() => {
    try {
      const parsedAmount = amount.trim() === '' ? undefined : Number.parseFloat(amount);
      const amt =
        parsedAmount != null && Number.isFinite(parsedAmount) && parsedAmount >= 0
          ? parsedAmount
          : undefined;
      const wire = buildBOTBarcode({
        billerId,
        ref1,
        ref2: ref2 || undefined,
        amount: amt,
      });
      const parsed = parseBOTBarcode(wire);
      return { ok: true as const, wire, parsed };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }, [billerId, ref1, ref2, amount]);

  return (
    <div className="qr-demo__grid">
      <form className="qr-demo__form" onSubmit={(e) => e.preventDefault()}>
        <label>
          <span>Biller ID (15 digits, zero-padded)</span>
          <input
            type="text"
            value={billerId}
            onChange={(e) => setBillerId(e.target.value)}
            maxLength={15}
          />
        </label>
        <label>
          <span>Reference 1 (customer #)</span>
          <input type="text" value={ref1} onChange={(e) => setRef1(e.target.value)} />
        </label>
        <label>
          <span>Reference 2 (optional)</span>
          <input type="text" value={ref2} onChange={(e) => setRef2(e.target.value)} />
        </label>
        <label>
          <span>Amount (THB, optional — 0 means "enter at counter")</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      </form>

      <div className="qr-demo__output">
        {result.ok ? (
          <>
            <div className="qr-demo__wire-card">
              <strong>Wire (literal `\r` separators)</strong>
              <CopyButton text={result.wire} />
              <code className="qr-demo__wire">{result.wire.replace(/\r/g, '⏎\r')}</code>
            </div>
            <details open>
              <summary>Parsed</summary>
              <pre>{JSON.stringify(result.parsed, null, 2)}</pre>
            </details>
          </>
        ) : (
          <div className="qr-demo__error" role="alert">
            <strong>Error</strong>
            <code>{result.error}</code>
          </div>
        )}
      </div>
    </div>
  );
}

function OutputPanel({
  result,
  downloadName,
}: {
  result: { ok: true; wire: string; parsed: unknown; svg: string } | { ok: false; error: string };
  downloadName: string;
}): ReactNode {
  if (!result.ok) {
    return (
      <div className="qr-demo__output">
        <div className="qr-demo__error" role="alert">
          <strong>Error</strong>
          <code>{result.error}</code>
        </div>
      </div>
    );
  }
  return (
    <div className="qr-demo__output">
      <div
        className="qr-demo__svg"
        aria-label="Live QR preview"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG built locally from typed input
        dangerouslySetInnerHTML={{ __html: result.svg }}
      />
      <div className="qr-demo__actions">
        <a
          className="qr-demo__download"
          download={`${downloadName}.svg`}
          href={`data:image/svg+xml;utf8,${encodeURIComponent(result.svg)}`}
        >
          ↓ SVG
        </a>
        <CopyButton text={result.wire} />
      </div>
      <details>
        <summary>EMVCo wire payload ({result.wire.length} chars)</summary>
        <code className="qr-demo__wire">{result.wire}</code>
      </details>
      <details>
        <summary>Parsed</summary>
        <pre>{JSON.stringify(result.parsed, null, 2)}</pre>
      </details>
    </div>
  );
}

export function QrDemo(): ReactNode {
  const [tab, setTab] = useState<Tab>('payment');
  return (
    <div className="qr-demo">
      <div className="qr-demo__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'payment'}
          className={`qr-demo__tab${tab === 'payment' ? ' qr-demo__tab--active' : ''}`}
          onClick={() => setTab('payment')}
        >
          Payment QR
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'slip'}
          className={`qr-demo__tab${tab === 'slip' ? ' qr-demo__tab--active' : ''}`}
          onClick={() => setTab('slip')}
        >
          Slip Verify
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'barcode'}
          className={`qr-demo__tab${tab === 'barcode' ? ' qr-demo__tab--active' : ''}`}
          onClick={() => setTab('barcode')}
        >
          BOT Barcode
        </button>
      </div>

      {tab === 'payment' && <PaymentTab />}
      {tab === 'slip' && <SlipTab />}
      {tab === 'barcode' && <BarcodeTab />}

      <style>{`
        .qr-demo {
          display: grid;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid var(--sl-color-gray-5);
          border-radius: 12px;
          background: var(--sl-color-bg-nav);
        }
        .qr-demo__tabs {
          display: flex;
          gap: 0.25rem;
          border-bottom: 1px solid var(--sl-color-gray-5);
          padding-bottom: 0.25rem;
          flex-wrap: wrap;
        }
        .qr-demo__tab {
          padding: 0.5rem 1rem;
          border: 1px solid transparent;
          border-radius: 6px;
          background: transparent;
          color: var(--sl-color-text);
          cursor: pointer;
          font: inherit;
          font-weight: 500;
        }
        .qr-demo__tab:hover { background: var(--sl-color-gray-6); }
        .qr-demo__tab--active {
          background: var(--sl-color-accent);
          color: var(--sl-color-white);
        }
        .qr-demo__grid {
          display: grid;
          gap: 1.5rem;
        }
        @media (min-width: 900px) {
          .qr-demo__grid { grid-template-columns: 1fr 1fr; }
        }
        .qr-demo__form {
          display: grid;
          gap: 0.75rem;
          align-content: start;
        }
        .qr-demo__row {
          display: grid;
          gap: 0.75rem;
          grid-template-columns: 1fr 1fr;
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
        .qr-demo__checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }
        .qr-demo__checkbox input { width: auto; }
        .qr-demo__section {
          border: 1px solid var(--sl-color-gray-5);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          background: var(--sl-color-bg);
        }
        .qr-demo__section summary {
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .qr-demo__section-body {
          display: grid;
          gap: 0.75rem;
          padding-top: 0.75rem;
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
        .qr-demo__svg :global(svg) { max-width: 100%; height: auto; }
        .qr-demo__actions {
          display: flex;
          gap: 0.5rem;
        }
        .qr-demo__wire-card {
          display: grid;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: 6px;
          background: var(--sl-color-bg);
          border: 1px solid var(--sl-color-gray-5);
        }
        .qr-demo__wire {
          word-break: break-all;
          font-size: 0.8rem;
          font-family: var(--sl-font-mono, monospace);
        }
        .qr-demo__download,
        .qr-demo__copy {
          padding: 0.5rem 0.875rem;
          border: none;
          border-radius: 6px;
          background: var(--sl-color-accent);
          color: var(--sl-color-white);
          text-decoration: none;
          font: inherit;
          font-size: 0.875rem;
          cursor: pointer;
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
