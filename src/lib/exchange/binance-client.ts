// Binance Spot order client — SERVER ONLY. Used by the execution engine to place
// real orders on a customer's account. Configurable for testnet vs live.
//
// Testnet notes (testnet.binance.vision):
//   - Only /api endpoints exist (NO /sapi). Account/orders use /api/v3.
//   - Virtual balances auto-granted; state resets ~monthly.
//   - HMAC-SHA256 auth (same signing as live).
//
// SAFETY: build & verify everything on testnet before any live key touches this.

import { createHmac } from "node:crypto";

export type BinanceEnv = "testnet" | "live";

const BASE: Record<BinanceEnv, string> = {
  testnet: "https://testnet.binance.vision",
  live: "https://api.binance.com",
};

export type SymbolFilters = {
  stepSize: number; // LOT_SIZE quantity step
  tickSize: number; // PRICE_FILTER price step
  minQty: number;
  minNotional: number;
};

export class BinanceClient {
  constructor(
    private readonly apiKey: string,
    private readonly secret: string,
    private readonly env: BinanceEnv = "testnet",
  ) {}

  private base() {
    return BASE[this.env];
  }

  private async signed(
    method: "GET" | "POST" | "DELETE",
    path: string,
    params: Record<string, string | number> = {},
  ): Promise<any> {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) merged[k] = String(v);
    merged.recvWindow = "10000";
    merged.timestamp = String(Date.now());
    const query = new URLSearchParams(merged).toString();
    const signature = createHmac("sha256", this.secret).update(query).digest("hex");
    const url = `${this.base()}${path}?${query}&signature=${signature}`;

    const res = await fetch(url, {
      method,
      headers: { "X-MBX-APIKEY": this.apiKey },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `Binance ${res.status} (${path}): ${body?.msg ?? JSON.stringify(body)}`,
      );
    }
    return body;
  }

  private async publicGet(path: string, params: Record<string, string> = {}): Promise<any> {
    const q = new URLSearchParams(params).toString();
    const url = `${this.base()}${path}${q ? `?${q}` : ""}`;
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Binance ${res.status} (${path}): ${body?.msg ?? ""}`);
    return body;
  }

  // ── Account ──
  account() {
    return this.signed("GET", "/api/v3/account");
  }

  /** Free balance of an asset (e.g. "USDT", "BTC"). */
  async freeBalance(asset: string): Promise<number> {
    const a = await this.account();
    const b = (a.balances ?? []).find((x: any) => x.asset === asset);
    return b ? parseFloat(b.free) : 0;
  }

  // ── Market data / filters ──
  /** Symbol trading filters needed to size & round orders correctly. */
  async symbolFilters(symbol: string): Promise<SymbolFilters> {
    const info = await this.publicGet("/api/v3/exchangeInfo", { symbol });
    const s = info.symbols?.[0];
    if (!s) throw new Error(`Symbol not found: ${symbol}`);
    const f = (type: string) => s.filters.find((x: any) => x.filterType === type);
    const lot = f("LOT_SIZE");
    const price = f("PRICE_FILTER");
    const notional = f("NOTIONAL") ?? f("MIN_NOTIONAL");
    return {
      stepSize: parseFloat(lot?.stepSize ?? "0.00000001"),
      tickSize: parseFloat(price?.tickSize ?? "0.01"),
      minQty: parseFloat(lot?.minQty ?? "0"),
      minNotional: parseFloat(notional?.minNotional ?? "0"),
    };
  }

  // ── Orders ──
  /** Market BUY spending a fixed USDT amount (quoteOrderQty). */
  marketBuyQuote(symbol: string, quoteUsdt: number) {
    return this.signed("POST", "/api/v3/order", {
      symbol,
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: quoteUsdt,
    });
  }

  /** Market SELL a base-asset quantity. */
  marketSell(symbol: string, quantity: number) {
    return this.signed("POST", "/api/v3/order", {
      symbol,
      side: "SELL",
      type: "MARKET",
      quantity,
    });
  }

  openOrders(symbol: string) {
    return this.signed("GET", "/api/v3/openOrders", { symbol });
  }

  cancelOrder(symbol: string, orderId: number) {
    return this.signed("DELETE", "/api/v3/order", { symbol, orderId });
  }
}

/** Round a quantity DOWN to the symbol's step size (Binance rejects off-step qty). */
export function roundStep(qty: number, step: number): number {
  if (step <= 0) return qty;
  const precision = Math.max(0, Math.round(Math.log10(1 / step)));
  return Math.floor(qty / step) * step === 0
    ? 0
    : parseFloat((Math.floor(qty / step) * step).toFixed(precision));
}
