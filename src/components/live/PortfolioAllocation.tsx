"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { fmtUsd, fmtCompact } from "@/lib/utils/format";

interface AllocationItem {
  symbol: string;
  equity: number;
  pct: number;
}

interface Props {
  allocation: AllocationItem[];
  totalEquity: number;
  title: string;
}

const COLORS: Record<string, string> = {
  BTCUSDT: "#f59e0b",
  ETHUSDT: "#3b82f6",
  SOLUSDT: "#8b5cf6",
  XRPUSDT: "#10b981",
  BNBUSDT: "#fbbf24",
};

export function PortfolioAllocation({ allocation, totalEquity, title }: Props) {
  if (!allocation || allocation.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 text-sm text-[var(--color-muted)]">
        No data
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4">
      <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {title}
      </h3>

      <div className="relative mx-auto" style={{ width: 220, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={allocation}
              dataKey="equity"
              nameKey="symbol"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              stroke="none"
            >
              {allocation.map((item) => (
                <Cell
                  key={item.symbol}
                  fill={COLORS[item.symbol] ?? "#71717a"}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono tabular-nums">
            ${fmtCompact(totalEquity)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-1.5">
        {allocation.map((item) => (
          <div
            key={item.symbol}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[item.symbol] ?? "#71717a" }}
              />
              <span className="font-medium">
                {item.symbol.replace("USDT", "")}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums text-[var(--color-muted)]">
              <span>{item.pct.toFixed(1)}%</span>
              <span>{fmtUsd(item.equity, 0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
