// Target-state reconciliation: mirror the shared V5 signal onto one customer's
// USDT-M futures account. SERVER-ONLY.
//
// The shared engine (live_portfolios.open_trade) is the single source of truth
// for the DESIRED position per symbol. For each customer we compute the target
// quantity and reconcile their ACTUAL position toward it — idempotent, so a
// missed tick or a restart self-heals on the next run (no event replay → no
// drift). The decision is a PURE function (`reconcile`) for unit testing; the
// imperative `runReconcileCycle` reads balance/position, executes orders, and
// persists user_trades.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type BinanceFuturesClient,
  type FuturesFilters,
  type Side,
  roundStep,
} from "./binance-futures";
import { calculatePositionSize } from "../engine/sizing";
import { V5_DEFAULTS } from "../engine/defaults";

// ─── Pure reconciliation ────────────────────────────────────────────

/** Desired position for a symbol, derived from live_portfolios.open_trade.
 *  `trade: null` ⇒ engine is flat ⇒ customer should hold no position. */
export type EngineTarget = {
  id: number; // engine trade id (per-symbol sequence)
  direction: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss: number;
  size: number; // engine virtual full size
  remainingSize: number; // engine virtual remaining (drops as TPs fill)
  tp1Hit: boolean;
  tp2Hit: boolean;
} | null;

/** The customer's currently-open user_trades row for a symbol (if any). */
export type OpenUserTrade = {
  engineTradeId: number | null;
  direction: "LONG" | "SHORT";
  entryQty: number; // locked at entry from the customer's balance
  remainingQty: number;
  tpStage: number;
};

export type ReconcileInput = {
  target: EngineTarget;
  open: OpenUserTrade | null;
  /** signed qty on the customer's account: + long, − short, 0 flat */
  actualPositionAmt: number;
  /** available futures USDT balance (for entry sizing) */
  balanceUsdt: number;
  /** risk fraction, e.g. 0.01 for 1% (NOT percent units) */
  riskPct: number;
  filters: FuturesFilters;
  /** true if a user_trades row (any status) already exists for target.id —
   *  prevents re-entering a trade we already took (idempotency across ticks). */
  alreadyTradedEngineId: boolean;
  /** Safety gate: may the bot OPEN a new position right now? When false, fresh
   *  entries become noops but reduces/closes still run (a customer can always
   *  exit). Defaults to true. See safety.ts (freshness + kill-switch). */
  allowOpen?: boolean;
  openBlockReason?: string;
};

export type ReconcileAction =
  | { kind: "noop"; reason: string }
  | {
      kind: "open";
      side: Side;
      qty: number;
      engineTradeId: number;
      entryPrice: number;
      stopLoss: number;
      notional: number;
    }
  | { kind: "reduce"; side: Side; qty: number; tpStage: number }
  | { kind: "close"; side: Side; qty: number; reason: string };

const MAX_POS_PCT = V5_DEFAULTS.maxPositionPct;

const closeSide = (dir: "LONG" | "SHORT"): Side =>
  dir === "LONG" ? "SELL" : "BUY";

/** Decide the single order (if any) to bring this customer's position in line
 *  with the engine target. Pure — no network, no clock. */
export function reconcile(input: ReconcileInput): ReconcileAction {
  const { target, open, actualPositionAmt, balanceUsdt, riskPct, filters } = input;
  const step = filters.stepSize;
  const actualAbs = Math.abs(actualPositionAmt);

  // ── Engine flat: customer must be flat too. ──
  if (target === null) {
    if (open) {
      // Close any residual position; if already flat on the exchange, qty 0 just
      // closes the bookkeeping row (e.g. a manual close or an earlier fill).
      const qty = actualAbs > 0 ? roundStep(actualAbs, step) : 0;
      return { kind: "close", side: closeSide(open.direction), qty, reason: "engine flat" };
    }
    return { kind: "noop", reason: "flat" };
  }

  // ── Engine has a trade. ──
  // Customer not in it yet → maybe OPEN.
  if (!open) {
    // Safety gate first: stale signal or a tripped kill-switch freezes ENTRIES
    // (managing an existing position is never blocked — see safety.ts).
    if (input.allowOpen === false) {
      return { kind: "noop", reason: `open blocked: ${input.openBlockReason ?? "safety gate"}` };
    }
    if (input.alreadyTradedEngineId) {
      return { kind: "noop", reason: "engine trade already taken (closed)" };
    }
    // Late-join guard: never enter a trade that has already partially closed —
    // we'd buy a worse remainder at the wrong size. Wait for the next fresh one.
    if (target.remainingSize < target.size || target.tp1Hit) {
      return { kind: "noop", reason: "late-join: trade past TP1" };
    }
    const sized = calculatePositionSize(
      balanceUsdt,
      target.entryPrice,
      target.stopLoss,
      target.direction,
      riskPct,
      // 1x futures: notional can't exceed margin, so cap at min(V5 cap, 1.0).
      Math.min(MAX_POS_PCT, 0.99),
    );
    const qty = roundStep(sized.size, step);
    const notional = qty * target.entryPrice;
    if (qty < filters.minQty || qty <= 0 || notional < filters.minNotional) {
      return { kind: "noop", reason: "below min qty/notional (balance too small)" };
    }
    return {
      kind: "open",
      side: target.direction === "LONG" ? "BUY" : "SELL",
      qty,
      engineTradeId: target.id,
      entryPrice: target.entryPrice,
      stopLoss: target.stopLoss,
      notional,
    };
  }

  // Customer already in a trade.
  // Engine moved on to a DIFFERENT trade while ours still shows open → close ours
  // (next tick re-evaluates the new one fresh).
  if (open.engineTradeId !== target.id) {
    const qty = actualAbs > 0 ? roundStep(actualAbs, step) : 0;
    return { kind: "close", side: closeSide(open.direction), qty, reason: "stale trade id" };
  }

  // Same trade → reconcile to the target remaining fraction (this is how TP1/TP2
  // partials execute: remainingSize/size drops to 0.95 then 0.65).
  const frac = target.size > 0 ? target.remainingSize / target.size : 0;
  const targetQty = roundStep(open.entryQty * frac, step);
  const reduceBy = actualAbs - targetQty;
  if (reduceBy > step) {
    const tpStage = target.tp2Hit ? 2 : target.tp1Hit ? 1 : 0;
    return {
      kind: "reduce",
      side: closeSide(open.direction),
      qty: roundStep(reduceBy, step),
      tpStage,
    };
  }
  return { kind: "noop", reason: "in sync" };
}

