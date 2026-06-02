// Shared loaders + per-customer orchestration for the executor. SERVER-ONLY.
// Used by both the CLI worker (scripts/executor-tick.ts) and the admin test
// button. Eligibility = active subscription AND bot enabled AND a connected
// exchange — the same gate the customer UI enforces, re-checked here so the bot
// never trades an account that lapsed since the UI last ran.
//
// Per-customer strategy: each customer runs one strategy from the registry
// (src/lib/engine/strategies.ts). The executor mirrors THAT strategy's live
// forward-test signal (its portfolios table). Customer X can run V5 while
// customer Y runs V5.2.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSubscriptionActive } from "../subscription/status";
import { FORWARD_TEST_COINS, FORWARD_TEST_INITIAL_CAPITAL } from "../engine/live-config";
import { evaluateKillSwitch, type MinimalTrade } from "../engine/kill-switch";
import { getStrategy, type StrategyDef } from "../engine/strategies";
import type { BinanceFuturesClient, FuturesFilters, FuturesEnv } from "./binance-futures";
import { clientFromConnection, type ExchangeConnectionRow } from "./customer-account";
import {
  runReconcileCycle,
  targetFromOpenTrade,
  type CycleRecord,
  type EngineTarget,
} from "./executor";
import {
  buildOpenGate,
  isSignalFresh,
  type OpenGate,
  DEFAULT_MAX_SIGNAL_AGE_MS,
} from "./safety";

export type SymbolSignal = { target: EngineTarget; updatedAt: number | null };

export type EligibleCustomer = {
  userId: string;
  conn: ExchangeConnectionRow;
  riskPct: number; // fraction (e.g. 0.01), already clamped
  symbols: string[];
  strategy: string; // registry key, e.g. 'v5' | 'v5_2'
};

/** Per-strategy loaded context: its definition, current signals, and open-gates. */
export type StrategyContext = {
  def: StrategyDef;
  signals: Map<string, SymbolSignal>;
  gates: Map<string, OpenGate>;
};

const FORWARD_COINS = new Set<string>(FORWARD_TEST_COINS as readonly string[]);

/** Customers the bot may trade right now: bot enabled, exchange connected, and
 *  a currently-active subscription (newest row, expiry-aware). */
