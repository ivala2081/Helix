"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DrawdownPoint {
  ts: number;
  drawdownPct: number;
}

interface Props {
  series: DrawdownPoint[];
  title: string;
  emptyText: string;
}

function formatTsLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PortfolioDrawdown({ series, title, emptyText }: Props) {
  if (!series || series.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 text-sm text-[var(--color-muted)]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4">
      <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={series}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="ts"
            tickFormatter={formatTsLabel}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={60}
          />
          <YAxis
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={["dataMin", 0]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(ts: number) => formatTsLabel(ts)}
            formatter={(value: number) => [
              `${value.toFixed(2)}%`,
              "Drawdown",
            ]}
          />
          <ReferenceLine
            y={0}
            stroke="var(--color-border)"
            strokeDasharray="4 4"
          />
          <Area
            type="monotone"
            dataKey="drawdownPct"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="url(#ddGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