// ─── Imperative cycle (one customer × one symbol) ───────────────────

export type CycleContext = {
  db: SupabaseClient; // service-role (writes user_trades, bypasses RLS)
  client: BinanceFuturesClient;
  userId: string;
  symbol: string;
  target: EngineTarget;
  riskPct: number; // fraction
  env: "testnet" | "live";
  filters: FuturesFilters;
  /** Safety gate for OPENs (freshness + kill-switch). Default allow. */
  allowOpen?: boolean;
  openBlockReason?: string;
  /** When true, decide + log the action but place NO orders and write NO rows. */
  dryRun?: boolean;
};

export type CycleRecord = {
  symbol: string;
  action: string;
  detail: string;
  error?: string;
};

/** Run one reconciliation cycle for a customer/symbol: read live position +
 *  balance, decide, execute the order, and persist the user_trades row. */
export async function runReconcileCycle(ctx: CycleContext): Promise<CycleRecord> {
  const { db, client, userId, symbol, target, riskPct, env, filters, dryRun } = ctx;
  try {
    const [actual, balance, openRow] = await Promise.all([
      client.positionAmt(symbol),
      client.availableUsdt(),
      loadOpenUserTrade(db, userId, symbol),
    ]);

    const alreadyTradedEngineId =
      target !== null && !openRow
        ? await engineTradeAlreadyTaken(db, userId, symbol, target.id)
        : false;

    const action = reconcile({
      target,
      open: openRow?.open ?? null,
      actualPositionAmt: actual,
      balanceUsdt: balance,
      riskPct,
      filters,
      alreadyTradedEngineId,
      allowOpen: ctx.allowOpen,
      openBlockReason: ctx.openBlockReason,
    });

    // Dry-run: report the decision, touch nothing.
    if (dryRun && action.kind !== "noop") {
      const q = "qty" in action ? action.qty : "";
      return { symbol, action: `dry:${action.kind}`, detail: `[dry-run] would ${action.kind} ${q}` };
    }

    switch (action.kind) {
      case "noop":
        return { symbol, action: "noop", detail: action.reason };

      case "open": {
        // Idempotent setup before the first order: 1x, isolated margin.
        await client.setIsolated(symbol);
        await client.setLeverage(symbol, 1);
        const order = await client.marketOrder(symbol, action.side, action.qty);
        const fill = await client.price(symbol);
        const { error } = await db.from("user_trades").insert({
          user_id: userId,
          exchange: "binance",
          symbol,
          direction: target!.direction,
          status: "open",
          entry_price: fill,
          size: action.qty,
          entry_qty: action.qty,
          remaining_qty: action.qty,
          tp_stage: 0,
          notional: action.notional,
          risk_pct_used: riskPct,
          engine_trade_id: action.engineTradeId,
          entry_order_id: String(order.orderId ?? ""),
          env,
        });
        if (error) throw new Error("insert user_trade: " + error.message);
        return {
          symbol,
          action: "open",
          detail: `${action.side} ${action.qty} @ ~${fill} (eng#${action.engineTradeId})`,
        };
      }

      case "reduce": {
        await client.reduceMarket(symbol, action.side, action.qty);
        const fill = await client.price(symbol);
        const row = openRow!.open;
        const realized = signedPnl(row.direction, openRow!.entryPrice, fill, action.qty);
        // Compare-and-set on the pre-image (status + the remaining_qty we read):
        // if a concurrent tick already applied this partial, 0 rows match and we
        // DON'T double-count pnl or under-report remaining_qty. The single-flight
        // lock makes overlap the exceptional case; this is the backstop that keeps
        // the realized-pnl basis the per-customer drawdown breaker reads correct.
        const { data: upd, error } = await db
          .from("user_trades")
          .update({
            remaining_qty: Math.max(0, row.remainingQty - action.qty),
            tp_stage: action.tpStage,
            pnl: (openRow!.pnl ?? 0) + realized,
          })
          .eq("id", openRow!.id)
          .eq("status", "open")
          .eq("remaining_qty", row.remainingQty)
          .select("id");
        if (error) throw new Error("update (reduce): " + error.message);
        if (!upd || upd.length === 0) {
          return {
            symbol,
            action: "conflict",
            detail: "reduce lost a write race (row already advanced)",
            error: "concurrent-write: reduce",
          };
        }
        return {
          symbol,
          action: "reduce",
          detail: `TP${action.tpStage} ${action.side} ${action.qty} @ ~${fill}`,
        };
      }

      case "close": {
        if (action.qty > 0) await client.reduceMarket(symbol, action.side, action.qty);
        const fill = await client.price(symbol);
        const row = openRow!.open;
        const realized =
          action.qty > 0
            ? signedPnl(row.direction, openRow!.entryPrice, fill, action.qty)
            : 0;
        const pnl = (openRow!.pnl ?? 0) + realized;
        const notional = openRow!.notional ?? openRow!.entryPrice * row.entryQty;
        // CAS on status: only the FIRST close flips open→closed; a concurrent
        // duplicate sees status='closed', matches 0 rows, and bails — no double
        // pnl write. (Closes are never gated, so this is the sole guard against a
        // racing duplicate close clobbering the realized total.)
        const { data: upd, error } = await db
          .from("user_trades")
          .update({
            status: "closed",
            remaining_qty: 0,
            exit_price: fill,
            pnl,
            pnl_pct: notional > 0 ? (pnl / notional) * 100 : 0,
            exit_reason: action.reason,
            closed_at: new Date().toISOString(),
          })
          .eq("id", openRow!.id)
          .eq("status", "open")
          .select("id");
        if (error) throw new Error("update (close): " + error.message);
        if (!upd || upd.length === 0) {
          return {
            symbol,
            action: "conflict",
            detail: "close lost a write race (already closed)",
            error: "concurrent-write: close",
          };
        }
        return { symbol, action: "close", detail: `${action.side} ${action.qty} @ ~${fill} (pnl ${pnl.toFixed(2)})` };
      }
    }
  } catch (e) {
    return { symbol, action: "error", detail: "", error: (e as Error).message };
  }
}

