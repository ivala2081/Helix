"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { fmtUsd, fmtPct, fmtNum, fmtDateTime } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export interface TradeRow {
  id: number;
  symbol: string;
  trade_id: number;
  direction: string;
  entry_ts: number;
  entry_price: number;
  exit_ts: number;
  exit_price: number;
  size: number;
  pnl: number;
  pnl_pct: number;
  exit_reason: string;
  commission: number;
  r_multiple: number | null;
  bars_held: number | null;
}

type SortKey = string;
type SortDir = "asc" | "desc";
type Dict = Dictionary["live"]["tradeAnalytics"];

const COINS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT"];
const COIN_LABELS = ["BTC", "ETH", "SOL", "XRP", "BNB"];

interface Props {
  trades: TradeRow[];
  total: number;
  loading: boolean;
  symbolFilter: string | null;
  sortKey: SortKey;
  sortDir: SortDir;
  page: number;
  pageSize: number;
  onSymbolChange: (s: string | null) => void;
  onSortChange: (key: SortKey) => void;
  onPageChange: (p: number) => void;
  dict: Dict;
}

export function LiveTradeTable({
  trades,
  total,
  loading,
  symbolFilter,
  sortKey,
  sortDir,
  page,
  pageSize,
  onSymbolChange,
  onSortChange,
  onPageChange,
  dict,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total > 0 ? page * pageSize + 1 : 0;
  const to = Math.min((page + 1) * pageSize, total);
  const t = dict.table;

  const showingText = t.showingOf
    .replace("{from}", String(from))
    .replace("{to}", String(to))
    .replace("{total}", String(total));

  return (
    <div className="rounded-xl border border-[var(--color-border)]">
      {/* Coin filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] p-2">
        <FilterTab
          active={symbolFilter === null}
          onClick={() => onSymbolChange(null)}
        >
          {dict.filters.all}
        </FilterTab>
        {COINS.map((c, i) => (
          <FilterTab
            key={c}
            active={symbolFilter === c}
            onClick={() => onSymbolChange(c)}
          >
            {COIN_LABELS[i]}
          </FilterTab>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[var(--color-muted)]">
              <Th k="symbol" current={sortKey} dir={sortDir} onClick={onSortChange}>
                {t.coin}
              </Th>
              <Th k="direction" current={sortKey} dir={sortDir} onClick={onSortChange}>
                {t.side}
              </Th>
              <Th k="entry_ts" current={sortKey} dir={sortDir} onClick={onSortChange}>
                {t.entryDate}
              </Th>
              <Th k="entry_price" current={sortKey} dir={sortDir} onClick={onSortChange} right>
                {t.entryPrice}
              </Th>
              <Th k="exit_ts" current={sortKey} dir={sortDir} onClick={onSortChange}>
                {t.exitDate}
              </Th>
              <Th k="exit_price" current={sortKey} dir={sortDir} onClick={onSortChange} right>
                {t.exitPrice}
              </Th>
              <Th k="pnl" current={sortKey} dir={sortDir} onClick={onSortChange} right>
                {t.pnl}
              </Th>
              <Th k="pnl_pct" current={sortKey} dir={sortDir} onClick={onSortChange} right>
                {t.pnlPct}
              </Th>
              <Th k="r_multiple" current={sortKey} dir={sortDir} onClick={onSortChange} right>
                {t.rMultiple}
              </Th>
              <Th k="bars_held" current={sortKey} dir={sortDir} onClick={onSortChange} right>
                {t.barsHeld}
              </Th>
              <Th k="exit_reason" current={sortKey} dir={sortDir} onClick={onSortChange}>
                {t.exitReason}
              </Th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]/50">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-4 w-16 animate-pulse rounded bg-zinc-700" />
                      </td>
                    ))}
                  </tr>
                ))
              : trades.length === 0
              ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-10 text-center text-sm text-[var(--color-muted)]"
                  >
                    {t.noTrades}
                  </td>
                </tr>
              )
              : trades.map((tr) => (
                <tr
                  key={tr.id}
                  className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)]/40"
                >
                  <td className="px-3 py-2 font-mono text-xs font-semibold">
                    {tr.symbol.replace("USDT", "")}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={tr.direction === "LONG" ? "positive" : "negative"}>
                      {tr.direction}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                    {fmtDateTime(new Date(tr.entry_ts).toISOString())}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {fmtNum(tr.entry_price)}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                    {fmtDateTime(new Date(tr.exit_ts).toISOString())}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {fmtNum(tr.exit_price)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-mono text-xs font-semibold tabular-nums",
                      tr.pnl >= 0 ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {fmtUsd(tr.pnl)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-mono text-xs tabular-nums",
                      tr.pnl_pct >= 0 ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {fmtPct(tr.pnl_pct)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-mono text-xs tabular-nums",
                      tr.r_multiple != null && tr.r_multiple >= 0
                        ? "text-emerald-400"
                        : tr.r_multiple != null
                        ? "text-red-400"
                        : "",
                    )}
                  >
                    {tr.r_multiple != null ? `${tr.r_multiple.toFixed(2)}R` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-[var(--color-muted)]">
                    {tr.bars_held != null ? tr.bars_held : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                    {tr.exit_reason}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)]">
          <span>{showingText}</span>
          <div className="flex gap-2">
            <button
              className="rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface)] disabled:opacity-30"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
            >
              &larr;
            </button>
            <button
              className="rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface)] disabled:opacity-30"
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
            >
              &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- internal helpers ---------- */

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-[var(--color-muted)] hover:text-white",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Th({
  k,
  current,
  dir,
  onClick,
  children,
  right,
}: {
  k: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  children: React.ReactNode;
  right?: boolean;
}) {
  const active = current === k;
  return (
    <th
      className={cn(
        "cursor-pointer select-none px-3 py-2 text-[10px] font-medium uppercase tracking-wider hover:text-white",
        right ? "text-right" : "text-left",
      )}
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active &&
          (dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </span>
    </th>
  );
}
