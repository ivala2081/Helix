// Map of metric key → tooltip + About anchor link.
// Used by MetricsPanel to render an inline help affordance for every number.

export interface MetricExplanation {
  formula: string;
  description: string;
  anchor?: string; // /about#anchor
}

export const METRIC_EXPLANATIONS: Record<string, MetricExplanation> = {
  // Returns
  "Total return": {
    formula: "(final_equity − initial_capital) / initial_capital",
    description: "Cumulative percentage gain over the entire backtest period.",
  },
  "Annualized return": {
    formula: "((final_equity / initial_capital) ^ (1/years)) − 1",
    description:
      "Geometric annualized growth rate. Normalizes returns across different test durations.",
  },
  "Net profit": {
    formula: "Σ(trade.pnl)",
    description: "Sum of all closed-trade PnL after commission and slippage.",
  },
  "Final equity": {
    formula: "initial_capital + Σ(trade.pnl)",
    description: "Account balance at the end of the test.",
  },

  // Risk
  "Max drawdown": {
    formula: "min((equity[i] − running_max[i]) / running_max[i])",
    description:
      "Largest peak-to-trough equity decline during the test, expressed as a percentage.",
    anchor: "/about#risk",
  },
  "Sharpe ratio": {
    formula: "mean(returns) / stdev(returns) × √bars_per_year",
    description:
      "Annualized risk-adjusted return. Measures profit per unit of total volatility.",
    anchor: "/about#risk",
  },
  "Sortino ratio": {
    formula: "mean(returns) / stdev(downside_returns) × √bars_per_year",
    description:
      "Like Sharpe, but only penalizes downside volatility — upside swings don't hurt the score.",
    anchor: "/about#risk",
  },
  "Calmar ratio": {
    formula: "annualized_return / max_drawdown",
    description:
      "Return per unit of maximum drawdown. High Calmar = great returns relative to the worst pain.",
    anchor: "/about#risk",
  },

  // Trade quality
  "Profit factor": {
    formula: "gross_profit / gross_loss",
    description:
      "Dollars won per dollar lost. >1.5 is solid, >2 is excellent, >5 is exceptional.",
    anchor: "/about#confluence",
  },
  "Payoff ratio": {
    formula: "avg_win / avg_loss",
    description:
      "Average winning trade size relative to average losing trade. Independent of win rate.",
  },
  Expectancy: {
    formula: "(win_rate × avg_win) − ((1 − win_rate) × avg_loss)",
    description: "Expected dollars per trade if you ran the strategy forever.",
  },
  "Win rate": {
    formula: "winners / total_trades",
    description: "Percentage of closed trades that were profitable.",
  },
  "Avg R-multiple": {
    formula: "mean(trade.pnl / trade.risk_amount)",
    description:
      "Average return per unit of risk. R-multiples make returns comparable across different position sizes.",
  },
};
