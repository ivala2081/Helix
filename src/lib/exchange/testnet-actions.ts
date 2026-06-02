"use server";

import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { createServiceClient } from "@/lib/supabase/server";
import { BinanceFuturesClient, roundStep } from "@/lib/exchange/binance-futures";
import type { FuturesFilters } from "@/lib/exchange/binance-futures";
import {
  loadEligibleCustomers,
  loadV5Signals,
  computeOpenGates,
  runCustomerCycle,
} from "@/lib/exchange/customers";

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

    // Cleanup-first: clear any leftover position/orders from a prior run.
    await c.cancelAll(symbol).catch(() => {});
    const leftover = await c.positionAmt(symbol);
    if (Math.abs(leftover) > 0) {
      await c.reduceMarket(symbol, leftover > 0 ? "SELL" : "BUY", Math.abs(leftover));
      log.push(`Kalan pozisyon (${leftover}) kapatıldı`);
    }

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

    // Exits are bot-managed (reduce-market each tick), not exchange conditionals
    // — V5's partial TP ladder + SL→breakeven needs active management anyway.
    if (Math.abs(pos) > 0) {
      const close = await c.reduceMarket(symbol, pos > 0 ? "SELL" : "BUY", Math.abs(pos));
      log.push(`Pozisyon kapatıldı — order ${close.orderId} (${close.status})`);
    }
    log.push("✓ Execution OK — 1x pozisyon açıldı ve kapatıldı");

    return { log };
  } catch (e) {
    return { log, error: (e as Error).message };
  }
}

/** Runs ONE full executor reconciliation tick on the FUTURES TESTNET over all
 *  eligible (subscribed + bot-enabled + connected) customers, mirroring the live
 *  V5 signal onto their testnet accounts. Admin-only, hard-wired to testnet.
 *  This is the Phase-B end-to-end proof of the customer execution path. */
export async function runExecutorTestTick(
  _prev: TestResult,
  _formData: FormData,
): Promise<TestResult> {
  if (!(await isAdmin())) return { error: "Yetkisiz." };

  const log: string[] = [];
  try {
    const db = createServiceClient();
    const now = Date.now();
    const [customers, signals] = await Promise.all([
      loadEligibleCustomers(db),
      loadV5Signals(db),
    ]);
    const gates = await computeOpenGates(db, signals, now);

    const liveSymbols = [...signals.entries()]
      .filter(([, s]) => s.target !== null)
      .map(([s]) => s);
    const blocked = [...gates.entries()].filter(([, g]) => !g.allowOpen);
    log.push(
      `Uygun müşteri: ${customers.length} · V5 açık sinyal: ${liveSymbols.length ? liveSymbols.join(", ") : "yok"}`,
    );
    log.push(
      `Open-gate bloklu: ${blocked.length ? blocked.map(([s, g]) => `${s} (${g.reason})`).join(", ") : "yok"}`,
    );
    if (customers.length === 0) {
      log.push(
        "Uygun müşteri yok. Önce `npm run seed-test-customer` ile simüle müşteriyi kur.",
      );
      return { log };
    }

    const filtersCache = new Map<string, FuturesFilters>();
    for (const customer of customers) {
      const records = await runCustomerCycle(db, customer, signals, "testnet", filtersCache, {
        gates,
      });
      const id = customer.userId.slice(0, 8);
      for (const r of records) {
        if (r.action === "noop") {
          log.push(`· ${id} ${r.symbol}: noop (${r.detail})`);
        } else if (r.error) {
          log.push(`✗ ${id} ${r.symbol}: HATA — ${r.error}`);
        } else {
          log.push(`✓ ${id} ${r.symbol}: ${r.action} — ${r.detail}`);
        }
      }
    }
    log.push("Tick tamam.");
    return { log };
  } catch (e) {
    return { log, error: (e as Error).message };
  }
}
