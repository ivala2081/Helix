"use client";

import { CryptoIcon } from "./cryptoIcons";

// Infinite-scroll marquee of crypto symbols. Pure CSS keyframes — no JS animation.
// Tickers are duplicated so the loop seam is invisible.

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
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--color-bg)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--color-bg)] to-transparent" />

      <div className="flex items-center gap-3 marquee-track">
        {[...SYMBOLS, ...SYMBOLS].map((sym, i) => (
          <SymbolPill key={`${sym}-${i}`} symbol={sym} />
        ))}
      </div>

      <style jsx>{`
        .marquee-track {
          width: max-content;
          animation: marquee 60s linear infinite;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

function SymbolPill({ symbol }: { symbol: string }) {
  const ticker = symbol.replace("USDT", "");
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1.5 backdrop-blur-md">
      <CryptoIcon ticker={ticker} size={18} />
      <span className="font-mono text-xs text-[var(--color-muted)]">
        {ticker}
        <span className="text-[var(--color-muted)]/40">USDT</span>
      </span>
    </div>
  );
}
