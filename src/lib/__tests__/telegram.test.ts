import { describe, it, expect } from "vitest";
import { formatPublicTpHit, formatPublicClose } from "../telegram";
import type { Trade } from "../engine/types";

function mkTrade(over: Partial<Trade>): Trade {
  return {
    id: 1,
    direction: "LONG",
    entryBar: 0,
    entryDate: "",
    entryPrice: 100,
    initialStopLoss: 95,
    stopLoss: 95,
    hardStop: null,
    takeProfit1: 102,
    takeProfit2: 104,
    takeProfit3: 108,
    size: 1,
    remainingSize: 1,
    riskAmount: 5,
    signalScore: 0.8,
    signalReasons: [],
    tp1Hit: false,
    tp2Hit: false,
    partialPnl: 0,
    entryCommission: 0,
    exitCommission: 0,
    totalCommission: 0,
    maxFavorable: 0,
    maxAdverse: 0,
    ...over,
  } as Trade;
}

describe("telegram public formatters", () => {
  it("TP1 message does NOT promise a risk-free trade (finding 9)", () => {
    const msg = formatPublicTpHit("BTCUSDT", mkTrade({}), 1);
    expect(msg).not.toContain("risksiz işlem");
    expect(msg).toContain("TP1 geldi");
  });

  it("close: TP3 → celebration", () => {
    const msg = formatPublicClose(
      "BTCUSDT",
      mkTrade({ exitReason: "TP3", pnl: 100, pnlPct: 4, exitPrice: 108 }),
    );
    expect(msg).toContain("TAM İSABET");
  });

  it("close: profitable → Kârla kapandı", () => {
    const msg = formatPublicClose(
      "BTCUSDT",
      mkTrade({ exitReason: "Stop Loss", pnl: 30, pnlPct: 1.2, exitPrice: 101 }),
    );
    expect(msg).toContain("Kârla kapandı");
  });

  it("close: breakeven (pnl=0) → neutral, NOT a loss (finding 21)", () => {
    const msg = formatPublicClose(
      "BTCUSDT",
      mkTrade({ exitReason: "Stop Loss", pnl: 0, pnlPct: 0, exitPrice: 100 }),
    );
    expect(msg).toContain("Başabaş");
    expect(msg).not.toContain("SL oldu");
  });

  it("close: real loss → SL oldu", () => {
    const msg = formatPublicClose(
      "BTCUSDT",
      mkTrade({ exitReason: "Stop Loss", pnl: -50, pnlPct: -2, exitPrice: 95 }),
    );
    expect(msg).toContain("SL oldu");
  });
});
