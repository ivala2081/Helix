// Bayesian confidence score for the live forward-test.
//
// Idea: take a 24-day rolling window of live trades, compute (n, win_rate,
// profit_factor, sum_R), and rank each metric against the historical
// distribution of equivalent windows from the realism-patched backtest
// (public/data/historical-windows.json). The score is the percentile of
// sum_R — i.e. "where does this 24-day stretch sit in the strategy's
// historical performance distribution?"
//
// 0–5    extreme left tail; trigger manual review
// 5–25   left tail; normal variance
// 25–75  inside backtest distribution; normal
// 75–95  right tail; running hot
// 95–100 extreme right tail; expect mean reversion

export interface HistoricalWindow {
  n: number;
  wr: number;
  pf: number | null;
  sum_r: number;
  pnl: number;
}

export interface HistoricalWindowsFile {
  generated_at: string;
  window_days: number;
  symbols: string[];
  realism_patches: string[];
  windows: HistoricalWindow[];
}

export interface LiveTrade {
  exit_ts: number;
  pnl: number;
  r_multiple: number | null;
}

export interface ConfidenceScore {
  score: number;          // 0..100, percentile of sum_R
  nLive: number;
  nMin: number;           // smallest live n we'll score (else returns null)
  liveSumR: number;
  liveWr: number;
  livePf: number | null;
  windowDays: number;
  histWindowsCount: number;
  band: "extreme_low" | "low" | "normal" | "high" | "extreme_high";
  interpretation: string;
}

const WINDOW_MS = 24 * 86_400_000;

export function computeConfidence(
  liveTrades: LiveTrade[],
  hist: HistoricalWindowsFile,
  now: number = Date.now(),
): ConfidenceScore | null {
  // Take the most recent 24-day window of live trades.
  const cutoff = now - WINDOW_MS;
  const recent = liveTrades.filter((t) => t.exit_ts >= cutoff);

  // Need at least 3 live trades to compute a meaningful percentile.
  if (recent.length < 3) {
    return null;
  }

  const n = recent.length;
  const wins = recent.filter((t) => t.pnl > 0).length;
  const wp = recent.filter((t) => t.pnl > 0).reduce((a, t) => a + t.pnl, 0);
  const lp = -recent.filter((t) => t.pnl <= 0).reduce((a, t) => a + t.pnl, 0);
  const wr = wins / n;
  const pf = lp > 0 ? wp / lp : null;
  const sumR = recent.reduce((a, t) => a + (t.r_multiple ?? 0), 0);

  // Percentile rank of liveSumR within hist.windows.sum_r.
  const histR = hist.windows.map((w) => w.sum_r).sort((a, b) => a - b);
  let lower = 0;
  for (const r of histR) {
    if (r < sumR) lower++;
    else break;
  }
  const score = (lower / histR.length) * 100;

  const band: ConfidenceScore["band"] =
    score < 5 ? "extreme_low"
    : score < 25 ? "low"
    : score < 75 ? "normal"
    : score < 95 ? "high"
    : "extreme_high";

  const interpretation = {
    extreme_low: "Live performance in the extreme bottom tail of the historical distribution. Manual review recommended.",
    low: "Live performance in the bottom tail. Within historical variance but watch for sustained pattern.",
    normal: "Live performance is consistent with the realism-patched backtest distribution.",
    high: "Live performance is in the top tail. Expect mean reversion.",
    extreme_high: "Live performance in the extreme top tail. Almost certainly above sustainable rate.",
  }[band];

  return {
    score,
    nLive: n,
    nMin: 3,
    liveSumR: sumR,
    liveWr: wr,
    livePf: pf,
    windowDays: hist.window_days,
    histWindowsCount: hist.windows.length,
    band,
    interpretation,
  };
}