export async function loadEligibleCustomers(
  db: SupabaseClient,
): Promise<EligibleCustomer[]> {
  const { data: bots } = await db
    .from("bot_settings")
    .select("user_id, risk_pct, symbols, strategy")
    .eq("enabled", true);
  if (!bots || bots.length === 0) return [];

  const userIds = bots.map((b) => b.user_id as string);

  const [{ data: conns }, { data: subs }] = await Promise.all([
    db
      .from("exchange_connections")
      .select("user_id, exchange, api_key_enc, api_secret_enc, status")
      .in("user_id", userIds)
      .eq("status", "connected"),
    db
      .from("subscriptions")
      .select("user_id, status, expires_at, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }),
  ]);

  const connByUser = new Map<string, ExchangeConnectionRow>();
  for (const c of conns ?? []) connByUser.set(c.user_id as string, c as ExchangeConnectionRow);

  const newestSub = new Map<string, { status: string; expires_at?: string | null }>();
  for (const s of subs ?? []) {
    if (!newestSub.has(s.user_id as string)) {
      newestSub.set(s.user_id as string, { status: s.status as string, expires_at: s.expires_at as string | null });
    }
  }

  const eligible: EligibleCustomer[] = [];
  for (const b of bots) {
    const userId = b.user_id as string;
    const conn = connByUser.get(userId);
    if (!conn) continue;
    if (!isSubscriptionActive(newestSub.get(userId) ?? null)) continue;
    const riskRaw = Number(b.risk_pct);
    const riskPct = (Number.isFinite(riskRaw) ? Math.min(5, Math.max(0.25, riskRaw)) : 1) / 100;
    const symbols = (b.symbols as string[] | null)?.filter((s) => FORWARD_COINS.has(s)) ?? [];
    // getStrategy falls back to V5 for an unknown/removed key (fail-safe).
    const strategy = getStrategy(b.strategy as string | null).key;
    eligible.push({ userId, conn, riskPct, symbols, strategy });
  }
  return eligible;
}

/** Desired position per symbol + cron timestamp (freshness gate), from a
 *  strategy's live forward-test portfolios table. */
export async function loadStrategySignals(
  db: SupabaseClient,
  portfoliosTable: string,
): Promise<Map<string, SymbolSignal>> {
  const { data } = await db
    .from(portfoliosTable)
    .select("symbol, open_trade, updated_at")
    .eq("status", "active");
  const map = new Map<string, SymbolSignal>();
  for (const row of data ?? []) {
    const updatedAt = row.updated_at ? new Date(row.updated_at as string).getTime() : null;
    map.set(row.symbol as string, {
      target: targetFromOpenTrade(row.open_trade),
      updatedAt,
    });
  }
  return map;
}

/** Per-symbol "may we OPEN now?" gate = signal fresh AND kill-switch not tripped.
 *  Only computed for symbols that have a target. Kill-switch is evaluated from
 *  the strategy's own forward-test trade record. */
export async function computeOpenGates(
  db: SupabaseClient,
  signals: Map<string, SymbolSignal>,
  tradesTable: string,
  now: number,
  maxAgeMs: number = DEFAULT_MAX_SIGNAL_AGE_MS,
): Promise<Map<string, OpenGate>> {
  const gates = new Map<string, OpenGate>();
  const monthAgo = now - 30 * 86_400_000;

  for (const [symbol, sig] of signals) {
    if (sig.target === null) continue;
    const fresh = isSignalFresh(sig.updatedAt, now, maxAgeMs);

    const { data } = await db
      .from(tradesTable)
      .select("exit_ts, pnl, r_multiple")
      .eq("symbol", symbol)
      .gte("exit_ts", monthAgo)
      .order("exit_ts", { ascending: true });
    const recentTrades: MinimalTrade[] = (data ?? []).map((t) => ({
      exitTs: Number(t.exit_ts),
      pnl: Number(t.pnl),
      rMultiple: t.r_multiple != null ? Number(t.r_multiple) : null,
    }));
    const ks = evaluateKillSwitch({
      now,
      initialCapital: FORWARD_TEST_INITIAL_CAPITAL,
      recentTrades,
      parityLastPassedAt: null,
      currentState: null,
    });
    gates.set(symbol, buildOpenGate(fresh, ks));
  }
  return gates;
}

/** Load signals + open-gates for each distinct strategy the eligible customers
 *  use, so a tick reads each strategy's signal source exactly once. */
export async function loadStrategyContexts(
  db: SupabaseClient,
  strategyKeys: Iterable<string>,
  now: number,
  maxAgeMs: number = DEFAULT_MAX_SIGNAL_AGE_MS,
): Promise<Map<string, StrategyContext>> {
  const out = new Map<string, StrategyContext>();
  const keys = new Set<string>([...strategyKeys]);
  for (const key of keys) {
    const def = getStrategy(key);
    if (out.has(def.key)) continue; // unknown keys collapse to the same fallback
    const signals = await loadStrategySignals(db, def.portfoliosTable);
    const gates = await computeOpenGates(db, signals, def.tradesTable, now, maxAgeMs);
    out.set(def.key, { def, signals, gates });
  }
  return out;
}

export type CycleOptions = { dryRun?: boolean };

/** Run a reconciliation cycle for every relevant symbol of one customer, using
 *  the customer's assigned strategy context. Skips symbols with no target and no
 *  open position. On a hard credential failure flags the connection 'error'. */
export async function runCustomerCycle(
  db: SupabaseClient,
  customer: EligibleCustomer,
  ctx: StrategyContext,
  env: FuturesEnv,
  filtersCache: Map<string, FuturesFilters>,
  opts: CycleOptions = {},
): Promise<CycleRecord[]> {
  let client: BinanceFuturesClient;
  try {
    client = clientFromConnection(customer.conn, env);
  } catch (e) {
    await flagConnectionError(db, customer.userId, (e as Error).message);
    return [{ symbol: "*", action: "error", detail: "decrypt", error: (e as Error).message }];
  }

  const { data: openRows } = await db
    .from("user_trades")
    .select("symbol")
    .eq("user_id", customer.userId)
    .eq("status", "open");
  const openSymbols = new Set((openRows ?? []).map((r) => r.symbol as string));

  const records: CycleRecord[] = [];
  for (const symbol of customer.symbols) {
    const target = ctx.signals.get(symbol)?.target ?? null;
    if (target === null && !openSymbols.has(symbol)) continue;

    const gate = ctx.gates.get(symbol);
    try {
      let filters = filtersCache.get(symbol);
      if (!filters) {
        filters = await client.symbolFilters(symbol);
        filtersCache.set(symbol, filters);
      }
      const rec = await runReconcileCycle({
        db,
        client,
        userId: customer.userId,
        symbol,
        target,
        riskPct: customer.riskPct,
        env,
        filters,
        allowOpen: gate ? gate.allowOpen : true,
        openBlockReason: gate?.reason,
        dryRun: opts.dryRun,
      });
      records.push(rec);
      if (rec.error && isHardConnectionError(rec.error)) {
        await flagConnectionError(db, customer.userId, rec.error);
      }
    } catch (e) {
      const msg = (e as Error).message;
      records.push({ symbol, action: "error", detail: "", error: msg });
      if (isHardConnectionError(msg)) await flagConnectionError(db, customer.userId, msg);
    }
  }
  return records;
}

/** True only for errors that mean the customer's key itself is bad (auth, IP
 *  whitelist, missing permission, withdrawal) — i.e. trading can't proceed until
 *  THEY fix it. Network/transient errors return false (soft skip, stay live). */
function isHardConnectionError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("[code -2015]") ||
    m.includes("[code -1022]") ||
    m.includes("[code -2014]") ||
    m.includes("[code -1099]") ||
    m.includes("(401)") ||
    m.includes("(403)") ||
    m.includes("api-key") ||
    m.includes("permission") ||
    m.includes("malformed ciphertext")
  );
}

async function flagConnectionError(
  db: SupabaseClient,
  userId: string,
  message: string,
): Promise<void> {
  await db
    .from("exchange_connections")
    .update({ status: "error", last_error: message.slice(0, 500) })
    .eq("user_id", userId);
}
