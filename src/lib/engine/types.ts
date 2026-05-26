// Helix Engine — Type Definitions
// All types for the TypeScript port of the Python backtester.

export interface Candle {
  timestamp: number; // ms since epoch (Binance openTime)
  date: string; // ISO 8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  atr14?: number;
}

export type Direction = "LONG" | "SHORT";
export type Action = "LONG" | "SHORT" | "NONE";
export type SignalSource = "market_structure" | "fvg";
export type ExitReason =
  | "TP1"
  | "TP2"
  | "TP3"
  | "Stop Loss"
  | "Hard Stop"
  | "Trailing Stop"
  | "End of data";

export interface Signal {
  source: SignalSource;
  type: Direction;
  strength: number; // 0..1
  entryPrice: number;
  stopLoss: number;
  reason: string;
  barIndex: number;
}

export interface AggregatedDecision {
  action: Action;
  score: number;
  entryPrice?: number;
  stopLoss?: number;
  reasons: string[];
}

export type Trend = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface FVGZone {
  direction: "bullish" | "bearish";
  top: number;
  bottom: number;
  creationBar: number;
  filled: boolean;
  tested: boolean;
}

export interface Trade {
  id: number;
  direction: Direction;
  entryBar: number;
  entryTs?: number; // ms epoch timestamp of entry candle (set by streaming engine)
  entryDate: string;
  entryPrice: number;
  initialStopLoss: number;
  stopLoss: number; // mutates after breakeven move
  hardStop: number | null;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  size: number; // initial base-asset units
  remainingSize: number;
  riskAmount: number;
  signalScore: number;
  signalReasons: string[];
  // state
  tp1Hit: boolean;
  tp2Hit: boolean;
  partialPnl: number;
  entryCommission: number;
  exitCommission: number;
  totalCommission: number;
  maxFavorable: number; // MFE in $
  maxAdverse: number; // MAE in $
  // exit fields (set on close)
  exitBar?: number;
  exitDate?: string;
  exitPrice?: number;
  exitReason?: ExitReason;
  pnl?: number;
  pnlPct?: number;
  rMultiple?: number;
  barsHeld?: number;
  // V6.2 — trailing-after-TP1 state
  trailingStop?: number | null; // current trailing stop level after TP1
  trailingPeak?: number | null; // running max-high (LONG) or min-low (SHORT)
  // V6.2 — 2-bar TP close-confirm state
  tpConfirmCounts?: { tp1: number; tp2: number; tp3: number };
}

export interface BacktestParams {
  // Capital & risk
  initialCapital: number;
  riskPct: number;
  maxPositionPct: number;
  // Signals
  useMarketStructure: boolean;
  useFvg: boolean;
  minConfluence: number;
  // SL
  slAtrMult: number;
  // TPs
  tp1AtrMult: number;
  tp2AtrMult: number;
  tp3AtrMult: number;
  tp1ClosePct: number;
  tp2ClosePct: number;
  tp3ClosePct: number;
  // Trailing (DISABLED in V5 but kept for shape compat)
  useTrailing: boolean;
  // V6.2 — trail-after-TP1 (replaces V5's TP1/TP2/TP3 mix).
  // When true: TP1 locks tp1ClosePct of position at tp1AtrMult * ATR, then the
  // remaining 90% rides a trailing stop at trailAfterTp1Atr * ATR below the
  // running peak (for LONG) / above the running trough (for SHORT). TP2/TP3
  // are ignored when this mode is active.
  trailAfterTp1?: boolean;
  trailAfterTp1Atr?: number;
  // Risk management improvements
  beAfterTp1: boolean;
  beBufferAtr: number;
  minSignalScore: number;
  // SL suppression
  minBarsBeforeSl: number;
  // Execution
  warmupBars: number;
  commissionPct: number;
  slippagePct: number;
  // Realism patches (Phase 2 of launch plan, 2026-05-08).
  // tpRequireClose: TP fills only if the bar's close confirms the level;
  //   wick-only pokes do not trigger TP. Eliminates the wick-fill bias.
  // slippageAtrFrac: ATR-scaled additive slippage (in addition to slippagePct).
  // spreadAtrFrac: bid/ask spread cost as a fraction of ATR; applied to fills.
  tpRequireClose: boolean;
  // V6.2 — require N consecutive bars to close beyond TP before the fill is
  // accepted (1 = V5 behavior, 2 = V6.2 strict-realism behavior).
  tpRequireCloseBars?: number;
  slippageAtrFrac: number;
  spreadAtrFrac: number;
  // Hard stop
  useHardStop: boolean;
  hardStopAtrMult: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdownPct: number;
}

export interface Metrics {
  // Trade summary
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number; // 0..1
  longTrades: number;
  shortTrades: number;
  longWinRate: number;
  shortWinRate: number;
  // PnL
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  payoffRatio: number;
  expectancy: number;
  largestWin: number;
  largestLoss: number;
  // Returns
  totalReturnPct: number;
  annualizedReturnPct: number;
  finalEquity: number;
  // Risk
  maxDrawdownPct: number;
  maxDdDurationBars: number;
  avgDdDurationBars: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  // Trade quality
  avgBarsHeld: number;
  maxConsecWins: number;
  maxConsecLosses: number;
  avgRMultiple: number;
  maxRMultiple: number;
  minRMultiple: number;
  // Exit reasons
  exitReasons: Partial<Record<ExitReason, number>>;
  // Commission
  totalCommission: number;
  avgCommissionPerTrade: number;
  commissionPctOfGross: number;
  // Time
  startDate: string;
  endDate: string;
  years: number;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: EquityPoint[];
  metrics: Metrics;
  params: BacktestParams;
  candles: Candle[];
  symbol: string;
  interval: string;
}

export type ProgressCallback = (pct: number, message?: string) => void;
