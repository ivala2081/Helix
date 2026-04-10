"use client";

interface OpenTrade {
  direction: string;
  entryPrice: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  stopLoss?: number;
  tp1Hit?: boolean;
  tp2Hit?: boolean;
  maxFavorable?: number;
  maxAdverse?: number;
}

interface PortfolioWithOpen {
  symbol: string;
  open_trade: OpenTrade | null;
}

export function OpenPositionsStrip({
  portfolios,
  title,
}: {
  portfolios: PortfolioWithOpen[];
  title: string;
}) {
  const openPositions = portfolios.filter((p) => p.open_trade !== null);
  if (openPositions.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {openPositions.map((p) => {
          const t = p.open_trade!;
          const isLong = t.direction === "LONG";
          return (
            <div
              key={p.symbol}
              className={`rounded-xl border p-4 backdrop-blur-md ${
                isLong
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">
                    {p.symbol.replace("USDT", "")}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      isLong
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {t.direction}
                  </span>
                </div>
                <div className="flex gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      t.tp1Hit ? "bg-emerald-400" : "bg-zinc-700"
                    }`}
                    title="TP1"
                  />
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      t.tp2Hit ? "bg-emerald-400" : "bg-zinc-700"
                    }`}
                    title="TP2"
                  />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" title="TP3" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-[10px] uppercase text-[var(--color-muted)]">
                    Entry
                  </div>
                  <div className="font-mono font-semibold tabular-nums">
                    {t.entryPrice.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-[var(--color-muted)]">
                    SL
                  </div>
                  <div className="font-mono tabular-nums">
                    {t.stopLoss?.toFixed(2) ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
