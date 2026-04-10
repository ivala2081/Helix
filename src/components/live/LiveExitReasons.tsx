"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  TP1: "#34d399",
  TP2: "#10b981",
  TP3: "#059669",
  "Stop Loss": "#ef4444",
  "Hard Stop": "#7f1d1d",
  "End of data": "#71717a",
};

const ORDER = ["TP1", "TP2", "TP3", "Stop Loss", "Hard Stop", "End of data"];

export function LiveExitReasons({
  exitReasons,
  title,
}: {
  exitReasons: Record<string, number> | null;
  title: string;
}) {
  const total = exitReasons
    ? Object.values(exitReasons).reduce((s, v) => s + v, 0)
    : 0;

  // Sort: known reasons in ORDER first, then any unknown ones
  const data = exitReasons
    ? [
        ...ORDER.filter((k) => (exitReasons[k] ?? 0) > 0).map((k) => ({
          name: k,
          value: exitReasons[k],
        })),
        ...Object.entries(exitReasons)
          .filter(([k, v]) => v > 0 && !ORDER.includes(k))
          .map(([k, v]) => ({ name: k, value: v })),
      ]
    : [];

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {title}
      </h3>
      {!exitReasons || data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-[var(--color-muted)]">
          No data
        </div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                stroke="#18181b"
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name] ?? "#71717a"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#27272a",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#fafafa" }}
                itemStyle={{ color: "#fafafa" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
        {data.map((d) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : "0";
          return (
            <div
              key={d.name}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={{ backgroundColor: COLORS[d.name] ?? "#71717a" }}
                />
                {d.name}
              </span>
              <span className="font-mono tabular-nums text-white">
                {d.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
