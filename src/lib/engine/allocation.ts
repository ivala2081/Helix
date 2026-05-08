// Per-symbol dynamic allocation — adjusts each portfolio's effective risk%
// based on its trailing-50-trade Sharpe. Symbols with positive recent edge
// get more weight; underperformers get the floor. Pure, side-effect-free.
//
// Inputs: per-symbol trade history (R-multiples). Output: weight map summing
// to ~1, clamped to [WEIGHT_FLOOR, WEIGHT_CEILING].
//
// When a symbol has fewer than MIN_TRADES_FOR_DYNAMIC trades, its weight is
// the EQUAL_WEIGHT default (1/N) — too few samples to score reliably.

export const WEIGHT_FLOOR = 0.10;
export const WEIGHT_CEILING = 0.40;
export const MIN_TRADES_FOR_DYNAMIC = 5;
export const TRAILING_TRADES = 50;

export interface SymbolTrades {
  symbol: string;
  rMultiples: number[]; // chronological, oldest first
}

export interface AllocationResult {
  weights: Map<string, number>;
  reasons: Map<string, string>; // human-readable per-symbol explanation
}

export function computeAllocation(
  symbols: SymbolTrades[],
): AllocationResult {
  const N = symbols.length;
  const equalWeight = N > 0 ? 1 / N : 0;
  const reasons = new Map<string, string>();

  if (N === 0) {
    return { weights: new Map(), reasons };
  }

  // Per-symbol score: trailing-50-trade Sharpe (mean / std). +0.5 floor so
  // negative-edge symbols still get a tiny weight rather than zero, allowing
  // them a chance to recover. Symbols with insufficient sample default to
  // equal weight.
  const rawScores = new Map<string, number>();
  for (const s of symbols) {
    const trail = s.rMultiples.slice(-TRAILING_TRADES);
    if (trail.length < MIN_TRADES_FOR_DYNAMIC) {
      rawScores.set(s.symbol, equalWeight);
      reasons.set(s.symbol, `equal-weight (only ${trail.length} trades, need ${MIN_TRADES_FOR_DYNAMIC})`);
      continue;
    }
    const mean = trail.reduce((a, b) => a + b, 0) / trail.length;
    const variance =
      trail.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(trail.length - 1, 1);
    const std = Math.sqrt(variance);
    const sharpe = std > 0 ? mean / std : 0;
    const score = Math.max(0.01, sharpe + 0.5);
    rawScores.set(s.symbol, score);
    reasons.set(s.symbol, `sharpe=${sharpe.toFixed(2)} → score ${score.toFixed(2)}`);
  }

  const sumScores = [...rawScores.values()].reduce((a, b) => a + b, 0);
  if (sumScores <= 0) {
    // Pathological — fall back to equal weight everywhere.
    const weights = new Map<string, number>();
    for (const s of symbols) {
      weights.set(s.symbol, equalWeight);
      reasons.set(s.symbol, "fallback: zero-sum scores");
    }
    return { weights, reasons };
  }

  // Normalize, then clamp + renormalize to keep total ≈ 1.
  const weights = new Map<string, number>();
  for (const s of symbols) {
    const raw = (rawScores.get(s.symbol) ?? 0) / sumScores;
    weights.set(s.symbol, raw);
  }

  // Apply floor / ceiling, then renormalize.
  let clampedSum = 0;
  for (const [sym, w] of weights) {
    const c = Math.min(WEIGHT_CEILING, Math.max(WEIGHT_FLOOR, w));
    weights.set(sym, c);
    clampedSum += c;
  }
  // Final pass: scale so weights sum to 1 (clamping may have shifted total).
  if (clampedSum > 0 && Math.abs(clampedSum - 1) > 1e-9) {
    for (const [sym, w] of weights) {
      weights.set(sym, w / clampedSum);
    }
  }
  // After renormalization, weights might exceed ceiling slightly — re-clamp.
  for (const [sym, w] of weights) {
    weights.set(sym, Math.min(WEIGHT_CEILING, Math.max(WEIGHT_FLOOR, w)));
  }

  return { weights, reasons };
}
