"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DATA = [
  { version: "V1", return: 49.7, sharpe: 1.81, dd: 10.3 },
  { version: "V2", return: 95.5, sharpe: 3.36, dd: 5.9 },
  { version: "V3", return: 173.2, sharpe: 4.66, dd: 4.1 },
  { version: "V4", return: 250.5, sharpe: 4.29, dd: 6.6 },
  { version: "V5", return: 949.7, sharpe: 5.4, dd: 8.55 },
];

export function EvolutionChart() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-md">
      <div className="mb-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Strategy evolution · total return %
        </h3>
        <p className="mt-1 text-xs text-[var(--color-muted)]/80">
          Each version is a single, validated improvement. V5 delivers ~19× the V1 baseline.
        </p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.4)" />
            <XAxis dataKey="version" stroke="#a1a1aa" tick={{ fontSize: 12 }} />
            <YAxis stroke="#a1a1aa" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{
                backgroundColor: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => `+${v.toFixed(1)}%`}
            />
            <Bar dataKey="return" radius={[8, 8, 0, 0]}>
              {DATA.map((d, i) => (
                <Cell
                  key={d.version}
                  fill={i === DATA.length - 1 ? "#10b981" : "rgba(16,185,129,0.45)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
