// Signal Aggregator — port of indicators.py:SignalAggregator
//
// Important parity detail: in V5 only Market Structure and FVG are enabled,
// but the Python aggregator's total_weight always sums ALL 5 keys
// (market_structure, fvg, smc, smc_sweep, classic_pa). With smc=0 and pa=0
// in V5, total_weight = 1 + 1 + 0 + 0 + 0 = 2.0. We mirror that here.

import type { Action, AggregatedDecision, BacktestParams, Signal } from "./types";

export function aggregate(
  signals: Signal[],
  params: BacktestParams,
): AggregatedDecision {
  if (signals.length === 0) {
    return { action: "NONE", score: 0, reasons: [] };
  }

  const msW = params.useMarketStructure ? 1.0 : 0.0;
  const fvgW = params.useFvg ? 1.0 : 0.0;
  // smc / smc_sweep / classic_pa weights are 0 in V5 — preserved here for parity
  const smcW = 0.0;
  const smcSweepW = 0.0;
  const paW = 0.0;
  const totalWeight = msW + fvgW + smcW + smcSweepW + paW;

  const longSignals = signals.filter((s) => s.type === "LONG");
  const shortSignals = signals.filter((s) => s.type === "SHORT");

  const weightFor = (source: Signal["source"]): number => {
    switch (source) {
      case "market_structure":
        return msW;
      case "fvg":
        return fvgW;
      default:
        return 0;
    }
  };

  let longScore = 0;
  for (const s of longSignals) longScore += s.strength * weightFor(s.source);
  let shortScore = 0;
  for (const s of shortSignals) shortScore += s.strength * weightFor(s.source);

  const longNorm = totalWeight > 0 ? longScore / totalWeight : 0;
  const shortNorm = totalWeight > 0 ? shortScore / totalWeight : 0;

  let action: Action = "NONE";
  let chosen: Signal[] = [];
  let score = Math.max(longNorm, shortNorm);

  if (longNorm >= params.minConfluence && longNorm > shortNorm) {
    action = "LONG";
    chosen = longSignals;
    score = longNorm;
  } else if (shortNorm >= params.minConfluence && shortNorm > longNorm) {
    action = "SHORT";
    chosen = shortSignals;
    score = shortNorm;
  }

  if (action === "NONE") {
    return { action, score, reasons: [] };
  }

  // Mirror Python: best = max(signals, key=lambda s: s.strength)
  let best = chosen[0];
  for (const s of chosen) {
    if (s.strength > best.strength) best = s;
  }

  return {
    action,
    score,
    entryPrice: best.entryPrice,
    stopLoss: best.stopLoss,
    reasons: chosen.map((s) => s.reason),
  };
}
