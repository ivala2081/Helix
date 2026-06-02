import { describe, it, expect } from "vitest";
import {
  reconcile,
  targetFromOpenTrade,
  type EngineTarget,
  type OpenUserTrade,
  type ReconcileInput,
} from "../executor";

const filters = { stepSize: 0.001, tickSize: 0.1, minQty: 0.001, minNotional: 5 };

// A fresh, full engine LONG on BTC: entry 100, SL 90 (risk/unit = 10).
const freshLong: EngineTarget = {
  id: 7,
  direction: "LONG",
  entryPrice: 100,
  stopLoss: 90,
  size: 3,
  remainingSize: 3,
  tp1Hit: false,
  tp2Hit: false,
};

const base: ReconcileInput = {
  target: null,
  open: null,
  actualPositionAmt: 0,
  balanceUsdt: 10_000,
  riskPct: 0.01,
  filters,
  alreadyTradedEngineId: false,
};

describe("reconcile — engine flat", () => {
  it("noop when customer is also flat", () => {
    expect(reconcile(base).kind).toBe("noop");
  });

  it("closes a residual position when engine goes flat", () => {
    const open: OpenUserTrade = {
      engineTradeId: 7, direction: "LONG", entryQty: 1, remainingQty: 1, tpStage: 0,
    };
    const a = reconcile({ ...base, target: null, open, actualPositionAmt: 1 });
    expect(a).toMatchObject({ kind: "close", side: "SELL", qty: 1 });
  });

  it("closes the bookkeeping row even if exchange is already flat (qty 0)", () => {
    const open: OpenUserTrade = {
      engineTradeId: 7, direction: "SHORT", entryQty: 1, remainingQty: 1, tpStage: 0,
    };
    const a = reconcile({ ...base, target: null, open, actualPositionAmt: 0 });
    expect(a).toMatchObject({ kind: "close", side: "BUY", qty: 0 });
  });
});

describe("reconcile — opening", () => {
  it("opens a sized LONG on a fresh engine trade", () => {
    const a = reconcile({ ...base, target: freshLong });
    // risk 1% of 10k = $100, risk/unit = 10 → 10 units. notional 1000 < 80% cap.
    expect(a).toMatchObject({ kind: "open", side: "BUY", engineTradeId: 7 });
    if (a.kind === "open") {
      expect(a.qty).toBeCloseTo(10, 3);
      expect(a.notional).toBeCloseTo(1000, 0);
    }
  });

  it("opens a SHORT when the engine is short", () => {
    const shortT = { ...freshLong, direction: "SHORT" as const, stopLoss: 110 };
    const a = reconcile({ ...base, target: shortT });
    expect(a).toMatchObject({ kind: "open", side: "SELL" });
  });

  it("caps notional at the position cap for a tiny stop distance", () => {
    // SL 99.9 → risk/unit 0.1 → unclamped size 1000 units = $100k ≫ 80% cap.
    const a = reconcile({ ...base, target: { ...freshLong, stopLoss: 99.9 } });
    if (a.kind !== "open") throw new Error("expected open");
    expect(a.notional).toBeCloseTo(10_000 * 0.8, 0); // capped at V5 maxPositionPct 0.8
  });

  it("LATE-JOIN GUARD: does not enter a trade already past TP1", () => {
    const a = reconcile({ ...base, target: { ...freshLong, remainingSize: 2.85, tp1Hit: true } });
    expect(a.kind).toBe("noop");
    if (a.kind === "noop") expect(a.reason).toMatch(/late-join/);
  });

  it("does not re-enter an engine trade already taken", () => {
    const a = reconcile({ ...base, target: freshLong, alreadyTradedEngineId: true });
    expect(a.kind).toBe("noop");
  });

  it("noop when balance too small for min notional", () => {
    const a = reconcile({ ...base, target: freshLong, balanceUsdt: 1 });
    expect(a.kind).toBe("noop");
    if (a.kind === "noop") expect(a.reason).toMatch(/min/);
  });

  it("SAFETY GATE: blocks a fresh open when allowOpen is false", () => {
    const a = reconcile({
      ...base,
      target: freshLong,
      allowOpen: false,
      openBlockReason: "stale signal",
    });
    expect(a.kind).toBe("noop");
    if (a.kind === "noop") expect(a.reason).toMatch(/open blocked: stale signal/);
  });

  it("safety gate does NOT block closing an existing position", () => {
    const open: OpenUserTrade = {
      engineTradeId: 7, direction: "LONG", entryQty: 10, remainingQty: 10, tpStage: 0,
    };
    const a = reconcile({
      ...base, target: null, open, actualPositionAmt: 10, allowOpen: false,
    });
    expect(a).toMatchObject({ kind: "close", side: "SELL", qty: 10 });
  });
});

describe("reconcile — managing an open trade", () => {
  const open: OpenUserTrade = {
    engineTradeId: 7, direction: "LONG", entryQty: 10, remainingQty: 10, tpStage: 0,
  };

  it("noop when in sync with a full position", () => {
    const a = reconcile({ ...base, target: freshLong, open, actualPositionAmt: 10 });
    expect(a.kind).toBe("noop");
  });

  it("reduces to the target fraction when TP1 fills (95% remains)", () => {
    // engine remaining 2.85/3 = 0.95 → target qty 9.5, actual 10 → reduce 0.5
    const tgt = { ...freshLong, remainingSize: 2.85, tp1Hit: true };
    const a = reconcile({ ...base, target: tgt, open, actualPositionAmt: 10 });
    expect(a).toMatchObject({ kind: "reduce", side: "SELL", tpStage: 1 });
    if (a.kind === "reduce") expect(a.qty).toBeCloseTo(0.5, 3);
  });

  it("reports tpStage 2 once TP2 has hit", () => {
    const tgt = { ...freshLong, remainingSize: 1.95, tp1Hit: true, tp2Hit: true };
    const a = reconcile({ ...base, target: tgt, open, actualPositionAmt: 9.5 });
    expect(a).toMatchObject({ kind: "reduce", tpStage: 2 });
  });

  it("closes the old position when the engine trade id changes", () => {
    const a = reconcile({
      ...base,
      target: { ...freshLong, id: 8 },
      open,
      actualPositionAmt: 10,
    });
    expect(a).toMatchObject({ kind: "close", side: "SELL", qty: 10 });
  });

  it("tolerates sub-step drift (no churn)", () => {
    // target 9.5, actual 9.5004 → diff < stepSize → noop
    const tgt = { ...freshLong, remainingSize: 2.85, tp1Hit: true };
    const a = reconcile({ ...base, target: tgt, open, actualPositionAmt: 9.5004 });
    expect(a.kind).toBe("noop");
  });
});

describe("targetFromOpenTrade", () => {
  it("returns null for null / malformed", () => {
    expect(targetFromOpenTrade(null)).toBeNull();
    expect(targetFromOpenTrade({})).toBeNull();
    expect(targetFromOpenTrade({ direction: "LONG" })).toBeNull();
  });

  it("maps a Trade JSONB into an EngineTarget", () => {
    const t = targetFromOpenTrade({
      id: 3, direction: "SHORT", entryPrice: 50, stopLoss: 55,
      size: 2, remainingSize: 1.3, tp1Hit: true, tp2Hit: false,
    });
    expect(t).toMatchObject({ id: 3, direction: "SHORT", remainingSize: 1.3, tp1Hit: true });
  });
});
