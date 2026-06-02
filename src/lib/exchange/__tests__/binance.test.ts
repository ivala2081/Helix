import { describe, it, expect } from "vitest";
import { evaluateBinancePermissions } from "../binance";

describe("evaluateBinancePermissions — fail-closed, spot-only", () => {
  const safeKey = {
    enableWithdrawals: false,
    enableSpotAndMarginTrading: true,
    ipRestrict: true,
  };

  it("accepts a spot-trading, withdrawal-disabled key", () => {
    const v = evaluateBinancePermissions(safeKey);
    expect(v.ok).toBe(true);
    expect(v.enableWithdrawals).toBe(false);
    expect(v.canTrade).toBe(true);
    expect(v.ipRestricted).toBe(true);
  });

  it("REJECTS a key with withdrawals enabled", () => {
    const v = evaluateBinancePermissions({ ...safeKey, enableWithdrawals: true });
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/ÇEKİM/);
  });

  // The single most security-critical case: a malformed/proxied 200 body must
  // NOT be read as "withdrawals off".
  it("FAILS CLOSED when enableWithdrawals is missing", () => {
    const v = evaluateBinancePermissions({ enableSpotAndMarginTrading: true });
    expect(v.ok).toBe(false);
  });

  it("FAILS CLOSED when enableWithdrawals is a non-boolean (string)", () => {
    const v = evaluateBinancePermissions({
      enableWithdrawals: "false",
      enableSpotAndMarginTrading: true,
    });
    expect(v.ok).toBe(false);
  });

  it("FAILS CLOSED on an empty / non-object body", () => {
    expect(evaluateBinancePermissions({}).ok).toBe(false);
    expect(evaluateBinancePermissions(null).ok).toBe(false);
    expect(evaluateBinancePermissions(undefined).ok).toBe(false);
  });

  it("REJECTS a futures-only key (bot trades spot)", () => {
    const v = evaluateBinancePermissions({
      enableWithdrawals: false,
      enableSpotAndMarginTrading: false,
      enableFutures: true,
    });
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/Spot/);
  });

  it("does not require ipRestrict (optional, defaults false)", () => {
    const v = evaluateBinancePermissions({
      enableWithdrawals: false,
      enableSpotAndMarginTrading: true,
    });
    expect(v.ok).toBe(true);
    expect(v.ipRestricted).toBe(false);
  });
});
