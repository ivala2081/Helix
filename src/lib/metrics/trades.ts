// Single source of truth for classifying a trade's P&L and computing win-rate.
// Previously each surface disagreed: some counted breakeven (pnl===0) as a loss,
// some counted unsettled (pnl===null) rows in the denominator, inflating/diluting
// win-rate. Rule: win = pnl>0, loss = pnl<0, breakeven = pnl===0, and null/undef
// (unsettled) is EXCLUDED. Win-rate denominator = decided trades (wins+losses).

export type PnlClass = "win" | "loss" | "breakeven";

export function classifyPnl(
  pnl: number | null | undefined,
): PnlClass | null {
  if (pnl == null || Number.isNaN(pnl)) return null;
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";
  return "breakeven";
}

export type TradeStats = {
  wins: number;
  losses: number;
  breakeven: number;
  settled: number; // wins + losses + breakeven (excludes null/unsettled)
  winRate: number | null; // wins / (wins+losses); null when no decided trades
};

export function tradeStats(
  pnls: Array<number | null | undefined>,
): TradeStats {
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  for (const p of pnls) {
    const c = classifyPnl(p);
    if (c === "win") wins++;
    else if (c === "loss") losses++;
    else if (c === "breakeven") breakeven++;
  }
  const decided = wins + losses;
  return {
    wins,
    losses,
    breakeven,
    settled: wins + losses + breakeven,
    winRate: decided > 0 ? wins / decided : null,
  };
}
