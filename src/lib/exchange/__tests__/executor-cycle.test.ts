import { describe, it, expect } from "vitest";
import { runReconcileCycle, type EngineTarget } from "../executor";
import type { BinanceFuturesClient, FuturesFilters } from "../binance-futures";
import type { SupabaseClient } from "@supabase/supabase-js";

// runReconcileCycle places the exchange order then persists the user_trades row
// with a COMPARE-AND-SET write (status / remaining_qty pre-image). These tests
// drive the reduce + close paths and assert that a concurrent write (the CAS
// matching 0 rows) is surfaced as a `conflict` record — never a silent double
// pnl-count, which would corrupt the basis the drawdown breaker reads.

const filters: FuturesFilters = { stepSize: 0.001, tickSize: 0.1, minQty: 0.001, minNotional: 5 };

const client = {
  positionAmt: async () => 10,
  availableUsdt: async () => 10_000,
  price: async () => 100,
  reduceMarket: async () => ({ orderId: 1, status: "NEW" }),
  marketOrder: async () => ({ orderId: 1, status: "NEW" }),
  setIsolated: async () => {},
  setLeverage: async () => {},
} as unknown as BinanceFuturesClient;

// The open user_trades row loadOpenUserTrade() reads back.
const openRow = {
  id: 99,
  direction: "LONG",
  entry_price: 100,
  entry_qty: 10,
  remaining_qty: 10,
  tp_stage: 0,
  engine_trade_id: 7,
  notional: 1000,
  pnl: 0,
};

/** Mock user_trades table: a read terminating in `.limit()` returns the open row;
 *  an `.update(...).select()` resolves to `updateRows` (set to [] to simulate a
 *  lost CAS race). */
function makeTradeDb(updateRows: { id: number }[]) {
  return {
    from() {
      let didUpdate = false;
      const b: Record<string, unknown> = {};
      Object.assign(b, {
        select: () => b,
        update: () => {
          didUpdate = true;
          return b;
        },
        eq: () => b,
        gte: () => b,
        lte: () => b,
        order: () => b,
        limit: () => Promise.resolve({ data: [openRow], error: null }),
        then: (resolve: (r: unknown) => void) =>
          resolve(didUpdate ? { data: updateRows, error: null } : { data: [], error: null }),
      });
      return b;
    },
  } as unknown as SupabaseClient;
}

const tp1Target: EngineTarget = {
  id: 7,
  direction: "LONG",
  entryPrice: 100,
  stopLoss: 90,
  size: 3,
  remainingSize: 2.85, // 0.95 → TP1 partial
  tp1Hit: true,
  tp2Hit: false,
};

const baseCtx = {
  client,
  userId: "u1",
  symbol: "BTCUSDT",
  riskPct: 0.01,
  env: "testnet" as const,
  filters,
};

describe("runReconcileCycle — reduce CAS", () => {
  it("reports a reduce when the CAS write lands", async () => {
    const rec = await runReconcileCycle({ ...baseCtx, db: makeTradeDb([{ id: 99 }]), target: tp1Target });
    expect(rec.action).toBe("reduce");
    expect(rec.error).toBeUndefined();
  });

  it("surfaces a CONFLICT (not a double-count) when the CAS write loses the race", async () => {
    const rec = await runReconcileCycle({ ...baseCtx, db: makeTradeDb([]), target: tp1Target });
    expect(rec.action).toBe("conflict");
    expect(rec.error).toMatch(/concurrent-write: reduce/);
  });
});

describe("runReconcileCycle — close CAS", () => {
  it("reports a close when the CAS write lands (engine went flat)", async () => {
    const rec = await runReconcileCycle({ ...baseCtx, db: makeTradeDb([{ id: 99 }]), target: null });
    expect(rec.action).toBe("close");
    expect(rec.error).toBeUndefined();
  });

  it("surfaces a CONFLICT when a racing duplicate already closed the row", async () => {
    const rec = await runReconcileCycle({ ...baseCtx, db: makeTradeDb([]), target: null });
    expect(rec.action).toBe("conflict");
    expect(rec.error).toMatch(/concurrent-write: close/);
  });
});
