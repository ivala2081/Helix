import { describe, it, expect } from "vitest";
import { selectLiveKpis, type LiveAggregate } from "../live-kpis";

const base: LiveAggregate = {
  totalReturnPct: 12.34,
  portfolioMaxDrawdownPct: 8.5,
  portfolioCurrentDrawdownPct: -2.1,
  overallWinRate: 0.646,
  overallProfitFactor: 1.71,
  totalTrades: 40,
};

describe("selectLiveKpis — honest live KPI strip", () => {
  it("returns return/maxDD/winRate/PF (the full honest picture, no cherry-pick)", () => {
    const k = selectLiveKpis(base).map((x) => x.label);
    expect(k).toEqual(["Total return", "Max drawdown", "Win rate", "Profit factor"]);
  });

  it("positive return is emerald with a + sign", () => {
    const ret = selectLiveKpis(base)[0];
    expect(ret).toMatchObject({ value: "+12.34%", tone: "emerald" });
  });

  it("negative return is red", () => {
    const ret = selectLiveKpis({ ...base, totalReturnPct: -5 })[0];
    expect(ret).toMatchObject({ value: "-5.00%", tone: "red" });
  });

  it("max drawdown is ALWAYS shown as a negative magnitude and red — never green", () => {
    const dd = selectLiveKpis(base)[1];
    expect(dd.value).toBe("-8.5%");
    expect(dd.tone).toBe("red");
    // even if the stored value were negative, it renders as a negative magnitude
    const dd2 = selectLiveKpis({ ...base, portfolioMaxDrawdownPct: -8.5 })[1];
    expect(dd2.value).toBe("-8.5%");
    expect(dd2.tone).toBe("red");
  });

  it("profit factor < 1 (currently losing) is shown RED, >= 1 emerald", () => {
    expect(selectLiveKpis({ ...base, overallProfitFactor: 0.77 })[3]).toMatchObject({ value: "0.77", tone: "red" });
    expect(selectLiveKpis({ ...base, overallProfitFactor: 1.71 })[3]).toMatchObject({ value: "1.71", tone: "emerald" });
  });

  it("null win rate / profit factor render as neutral '—'", () => {
    const k = selectLiveKpis({ ...base, overallWinRate: null, overallProfitFactor: null });
    expect(k[2]).toMatchObject({ value: "—", tone: "neutral" });
    expect(k[3]).toMatchObject({ value: "—", tone: "neutral" });
  });

  it("null aggregate (still loading) yields four neutral placeholders", () => {
    const k = selectLiveKpis(null);
    expect(k).toHaveLength(4);
    expect(k.every((x) => x.value === "—" && x.tone === "neutral")).toBe(true);
  });
});
