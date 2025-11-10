import { useMemo, useState } from "react";
import QRCode from "qrcode";
import classNames from "classnames";
import { Toaster, toast } from "react-hot-toast";

const ETH_DECIMALS = 18n;
const TEN = 10n;

const toWeiString = (value) => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Enter an amount in ETH.");
  }

  if (!/^\d*(\.\d*)?$/.test(normalized) || normalized === ".") {
    throw new Error("Amount must be a valid number.");
  }

  const [rawWhole = "", rawFraction = ""] = normalized.split(".");
  if (rawFraction.length > Number(ETH_DECIMALS)) {
    throw new Error("ETH supports up to 18 decimal places.");
  }

  const wholePart = rawWhole === "" ? "0" : rawWhole;
  const fractionPart = rawFraction;

  const paddedFraction = `${fractionPart}${"0".repeat(
    Number(ETH_DECIMALS) - fractionPart.length
  )}`.slice(0, Number(ETH_DECIMALS));

  const wholeWei = BigInt(wholePart) * TEN ** ETH_DECIMALS;
  const fractionalWei =
    paddedFraction === "" ? 0n : BigInt(paddedFraction || "0");

  const total = wholeWei + fractionalWei;
  if (total <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  return total.toString();
};

const buildEthereumUri = (address, wei, note) => {
  const base = `ethereum:${address}?value=${wei}`;
  if (!note) {
    return base;
  }

  return `${base}&message=${encodeURIComponent(note)}`;
};

const inputStyles =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-slate-100 placeholder-slate-400 shadow-inner transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-700 dark:bg-slate-900/70";
const buttonBaseStyles =
  "inline-flex items-center justify-center rounded-2xl px-4 py-3 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60";

function App() {
  const [address, setAddress] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [note, setNote] = useState("");
  const [encodedUri, setEncodedUri] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const hasResult = useMemo(
    () => Boolean(encodedUri && qrDataUrl),
    [encodedUri, qrDataUrl]
  );

  const handleGenerate = async (event) => {
    event.preventDefault();

    const trimmedAddress = address.trim();
    const trimmedNote = note.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      toast.error("Enter a valid Ethereum address.");
      return;
    }

    let weiString;
    try {
      weiString = toWeiString(amountEth);
    } catch (error) {
      toast.error(error.message);
      return;
    }

    const uri = buildEthereumUri(trimmedAddress, weiString, trimmedNote);

    try {
      setIsGenerating(true);
      const dataUrl = await QRCode.toDataURL(uri, {
        width: 320,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#f8fafc",
        },
      });
      setEncodedUri(uri);
      setQrDataUrl(dataUrl);
      toast.success("QR code ready!");
    } catch {
      toast.error("Unable to generate QR code. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `ethereum-qr-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen flex-col justify-between">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#f8fafc",
            borderRadius: "1rem",
          },
        }}
      />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="w-full max-w-5xl">
          <div className="mx-auto grid gap-10 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg transition-colors dark:border-slate-800 dark:bg-slate-900/60 sm:p-10 lg:grid-cols-5 lg:p-12">
            <form
              onSubmit={handleGenerate}
              className="space-y-6 lg:col-span-2"
            >
              <header className="space-y-2 text-center lg:text-left">
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">
                  Instant QR
                </p>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  Ethereum QR Generator
                </h1>
                <p className="text-sm text-slate-300 sm:text-base">
                  Create shareable payment requests that work seamlessly across
                  wallets. Enter an address, amount, and optional note to get a
                  ready-to-use QR instantly.
                </p>
              </header>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">
                    Wallet Address
                  </span>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="0x..."
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className={inputStyles}
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-200">
                    <span>Amount (ETH)</span>
                    <span className="text-xs text-slate-400">
                      Auto converts to wei
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.05"
                    value={amountEth}
                    onChange={(event) => setAmountEth(event.target.value)}
                    className={inputStyles}
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">
                    Note (optional)
                  </span>
                  <input
                    type="text"
                    placeholder="Latte Payment"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={inputStyles}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  className={classNames(
                    buttonBaseStyles,
                    "bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/30 hover:bg-emerald-300"
                  )}
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating..." : "Generate QR Code"}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className={classNames(
                    buttonBaseStyles,
                    "border border-white/10 bg-white/10 text-white hover:border-emerald-400 hover:text-emerald-200"
                  )}
                  disabled={!hasResult}
                >
                  Download QR
                </button>
              </div>
            </form>

            <aside className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/50 p-6 text-center shadow-inner transition dark:border-slate-800 dark:bg-slate-950/70 lg:col-span-3 lg:p-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">
                  Preview
                </h2>
                <p className="text-sm text-slate-300">
                  Your QR code and EIP-681 URI will appear here once generated.
                </p>
              </div>

              {hasResult ? (
                <div className="space-y-6">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-4 rounded-3xl bg-white p-4 shadow-lg transition-all animate-fadeIn">
                    <img
                      src={qrDataUrl}
                      alt="Ethereum payment QR code"
                      className="w-full max-w-[240px]"
                    />
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                      Scan to pay
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-left text-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/80">
                      Encoded URI
                    </p>
                    <pre className="mt-2 overflow-x-auto text-sm text-emerald-200">
                      {encodedUri}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/60 p-10 text-sm text-slate-400">
                  Provide details and tap “Generate QR Code” to preview and
                  download your payment request.
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-slate-400 sm:text-sm">
        Ethereum QR Generator | © 2025 CoTrader Labs
      </footer>
    </div>
  );
}

export default App;
