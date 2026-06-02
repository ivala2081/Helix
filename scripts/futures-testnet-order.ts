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

  // Exchange-native SL (-3%) and TP (+3%) — close-position reduce orders.
  const tick = filters.tickSize;
  const slPrice = roundStep(price * 0.97, tick);
  const tpPrice = roundStep(price * 1.03, tick);
  console.log(`→ Native SL @ ${slPrice} + TP @ ${tpPrice}…`);
  await c.stopLoss(SYMBOL, "SELL", slPrice);
  await c.takeProfit(SYMBOL, "SELL", tpPrice);
  const oo = await c.openOrders(SYMBOL);
  console.log(`   Open protective orders: ${oo.length}`);

  // Cleanup
  console.log("→ Cleanup: cancel orders + close position…");
  await c.cancelAll(SYMBOL);
  if (Math.abs(pos) > 0) await c.marketClose(SYMBOL, pos > 0 ? "SELL" : "BUY");

  console.log("✓ Futures testnet execution OK — long opened, SL/TP attached, closed.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
