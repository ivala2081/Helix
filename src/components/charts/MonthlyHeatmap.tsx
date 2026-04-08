"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import { fmtUsd } from "@/lib/utils/format";
import type { Trade } from "@/lib/engine/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyHeatmap({ trades }: { trades: Trade[] }) {
  const { years, grid, maxAbs } = useMemo(() => {
    const map = new Map<string, number>(); // "YYYY-M" -> pnl sum
    const yearSet = new Set<number>();
    for (const t of trades) {
      if (!t.exitDate || t.pnl === undefined) continue;
      const d = new Date(t.exitDate);
      if (isNaN(d.getTime())) continue;
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      yearSet.add(year);
      const key = `${year}-${month}`;
      map.set(key, (map.get(key) ?? 0) + t.pnl);
    }
    const ys = [...yearSet].sort();
    const g: (number | null)[][] = ys.map((y) =>
      MONTHS.map((_, m) => map.get(`${y}-${m}`) ?? null),
    );
    let max = 0;
    for (const row of g) for (const v of row) if (v !== null) max = Math.max(max, Math.abs(v));
    return { years: ys, grid: g, maxAbs: max };
  }, [trades]);

  if (years.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Monthly Returns
        </h3>
        <div className="flex h-[200px] items-center justify-center text-sm text-[var(--color-muted)]">
          No data
        </div>
      </div>
    );
  }

  const colorFor = (v: number | null): string => {
    if (v === null || v === 0 || maxAbs === 0) return "rgba(63,63,70,0.3)";
    const intensity = Math.min(Math.abs(v) / maxAbs, 1);
    if (v > 0) return `rgba(16,185,129,${0.15 + 0.7 * intensity})`;
    return `rgba(239,68,68,${0.15 + 0.7 * intensity})`;
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
        Monthly Returns
      </h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[60px_repeat(12,minmax(54px,1fr))] gap-1">
            <div />
            {MONTHS.map((m) => (
              <div
                key={m}
                className="text-center text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]"
              >
                {m}
              </div>
            ))}
            {years.map((y, yi) => (
              <FragmentRow
                key={y}
                year={y}
                cells={grid[yi]}
                colorFor={colorFor}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  year,
  cells,
  colorFor,
}: {
  year: number;
  cells: (number | null)[];
  colorFor: (v: number | null) => string;
}) {
  return (
    <>
      <div className="flex items-center text-xs font-medium text-[var(--color-muted)]">
        {year}
      </div>
      {cells.map((v, mi) => (
        <div
          key={mi}
          className={cn(
            "flex h-10 items-center justify-center rounded text-[10px] font-mono tabular-nums",
            v === null ? "text-[var(--color-muted)]" : "text-white",
          )}
          style={{ backgroundColor: colorFor(v) }}
          title={v !== null ? `${MONTHS[mi]} ${year}: ${fmtUsd(v)}` : `${MONTHS[mi]} ${year}: no trades`}
        >
          {v === null ? "·" : v >= 0 ? "+" + fmtCompact(v) : fmtCompact(v)}
        </div>
      ))}
    </>
  );
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toFixed(0);
}