function signedPnl(
  dir: "LONG" | "SHORT",
  entry: number,
  exit: number,
  qty: number,
): number {
  return dir === "LONG" ? (exit - entry) * qty : (entry - exit) * qty;
}

type OpenRowResult = {
  id: number;
  entryPrice: number;
  notional: number | null;
  pnl: number | null;
  open: OpenUserTrade;
};

async function loadOpenUserTrade(
  db: SupabaseClient,
  userId: string,
  symbol: string,
): Promise<OpenRowResult | null> {
  const { data } = await db
    .from("user_trades")
    .select("id, direction, entry_price, entry_qty, remaining_qty, tp_stage, engine_trade_id, notional, pnl")
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .eq("status", "open")
    .limit(1);
  const r = data?.[0];
  if (!r) return null;
  return {
    id: r.id as number,
    entryPrice: Number(r.entry_price),
    notional: r.notional != null ? Number(r.notional) : null,
    pnl: r.pnl != null ? Number(r.pnl) : null,
    open: {
      engineTradeId: r.engine_trade_id != null ? Number(r.engine_trade_id) : null,
      direction: r.direction as "LONG" | "SHORT",
      entryQty: Number(r.entry_qty),
      remainingQty: Number(r.remaining_qty),
      tpStage: Number(r.tp_stage ?? 0),
    },
  };
}

async function engineTradeAlreadyTaken(
  db: SupabaseClient,
  userId: string,
  symbol: string,
  engineTradeId: number,
): Promise<boolean> {
  const { count } = await db
    .from("user_trades")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .eq("engine_trade_id", engineTradeId);
  return (count ?? 0) > 0;
}

/** Build an EngineTarget from a live_portfolios.open_trade JSONB value. */
export function targetFromOpenTrade(openTrade: unknown): EngineTarget {
  if (!openTrade || typeof openTrade !== "object") return null;
  const t = openTrade as Record<string, unknown>;
  if (t.id == null || t.direction == null) return null;
  return {
    id: Number(t.id),
    direction: t.direction as "LONG" | "SHORT",
    entryPrice: Number(t.entryPrice),
    stopLoss: Number(t.stopLoss),
    size: Number(t.size),
    remainingSize: Number(t.remainingSize),
    tp1Hit: Boolean(t.tp1Hit),
    tp2Hit: Boolean(t.tp2Hit),
  };
}
