// Metrics computation — port of backtester.py:_compute_metrics
//
// Computes 30+ performance metrics from closed trades and the equity curve.

import type {
  BacktestParams,
  Candle,
  EquityPoint,
  ExitReason,
  Metrics,
  Trade,
} from "./types";

export function computeMetrics(
  trades: Trade[],
  equityCurve: EquityPoint[],
  candles: Candle[],
  params: BacktestParams,
): Metrics {
  const initialCapital = params.initialCapital;
  const finalEquity =
    equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;

  // Time range
  const firstTs = candles[0]?.timestamp ?? 0;
  const lastTs = candles[candles.length - 1]?.timestamp ?? 0;
  const startDate = candles[0]?.date ?? "";
  const endDate = candles[candles.length - 1]?.date ?? "";
  const yearsRaw = (lastTs - firstTs) / 1000 / (365.25 * 24 * 3600);
  const years = Math.max(yearsRaw, 0.01);

  if (trades.length === 0) {
    return emptyMetrics(initialCapital, finalEquity, startDate, endDate, years);
  }

  // ── Basic stats ──
  const closedTrades = trades.filter((t) => t.pnl !== undefined);
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnl ?? 0) <= 0);
  const totalTrades = closedTrades.length;
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = totalTrades > 0 ? winCount / totalTrades : 0;

  const grossProfit = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const netProfit = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

  const avgWin = winCount > 0 ? grossProfit / winCount : 0;
  const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : Infinity;
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

  const largestWin = closedTrades.reduce(
    (m, t) => Math.max(m, t.pnl ?? -Infinity),
    -Infinity,
  );
  const largestLoss = closedTrades.reduce(
    (m, t) => Math.min(m, t.pnl ?? Infinity),
    Infinity,
  );

  // ── Returns ──
  const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;
  const annualizedReturnPct =
    years > 0 ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100 : 0;

  // ── Drawdown ──
  let runningMax = -Infinity;
  let maxDrawdownPct = 0;
  const ddDurations: number[] = [];
  let currentDd = 0;
  for (const point of equityCurve) {
    if (point.equity > runningMax) runningMax = point.equity;
    const dd = runningMax > 0 ? ((point.equity - runningMax) / runningMax) * 100 : 0;
    if (dd < maxDrawdownPct) maxDrawdownPct = dd;
    if (point.equity < runningMax) {
      currentDd += 1;
    } else {
      if (currentDd > 0) ddDurations.push(currentDd);
      currentDd = 0;
    }
  }
  if (currentDd > 0) ddDurations.push(currentDd);
  const maxDdDurationBars = ddDurations.length > 0 ? Math.max(...ddDurations) : 0;
  const avgDdDurationBars =
    ddDurations.length > 0
      ? ddDurations.reduce((s, x) => s + x, 0) / ddDurations.length
      : 0;
  const maxDrawdownPctAbs = Math.abs(maxDrawdownPct);

  // ── Sharpe / Sortino (bar-level) ──
  const equityArr = equityCurve.map((p) => p.equity);
  const returns: number[] = [];
  for (let i = 1; i < equityArr.length; i++) {
    if (equityArr[i - 1] > 0) {
      const r = (equityArr[i] - equityArr[i - 1]) / equityArr[i - 1];
      if (isFinite(r)) returns.push(r);
    }
  }

  let avgBarSeconds = 3600;
  if (candles.length > 1) {
    avgBarSeconds = (lastTs - firstTs) / 1000 / (candles.length - 1);
    if (avgBarSeconds <= 0) avgBarSeconds = 3600;
  }
  const barsPerYear = (365.25 * 24 * 3600) / avgBarSeconds;

  const meanRet = mean(returns);
  const stdRet = std(returns);
  const sharpeRatio =
    stdRet > 0 ? (meanRet / stdRet) * Math.sqrt(barsPerYear) : 0;

  const downside = returns.filter((r) => r < 0);
  const stdDown = std(downside);
  const sortinoRatio =
    stdDown > 0 ? (meanRet / stdDown) * Math.sqrt(barsPerYear) : 0;

  const calmarRatio =
    maxDrawdownPctAbs > 0 ? annualizedReturnPct / maxDrawdownPctAbs : 0;

  // ── Trade direction breakdown ──
  const longTrades = closedTrades.filter((t) => t.direction === "LONG");
  const shortTrades = closedTrades.filter((t) => t.direction === "SHORT");
  const longWins = longTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const shortWins = shortTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const longWinRate = longTrades.length > 0 ? longWins / longTrades.length : 0;
  const shortWinRate = shortTrades.length > 0 ? shortWins / shortTrades.length : 0;

  // ── Trade quality ──
  const barsHeldArr = closedTrades
    .map((t) => t.barsHeld ?? 0)
    .filter((x) => x > 0);
  const avgBarsHeld =
    barsHeldArr.length > 0
      ? barsHeldArr.reduce((s, x) => s + x, 0) / barsHeldArr.length
      : 0;

  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let curWins = 0;
  let curLosses = 0;
  for (const t of closedTrades) {
    if ((t.pnl ?? 0) > 0) {
      curWins += 1;
      curLosses = 0;
      if (curWins > maxConsecWins) maxConsecWins = curWins;
    } else {
      curLosses += 1;
      curWins = 0;
      if (curLosses > maxConsecLosses) maxConsecLosses = curLosses;
    }
  }

  // ── R multiples ──
  const rMultiples = closedTrades
    .filter((t) => (t.riskAmount ?? 0) > 0 && t.pnl !== undefined)
    .map((t) => (t.pnl as number) / t.riskAmount);
  const avgRMultiple = rMultiples.length > 0 ? mean(rMultiples) : 0;
  const maxRMultiple = rMultiples.length > 0 ? Math.max(...rMultiples) : 0;
  const minRMultiple = rMultiples.length > 0 ? Math.min(...rMultiples) : 0;

  // ── Exit reasons ──
  const exitReasons: Partial<Record<ExitReason, number>> = {};
  for (const t of closedTrades) {
    const r = t.exitReason;
    if (!r) continue;
    exitReasons[r] = (exitReasons[r] ?? 0) + 1;
  }

  // ── Commission ──
  const totalCommission = closedTrades.reduce((s, t) => s + t.totalCommission, 0);
  const avgCommissionPerTrade =
    totalTrades > 0 ? totalCommission / totalTrades : 0;
  const commissionPctOfGross =
    grossProfit > 0 ? (totalCommission / grossProfit) * 100 : 0;

  return {
    totalTrades,
    winCount,
    lossCount,
    winRate,
    longTrades: longTrades.length,
    shortTrades: shortTrades.length,
    longWinRate,
    shortWinRate,
    netProfit,
    grossProfit,
    grossLoss,
    profitFactor,
    avgWin,
    avgLoss,
    payoffRatio,
    expectancy,
    largestWin: isFinite(largestWin) ? largestWin : 0,
    largestLoss: isFinite(largestLoss) ? largestLoss : 0,
    totalReturnPct,
    annualizedReturnPct,
    finalEquity,
    maxDrawdownPct: maxDrawdownPctAbs,
    maxDdDurationBars,
    avgDdDurationBars,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    avgBarsHeld,
    maxConsecWins,
    maxConsecLosses,
    avgRMultiple,
    maxRMultiple,
    minRMultiple,
    exitReasons,
    totalCommission,
    avgCommissionPerTrade,
    commissionPctOfGross,
    startDate,
    endDate,
    years,
  };
}

