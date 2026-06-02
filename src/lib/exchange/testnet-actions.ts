"use server";

import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { BinanceFuturesClient, roundStep } from "@/lib/exchange/binance-futures";

export type TestResult = { log?: string[]; error?: string };

async function isAdmin(): Promise<boolean> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}

/** Runs a full execution cycle on the FUTURES TESTNET (1x long → native SL/TP →
 *  cleanup) and returns a step log. Admin-only, hard-wired to testnet. */
export async function runFuturesTestTrade(
  _prev: TestResult,
  _formData: FormData,
): Promise<TestResult> {
  if (!(await isAdmin())) return { error: "Yetkisiz." };

  const key = process.env.BINANCE_FUTURES_TESTNET_KEY ?? "";
  const secret = process.env.BINANCE_FUTURES_TESTNET_SECRET ?? "";
  if (!key || !secret) {
    return { error: "BINANCE_FUTURES_TESTNET_KEY/_SECRET .env.local'da tanımlı değil." };
  }

  const log: string[] = [];
  const symbol = "BTCUSDT";
  try {
    const c = new BinanceFuturesClient(key, secret, "testnet");

    const usdt = await c.availableUsdt();
    log.push(`Bakiye: ${usdt} USDT`);

    await c.setIsolated(symbol);
    await c.setLeverage(symbol, 1);
    log.push("Kaldıraç 1x · isolated ayarlandı");

    const f = await c.symbolFilters(symbol);
    const price = await c.price(symbol);
    const notional = Math.max(200, f.minNotional * 1.5);
    const qty = roundStep(notional / price, f.stepSize);
    if (qty <= 0) return { log, error: "Hesaplanan miktar 0." };
    log.push(`${symbol} fiyat ${price} · miktar ${qty} (~$${(qty * price).toFixed(0)})`);

    const buy = await c.marketOrder(symbol, "BUY", qty);
    log.push(`LONG açıldı — order ${buy.orderId} (${buy.status})`);

    const pos = await c.positionAmt(symbol);
    log.push(`Pozisyon: ${pos} ${symbol.replace("USDT", "")}`);

    const sl = roundStep(price * 0.97, f.tickSize);
    const tp = roundStep(price * 1.03, f.tickSize);
    await c.stopLoss(symbol, "SELL", sl);
    await c.takeProfit(symbol, "SELL", tp);
    const oo = await c.openOrders(symbol);
    log.push(`Native SL @ ${sl} + TP @ ${tp} kondu (açık koruma emri: ${oo.length})`);

    await c.cancelAll(symbol);
    if (Math.abs(pos) > 0) await c.marketClose(symbol, pos > 0 ? "SELL" : "BUY");
    log.push("Temizlendi (pozisyon kapatıldı + emirler iptal) ✓");

    return { log };
  } catch (e) {
    return { log, error: (e as Error).message };
  }
}
