// Binance USDT-M Futures client — SERVER ONLY. The execution venue for V5
// (long + short) at 1x leverage: same risk profile as spot but can short, so
// the strategy runs as designed. Configurable testnet vs live.
//
// Testnet: https://testnet.binancefuture.com (SEPARATE from spot testnet — needs
// its own key). Virtual funds. Endpoints are /fapi/v1 and /fapi/v2.

import { createHmac } from "node:crypto";
import { roundStep } from "./binance-client";

export type FuturesEnv = "testnet" | "live";

const FBASE: Record<FuturesEnv, string> = {
  testnet: "https://testnet.binancefuture.com",
  live: "https://fapi.binance.com",
};

export type FuturesFilters = {
  stepSize: number;
  tickSize: number;
  minQty: number;
  minNotional: number;
};

export type Side = "BUY" | "SELL";

export class BinanceFuturesClient {
  constructor(
    private readonly apiKey: string,
    private readonly secret: string,
    private readonly env: FuturesEnv = "testnet",
  ) {}

  private base() {
    return FBASE[this.env];
  }

  private async signed(
    method: "GET" | "POST" | "DELETE",
    path: string,
    params: Record<string, string | number | boolean> = {},
  ): Promise<any> {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) merged[k] = String(v);
    merged.recvWindow = "10000";
    merged.timestamp = String(Date.now());
    const query = new URLSearchParams(merged).toString();
    const signature = createHmac("sha256", this.secret).update(query).digest("hex");
    const url = `${this.base()}${path}?${query}&signature=${signature}`;
    const res = await fetch(url, { method, headers: { "X-MBX-APIKEY": this.apiKey } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `Futures ${res.status} (${path}): ${body?.msg ?? JSON.stringify(body)} [code ${body?.code}]`,
      );
    }
    return body;
  }

  private async publicGet(path: string, params: Record<string, string> = {}): Promise<any> {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${this.base()}${path}${q ? `?${q}` : ""}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Futures ${res.status} (${path}): ${body?.msg ?? ""}`);
    return body;
  }

  // ── Account ──
  async availableUsdt(): Promise<number> {
    const balances = await this.signed("GET", "/fapi/v2/balance");
    const u = (balances ?? []).find((b: any) => b.asset === "USDT");
    return u ? parseFloat(u.availableBalance) : 0;
  }

  /** Current position size (signed: + long, − short, 0 flat) for a symbol. */
  async positionAmt(symbol: string): Promise<number> {
    const pos = await this.signed("GET", "/fapi/v2/positionRisk", { symbol });
    const p = Array.isArray(pos) ? pos[0] : pos;
    return p ? parseFloat(p.positionAmt) : 0;
  }

  // ── Setup (idempotent) ──
  async setLeverage(symbol: string, leverage: number) {
    return this.signed("POST", "/fapi/v1/leverage", { symbol, leverage });
  }

  /** ISOLATED margin per symbol. Binance returns -4046 if already set — ignore. */
  async setIsolated(symbol: string) {
    try {
      await this.signed("POST", "/fapi/v1/marginType", { symbol, marginType: "ISOLATED" });
    } catch (e) {
      if (!String((e as Error).message).includes("4046")) throw e;
    }
  }

  // ── Market data ──
  async price(symbol: string): Promise<number> {
    const t = await this.publicGet("/fapi/v1/ticker/price", { symbol });
    return parseFloat(t.price);
  }

  async symbolFilters(symbol: string): Promise<FuturesFilters> {
    const info = await this.publicGet("/fapi/v1/exchangeInfo");
    const s = info.symbols?.find((x: any) => x.symbol === symbol);
    if (!s) throw new Error(`Symbol not found: ${symbol}`);
    const f = (type: string) => s.filters.find((x: any) => x.filterType === type);
    const lot = f("LOT_SIZE");
    const price = f("PRICE_FILTER");
    const notional = f("MIN_NOTIONAL");
    return {
      stepSize: parseFloat(lot?.stepSize ?? "0.001"),
      tickSize: parseFloat(price?.tickSize ?? "0.1"),
      minQty: parseFloat(lot?.minQty ?? "0"),
      minNotional: parseFloat(notional?.notional ?? notional?.minNotional ?? "5"),
    };
  }

  // ── Orders ──
  /** Open/increase a position with a MARKET order. side BUY=long, SELL=short. */
  marketOrder(symbol: string, side: Side, quantity: number) {
    return this.signed("POST", "/fapi/v1/order", {
      symbol,
      side,
      type: "MARKET",
      quantity,
    });
  }

  /** Reduce/close a position at market (reduce-only, won't flip to opposite). */
  reduceMarket(symbol: string, side: Side, quantity: number) {
    return this.signed("POST", "/fapi/v1/order", {
      symbol,
      side,
      type: "MARKET",
      quantity,
      reduceOnly: "true",
    });
  }

  /** Exchange-native stop-loss: STOP_MARKET reduce-only on the given quantity. */
  stopLoss(symbol: string, side: Side, stopPrice: number, quantity: number) {
    return this.signed("POST", "/fapi/v1/order", {
      symbol,
      side,
      type: "STOP_MARKET",
      stopPrice,
      quantity,
      reduceOnly: "true",
      workingType: "MARK_PRICE",
    });
  }

  /** Exchange-native take-profit: TAKE_PROFIT_MARKET reduce-only on the quantity. */
  takeProfit(symbol: string, side: Side, stopPrice: number, quantity: number) {
    return this.signed("POST", "/fapi/v1/order", {
      symbol,
      side,
      type: "TAKE_PROFIT_MARKET",
      stopPrice,
      quantity,
      reduceOnly: "true",
      workingType: "MARK_PRICE",
    });
  }

  openOrders(symbol: string) {
    return this.signed("GET", "/fapi/v1/openOrders", { symbol });
  }

  cancelAll(symbol: string) {
    return this.signed("DELETE", "/fapi/v1/allOpenOrders", { symbol });
  }
}

export { roundStep };
