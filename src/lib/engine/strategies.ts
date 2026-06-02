// Strategy registry — the single source of truth for "which strategies exist,
// what params they run, and where their live forward-test signals live".
//
// We expect MANY variants over time (V5, V5.2, V5.3, V6.x…). Adding one = a new
// entry here + its forward-test tables; no schema migration (bot_settings.strategy
// is a free text key validated against this registry). Both the forward-test cron
// and the customer executor consume this registry so they never drift.

import type { BacktestParams } from "./types";
import { V5_DEFAULTS } from "./defaults";
import { V5_2_DEFAULTS } from "./defaults_v5_2";

export type StrategyDef = {
  key: string; // stable id stored in bot_settings.strategy
  label: string; // UI label
  params: BacktestParams;
  // Live forward-test tables = the signal source the executor mirrors.
  portfoliosTable: string;
  tradesTable: string;
  snapshotsTable: string;
  // Assignable to customers + run by the live executor.
  assignable: boolean;
  // Still under validation — shown in admin UI with a warning, not yet trusted.
  experimental?: boolean;
};

export const STRATEGIES: Record<string, StrategyDef> = {
  v5: {
    key: "v5",
    label: "V5",
    params: V5_DEFAULTS,
    portfoliosTable: "live_portfolios",
    tradesTable: "live_trades",
    snapshotsTable: "live_equity_snapshots",
    assignable: true,
  },
  v5_2: {
    key: "v5_2",
    label: "V5.2",
    params: V5_2_DEFAULTS,
    portfoliosTable: "live_v5_2_portfolios",
    tradesTable: "live_v5_2_trades",
    snapshotsTable: "live_v5_2_equity_snapshots",
    assignable: true,
    experimental: true, // params == V5 until walk-forward validates real ones
  },
};

export const DEFAULT_STRATEGY_KEY = "v5";

export function getStrategy(key?: string | null): StrategyDef {
  return (key && STRATEGIES[key]) || STRATEGIES[DEFAULT_STRATEGY_KEY];
}

export function isValidStrategyKey(key: string): boolean {
  return key in STRATEGIES;
}

/** Strategies an admin may assign to a customer (and the executor will trade). */
export function assignableStrategies(): StrategyDef[] {
  return Object.values(STRATEGIES).filter((s) => s.assignable);
}