// ── helpers ──

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function std(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  // Python's pandas/numpy default ddof for .std() is 1 for pandas, 0 for numpy.
  // backtester.py uses np.diff/std which is ddof=0 (population std). Match that.
  return Math.sqrt(s / xs.length);
}

function emptyMetrics(
  initialCapital: number,
  finalEquity: number,
  startDate: string,
  endDate: string,
  years: number,
): Metrics {
  return {
    totalTrades: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    longTrades: 0,
    shortTrades: 0,
    longWinRate: 0,
    shortWinRate: 0,
    netProfit: 0,
    grossProfit: 0,
    grossLoss: 0,
    profitFactor: 0,
    avgWin: 0,
    avgLoss: 0,
    payoffRatio: 0,
    expectancy: 0,
    largestWin: 0,
    largestLoss: 0,
    totalReturnPct: ((finalEquity - initialCapital) / initialCapital) * 100,
    annualizedReturnPct: 0,
    finalEquity,
    maxDrawdownPct: 0,
    maxDdDurationBars: 0,
    avgDdDurationBars: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    calmarRatio: 0,
    avgBarsHeld: 0,
    maxConsecWins: 0,
    maxConsecLosses: 0,
    avgRMultiple: 0,
    maxRMultiple: 0,
    minRMultiple: 0,
    exitReasons: {},
    totalCommission: 0,
    avgCommissionPerTrade: 0,
    commissionPctOfGross: 0,
    startDate,
    endDate,
    years,
  };
}
