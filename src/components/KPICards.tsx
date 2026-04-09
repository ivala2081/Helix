import { cn } from "@/lib/utils/cn";
import { CountUp } from "./visuals/CountUp";
import { Sparkline } from "./visuals/Sparkline";

export interface KPI {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "positive" | "negative" | "neutral";
  /** If set, animates a count-up from 0 instead of showing the static `value`. */
  numericValue?: number;
  /** Optional formatting hints used with `numericValue`. */
  numericDecimals?: number;
  numericPrefix?: string;
  numericSuffix?: string;
  /** Optional sparkline drawn at the bottom of the card. */
  sparkline?: readonly number[];
  sparklineTone?: "positive" | "negative" | "neutral";
}

export function KPICards({ kpis, columns = 4 }: { kpis: KPI[]; columns?: 3 | 4 | 6 }) {
  const colClass = {
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    6: "sm:grid-cols-3 lg:grid-cols-6",
  }[columns];
  return (
    <div className={cn("grid grid-cols-1 gap-3", colClass)}>
      {kpis.map((k) => (
        <div
          key={k.label}
          className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-muted)]/50"
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
            {k.label}
          </div>
          <div
            className={cn(
              "mt-1 font-mono text-2xl font-semibold tabular-nums",
              k.tone === "positive" && "text-emerald-400",
              k.tone === "negative" && "text-red-400",
              k.tone === "neutral" && "text-white",
              !k.tone && "text-white",
            )}
          >
            {k.numericValue !== undefined ? (
              <CountUp
                to={k.numericValue}
                decimals={k.numericDecimals ?? 0}
                prefix={k.numericPrefix ?? ""}
                suffix={k.numericSuffix ?? ""}
              />
            ) : (
              k.value
            )}
          </div>
          {k.sublabel && (
            <div className="mt-1 text-xs text-[var(--color-muted)]">
              {k.sublabel}
            </div>
          )}
          {k.sparkline && (
            <div className="mt-3">
              <Sparkline
                points={k.sparkline}
                tone={k.sparklineTone ?? k.tone ?? "positive"}
                width={140}
                height={32}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
