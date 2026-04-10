"use client";

import { useEffect, useState } from "react";
import { Sparkline } from "@/components/visuals/Sparkline";

interface Portfolio {
  symbol: string;
  equity: number;
  initial_capital: number;
  realized_pnl: number;
  open_trade: { direction: string; entryPrice: number } | null;
  warmup_complete: boolean;
  updated_at: string;
}

// In-memory cache so all 5 cards share one fetch per page load
const sparklineCache = new Map<string, number[]>();

export function LivePortfolioCard({ p, updatedLabel }: { p: Portfolio; updatedLabel: string }) {
  const returnPct = ((p.equity - p.initial_capital) / p.initial_capital) * 100;
  const isPositive = returnPct >= 0;
  const coinName = p.symbol.replace("USDT", "");

  const [sparkline, setSparkline] = useState<number[]>(
    sparklineCache.get(p.symbol) ?? [],
  );

  useEffect(() => {
    if (sparklineCache.has(p.symbol)) return;
    let cancelled = false;

    async function fetchSparkline() {
      try {
        const r = await fetch(`/api/live/equity?symbol=${p.symbol}`);
        if (!r.ok) return;
        const json = (await r.json()) as { snapshots: { equity: number; ts: number }[] };
        const points = json.snapshots
          .sort((a, b) => a.ts - b.ts)
          .map((s) => Number(s.equity));
        if (!cancelled && points.length > 0) {
          sparklineCache.set(p.symbol, points);
          setSparkline(points);
        }
      } catch {
        // silent
      }
    }

    fetchSparkline();
    return () => {
      cancelled = true;
    };
  }, [p.symbol]);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">{coinName}</span>
          <span className="text-[10px] text-[var(--color-muted)]">/ USDT</span>
        </div>
        {p.open_trade && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              p.open_trade.direction === "LONG"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {p.open_trade.direction} @ {p.open_trade.entryPrice.toFixed(2)}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-xl font-bold tabular-nums">
          ${p.equity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span
          className={`text-sm font-semibold tabular-nums ${
            isPositive ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isPositive ? "+" : ""}
          {returnPct.toFixed(1)}%
        </span>
      </div>

      {/* Sparkline */}
      {sparkline.length > 1 && (
        <div className="mt-2">
          <Sparkline
            points={sparkline}
            tone={isPositive ? "positive" : "negative"}
            width={180}
            height={28}
          />
        </div>
      )}

      <div className="mt-2 text-[10px] text-[var(--color-muted)]">
        {updatedLabel} {new Date(p.updated_at).toLocaleTimeString()}
      </div>
    </div>
  );
}
