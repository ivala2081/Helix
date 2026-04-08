"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "./ui/Badge";
import { cn } from "@/lib/utils/cn";
import { fmtDate, fmtNum, fmtPct, fmtUsd } from "@/lib/utils/format";
import type { Trade } from "@/lib/engine/types";

type SortKey =
  | "id"
  | "direction"
  | "entryDate"
  | "entryPrice"
  | "exitDate"
  | "exitPrice"
  | "pnl"
  | "pnlPct"
  | "barsHeld"
  | "exitReason"
  | "rMultiple";
type SortDir = "asc" | "desc";

export function TradeTable({
  trades,
  onHover,
  onSelect,
  selectedId,
}: {
  trades: Trade[];
  onHover?: (id: number | null) => void;
  onSelect?: (id: number | null) => void;
  selectedId?: number | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...trades];
    arr.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return arr;
  }, [trades, sortKey, sortDir]);

  const visible = showAll ? sorted : sorted.slice(0, 100);

  const toggle = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted)]">
        No trades generated.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Trade Log · {trades.length} trades
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[var(--color-bg)] text-[var(--color-muted)]">
            <tr>
              <Th k="id" current={sortKey} dir={sortDir} onClick={toggle}>#</Th>
              <Th k="direction" current={sortKey} dir={sortDir} onClick={toggle}>Side</Th>
              <Th k="entryDate" current={sortKey} dir={sortDir} onClick={toggle}>Entry Date</Th>
              <Th k="entryPrice" current={sortKey} dir={sortDir} onClick={toggle} right>Entry $</Th>
              <Th k="exitDate" current={sortKey} dir={sortDir} onClick={toggle}>Exit Date</Th>
              <Th k="exitPrice" current={sortKey} dir={sortDir} onClick={toggle} right>Exit $</Th>
              <Th k="pnl" current={sortKey} dir={sortDir} onClick={toggle} right>PnL $</Th>
              <Th k="pnlPct" current={sortKey} dir={sortDir} onClick={toggle} right>PnL %</Th>
              <Th k="rMultiple" current={sortKey} dir={sortDir} onClick={toggle} right>R</Th>
              <Th k="barsHeld" current={sortKey} dir={sortDir} onClick={toggle} right>Bars</Th>
              <Th k="exitReason" current={sortKey} dir={sortDir} onClick={toggle}>Exit</Th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {visible.map((t, idx) => {
              const isWin = (t.pnl ?? 0) > 0;
              const isSelected = selectedId === t.id;
              return (
                <tr
                  key={t.id}
                  onMouseEnter={() => onHover?.(t.id)}
                  onMouseLeave={() => onHover?.(null)}
                  onClick={() => onSelect?.(isSelected ? null : t.id)}
                  className={cn(
                    "cursor-pointer border-t border-[var(--color-border)]/40 transition-colors",
                    idx % 2 === 0 ? "bg-transparent" : "bg-[var(--color-bg)]/40",
                    "hover:bg-emerald-500/10",
                    isSelected && "bg-amber-500/10 hover:bg-amber-500/15",
                  )}
                >
                  <td className="px-3 py-2 text-[var(--color-muted)]">{t.id}</td>
                  <td className="px-3 py-2">
                    <Badge tone={t.direction === "LONG" ? "positive" : "negative"}>
                      {t.direction}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-[var(--color-muted)]">{fmtDate(t.entryDate)}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(t.entryPrice, 2)}</td>
                  <td className="px-3 py-2 text-[var(--color-muted)]">{fmtDate(t.exitDate)}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(t.exitPrice ?? 0, 2)}</td>
                  <td className={cn("px-3 py-2 text-right font-semibold", isWin ? "text-emerald-400" : "text-red-400")}>
                    {fmtUsd(t.pnl ?? 0)}
                  </td>
                  <td className={cn("px-3 py-2 text-right", isWin ? "text-emerald-400" : "text-red-400")}>
                    {fmtPct(t.pnlPct ?? 0)}
                  </td>
                  <td className={cn("px-3 py-2 text-right", isWin ? "text-emerald-400" : "text-red-400")}>
                    {(t.rMultiple ?? 0).toFixed(2)}R
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-muted)]">{t.barsHeld ?? 0}</td>
                  <td className="px-3 py-2 text-[var(--color-muted)]">{t.exitReason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!showAll && sorted.length > 100 && (
        <div className="border-t border-[var(--color-border)] p-3 text-center">
          <button
            type="button"
            className="text-xs text-blue-400 hover:underline"
            onClick={() => setShowAll(true)}
          >
            Show all {sorted.length} trades
          </button>
        </div>
      )}
    </div>
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
        right && "text-right",
        !right && "text-left",
      )}
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active &&
          (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}
