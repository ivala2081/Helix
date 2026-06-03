// Honest headline KPIs for the public /live transparency page. PURE + testable.
//
// Honesty rule: the public dashboard must show the FULL picture — return AND
// drawdown AND win rate AND profit factor — not a cherry-picked "best performer".
// Max drawdown is always rendered as a risk (red), and a sub-1 profit factor is
// shown red (currently losing), so the page can never read rosier than reality.

export type LiveAggregate = {
  totalReturnPct: number;
  portfolioMaxDrawdownPct: number; // worst peak-to-trough on the combined curve
  portfolioCurrentDrawdownPct: number; // drawdown from peak right now (<= 0)
  overallWinRate: number | null; // 0..1, settled trades only
  overallProfitFactor: number | null;
  totalTrades: number;
};

export type Tone = "emerald" | "red" | "neutral";
export type Kpi = { label: string; value: string; tone: Tone };

const pct = (n: number, dp = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(dp)}%`;
// Drawdown is reported as a magnitude with a leading minus — never positive/green.
const ddPct = (n: number, dp = 1) => `-${Math.abs(n).toFixed(dp)}%`;

/** Build the honest KPI strip from the aggregate API payload. Returns "—" cells
 *  (neutral) when a metric is not yet available (e.g. no settled trades). */
export function selectLiveKpis(agg: LiveAggregate | null): Kpi[] {
  if (!agg) {
    return [
      { label: "Total return", value: "—", tone: "neutral" },
      { label: "Max drawdown", value: "—", tone: "neutral" },
      { label: "Win rate", value: "—", tone: "neutral" },
      { label: "Profit factor", value: "—", tone: "neutral" },
    ];
  }

  const winRate =
    agg.overallWinRate != null ? `${(agg.overallWinRate * 100).toFixed(1)}%` : "—";
  const pf =
    agg.overallProfitFactor != null ? agg.overallProfitFactor.toFixed(2) : "—";
  const pfTone: Tone =
    agg.overallProfitFactor == null
      ? "neutral"
      : agg.overallProfitFactor >= 1
        ? "emerald"
        : "red"; // < 1 = currently losing — show it honestly

  return [
    {
      label: "Total return",
      value: pct(agg.totalReturnPct),
      tone: agg.totalReturnPct >= 0 ? "emerald" : "red",
    },
    {
      // Max drawdown is a risk figure — always red, never dressed up.
      label: "Max drawdown",
      value: ddPct(agg.portfolioMaxDrawdownPct),
      tone: "red",
    },
    { label: "Win rate", value: winRate, tone: "neutral" },
    { label: "Profit factor", value: pf, tone: pfTone },
  ];
}
