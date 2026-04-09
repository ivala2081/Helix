import { CryptoIcon } from "./cryptoIcons";

// Infinite-scroll marquee of crypto symbols. Pure CSS keyframes — no JS animation.
// Tickers are duplicated so the loop seam is invisible.
// Keyframes live in globals.css so this can stay a server component.

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "AVAXUSDT",
  "MATICUSDT",
  "ADAUSDT",
  "XRPUSDT",
  "DOTUSDT",
  "LINKUSDT",
  "ATOMUSDT",
  "UNIUSDT",
  "DOGEUSDT",
  "TRXUSDT",
  "LTCUSDT",
];

export function SymbolMarquee() {
  return (
    <div className="relative overflow-hidden py-3" aria-hidden>
      {/* edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--color-bg)] to-transparent sm:w-16 md:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--color-bg)] to-transparent sm:w-16 md:w-24" />

      <div className="marquee-track flex items-center gap-3">
        {[...SYMBOLS, ...SYMBOLS].map((sym, i) => (
          <SymbolPill key={`${sym}-${i}`} symbol={sym} />
        ))}
      </div>
    </div>
  );
}

function SymbolPill({ symbol }: { symbol: string }) {
  const ticker = symbol.replace("USDT", "");
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
      <CryptoIcon ticker={ticker} size={18} />
      <span className="font-mono text-xs text-[var(--color-muted)]">
        {ticker}
        <span className="text-[var(--color-muted)]/40">USDT</span>
      </span>
    </div>
  );
}
