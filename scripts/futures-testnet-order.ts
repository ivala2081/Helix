// Phase A futures smoke test — opens a 1x LONG on the Binance USDT-M FUTURES
// TESTNET, attaches exchange-native SL + TP, then cleans up. Virtual funds.
//
// Run:  $env:BINANCE_FUTURES_TESTNET_KEY="..."; $env:BINANCE_FUTURES_TESTNET_SECRET="...";
//       npx tsx scripts/futures-testnet-order.ts
//
// Get a FUTURES testnet key at https://testnet.binancefuture.com (separate from
// the spot testnet). Virtual USDT is auto-credited.

import { BinanceFuturesClient, roundStep } from "../src/lib/exchange/binance-futures";

const apiKey = process.env.BINANCE_FUTURES_TESTNET_KEY ?? "";
const secret = process.env.BINANCE_FUTURES_TESTNET_SECRET ?? "";
const SYMBOL = "BTCUSDT";

async function main() {
  if (!apiKey || !secret) {
    console.error(
      "Set BINANCE_FUTURES_TESTNET_KEY / _SECRET (from testnet.binancefuture.com).",
    );
    process.exit(1);
  }

  const c = new BinanceFuturesClient(apiKey, secret, "testnet");

  console.log("→ Account…");
  const usdt = await c.availableUsdt();
  console.log(`   Available USDT: ${usdt}`);

  // Cleanup-first: clear any leftover orders/position from a prior failed run.
  await c.cancelAll(SYMBOL).catch(() => {});
  const leftover = await c.positionAmt(SYMBOL);
  if (Math.abs(leftover) > 0) {
    console.log(`→ Closing leftover position ${leftover}…`);
    await c.reduceMarket(SYMBOL, leftover > 0 ? "SELL" : "BUY", Math.abs(leftover));
  }

  console.log("→ Setup: leverage 1x, isolated…");
  await c.setIsolated(SYMBOL);
  await c.setLeverage(SYMBOL, 1);

  const filters = await c.symbolFilters(SYMBOL);
  const price = await c.price(SYMBOL);
  console.log(`   ${SYMBOL} price ${price}  filters`, filters);

  const notional = Math.max(200, filters.minNotional * 1.5);
  const qty = roundStep(notional / price, filters.stepSize);
  if (qty <= 0) throw new Error("Computed qty 0 — raise notional.");
  if (usdt < notional) throw new Error(`Not enough testnet USDT (need ~${notional}).`);

  console.log(`→ Market LONG ${qty} ${SYMBOL} (~$${(qty * price).toFixed(0)} notional, 1x)…`);
  const buy = await c.marketOrder(SYMBOL, "BUY", qty);
  console.log("   FILLED:", { orderId: buy.orderId, status: buy.status, qty: buy.origQty });

  const pos = await c.positionAmt(SYMBOL);
  console.log(`   Position amt: ${pos}`);

  // V5 needs ACTIVE exit management (partial TP1/2/3 + SL→breakeven) which a
  // single exchange conditional order can't do — and the futures testnet rejects
  // STOP_MARKET on /fapi/v1/order (-4120) anyway. So exits are bot-managed
  // (reduce-market each tick). Here we close the position to prove the cycle.
  console.log("→ Closing position (reduce-market)…");
  if (Math.abs(pos) > 0) {
    const close = await c.reduceMarket(SYMBOL, pos > 0 ? "SELL" : "BUY", Math.abs(pos));
    console.log("   CLOSED:", { orderId: close.orderId, status: close.status });
  }

  console.log("✓ Futures testnet execution OK — 1x position opened & closed.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
