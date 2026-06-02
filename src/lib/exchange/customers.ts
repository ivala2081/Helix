// Shared loaders + per-customer orchestration for the executor. SERVER-ONLY.
// Used by both the CLI worker (scripts/executor-tick.ts) and the admin test
// button. Eligibility = active subscription AND bot enabled AND a connected
// exchange — the same gate the customer UI enforces, re-checked here so the bot
// never trades an account that lapsed since the UI last ran.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSubscriptionActive } from "../subscription/status";
import { FORWARD_TEST_COINS, FORWARD_TEST_INITIAL_CAPITAL } from "../engine/live-config";
import { evaluateKillSwitch, type MinimalTrade } from "../engine/kill-switch";
import type { BinanceFuturesClient, FuturesFilters } from "./binance-futures";
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
import type { FuturesEnv } from "./binance-futures";

export type SymbolSignal = { target: EngineTarget; updatedAt: number | null };

export type EligibleCustomer = {
  userId: string;
  conn: ExchangeConnectionRow;
  riskPct: number; // fraction (e.g. 0.01), already clamped
  symbols: string[];
};

const FORWARD_COINS = new Set<string>(FORWARD_TEST_COINS as readonly string[]);

/** Customers the bot may trade right now: bot enabled, exchange connected, and
 *  a currently-active subscription (newest row, expiry-aware). */
export async function loadEligibleCustomers(
  db: SupabaseClient,
): Promise<EligibleCustomer[]> {
  const { data: bots } = await db
    .from("bot_settings")
    .select("user_id, risk_pct, symbols")
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

  // Newest subscription row per user (rows already sorted created_at desc).
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
    eligible.push({ userId, conn, riskPct, symbols });
  }
  return eligible;
}

/** V5 desired position per symbol + the cron timestamp behind it (for the
 *  freshness gate), from live_portfolios. */
export async function loadV5Signals(
  db: SupabaseClient,
): Promise<Map<string, SymbolSignal>> {
  const { data } = await db
    .from("live_portfolios")
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
 *  Only computed for symbols that actually have a target (no target → no open).
 *  Kill-switch is evaluated from the V5 forward-test record (live_trades). */
export async function computeOpenGates(
  db: SupabaseClient,
  signals: Map<string, SymbolSignal>,
  now: number,
  maxAgeMs: number = DEFAULT_MAX_SIGNAL_AGE_MS,
): Promise<Map<string, OpenGate>> {
  const gates = new Map<string, OpenGate>();
  const monthAgo = now - 30 * 86_400_000;

  for (const [symbol, sig] of signals) {
    if (sig.target === null) continue; // nothing to open
    const fresh = isSignalFresh(sig.updatedAt, now, maxAgeMs);

    const { data } = await db
      .from("live_trades")
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
      parityLastPassedAt: null, // K4 skipped here; parity is a cron-side concern
      currentState: null,
    });

    gates.set(symbol, buildOpenGate(fresh, ks));
  }
  return gates;
}

/** Run a reconciliation cycle for every relevant symbol of one customer. Skips
 *  symbols with no target and no open position (avoids needless API calls). On a
 *  client-level failure (bad key / IP / network) flags the connection 'error'. */
export type CycleOptions = {
  gates?: Map<string, OpenGate>;
  dryRun?: boolean;
};

export async function runCustomerCycle(
  db: SupabaseClient,
  customer: EligibleCustomer,
  signals: Map<string, SymbolSignal>,
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

  // Which symbols does this customer currently hold an open trade on?
  const { data: openRows } = await db
    .from("user_trades")
    .select("symbol")
    .eq("user_id", customer.userId)
    .eq("status", "open");
  const openSymbols = new Set((openRows ?? []).map((r) => r.symbol as string));

  const records: CycleRecord[] = [];
  for (const symbol of customer.symbols) {
    const target = signals.get(symbol)?.target ?? null;
    if (target === null && !openSymbols.has(symbol)) continue; // nothing to do

    const gate = opts.gates?.get(symbol);
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
      // Only DISABLE the connection for a genuine credential/permission/IP
      // problem (needs customer action). A transient network blip must NOT lock
      // a paying customer out — reconciliation is idempotent and self-heals next
      // tick, so we just skip and leave the connection 'connected'.
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
    m.includes("[code -2015]") || // invalid key / IP not whitelisted
    m.includes("[code -1022]") || // bad signature (wrong secret)
    m.includes("[code -2014]") || // bad api-key format
    m.includes("[code -1099]") || // not found / auth
    m.includes("(401)") ||
    m.includes("(403)") ||
    m.includes("api-key") ||
    m.includes("permission") ||
    m.includes("malformed ciphertext") // our own decrypt failure
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
