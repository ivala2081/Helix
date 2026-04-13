"use client";

import { cn } from "@/lib/utils/cn";
import { fmtUsd, fmtPct } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

interface RankingItem {
  symbol: string;
  equity: number;
  initialCapital: number;
  returnPct: number;
  realizedPnl: number;
  unrealizedPnl: number;
  tradeCount: number;
  winRate: number | null;
  maxDrawdownPct: number;
  currentDrawdownPct: number;
  hasOpenTrade: boolean;
  rank: number;
}

interface Props {
  ranking: RankingItem[];
  dict: Dictionary["live"]["portfolioAnalytics"]["table"];
}

const MEDAL_COLORS: Record<number, string> = {
  1: "text-amber-400 font-bold",
  2: "text-zinc-400 font-bold",
  3: "text-amber-600 font-bold",
};

export function PortfolioRanking({ ranking, dict }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              <th className="px-3 py-2.5">{dict.rank}</th>
              <th className="px-3 py-2.5">{dict.coin}</th>
              <th className="px-3 py-2.5 text-right">{dict.return}</th>
              <th className="px-3 py-2.5 text-right">{dict.equity}</th>
              <th className="px-3 py-2.5 text-right">{dict.realized}</th>
              <th className="hidden px-3 py-2.5 text-right sm:table-cell">
                {dict.unrealized}
              </th>
              <th className="px-3 py-2.5 text-right">{dict.trades}</th>
              <th className="px-3 py-2.5 text-right">{dict.winRate}</th>
              <th className="hidden px-3 py-2.5 text-right sm:table-cell">
                {dict.maxDD}
              </th>
              <th className="hidden px-3 py-2.5 text-center sm:table-cell">
                {dict.status}
              </th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((item) => (
              <tr
                key={item.symbol}
                className={cn(
                  "border-b border-[var(--color-border)]/50 transition-colors hover:bg-white/[0.02]",
                  item.rank === 1 && "bg-emerald-500/5",
                )}
              >
                <td
                  className={cn(
                    "px-3 py-2.5 font-mono",
                    MEDAL_COLORS[item.rank] ?? "text-[var(--color-muted)]",
                  )}
                >
                  #{item.rank}
                </td>
                <td className="px-3 py-2.5 font-medium">
                  {item.symbol.replace("USDT", "")}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right font-mono tabular-nums",
                    item.returnPct >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {fmtPct(item.returnPct)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                  {fmtUsd(item.equity, 0)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right font-mono tabular-nums",
                    item.realizedPnl >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {fmtUsd(item.realizedPnl)}
                </td>
                <td
                  className={cn(
                    "hidden px-3 py-2.5 text-right font-mono tabular-nums sm:table-cell",
                    item.unrealizedPnl >= 0
                      ? "text-emerald-400"
                      : "text-red-400",
                  )}
                >
                  {fmtUsd(item.unrealizedPnl)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                  {item.tradeCount}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right font-mono tabular-nums",
                    item.winRate !== null && item.winRate >= 0.5
                      ? "text-emerald-400"
                      : item.winRate !== null
                        ? "text-red-400"
                        : "text-[var(--color-muted)]",
                  )}
                >
                  {item.winRate !== null
                    ? fmtPct(item.winRate * 100)
                    : "—"}
                </td>
                <td className="hidden px-3 py-2.5 text-right font-mono tabular-nums text-red-400 sm:table-cell">
                  {item.maxDrawdownPct > 0
                    ? `-${item.maxDrawdownPct.toFixed(2)}%`
                    : "0.00%"}
                </td>
                <td className="hidden px-3 py-2.5 text-center sm:table-cell">
                  {item.hasOpenTrade ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {dict.active}
                    </span>
                  ) : (
                    <span className="text-[var(--color-muted)]">
                      {dict.idle}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
