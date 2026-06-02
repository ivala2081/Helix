// Phase A smoke test — places a REAL order on the Binance SPOT TESTNET (virtual
// funds, safe). Proves the execution client works end to end.
//
// Run:  $env:BINANCE_TESTNET_KEY="..."; $env:BINANCE_TESTNET_SECRET="..."; npx tsx scripts/testnet-order.ts
//
// Get a testnet key at https://testnet.binance.vision (Log In with GitHub →
// Generate HMAC_SHA256 key). Testnet auto-credits virtual USDT/BTC.

import { BinanceClient, roundStep } from "../src/lib/exchange/binance-client";

const apiKey = process.env.BINANCE_TESTNET_KEY ?? "";
const secret = process.env.BINANCE_TESTNET_SECRET ?? "";

async function main() {
  if (!apiKey || !secret) {
    console.error(
      "Set BINANCE_TESTNET_KEY and BINANCE_TESTNET_SECRET (from testnet.binance.vision).",
    );
    process.exit(1);
  }

  const c = new BinanceClient(apiKey, secret, "testnet");

  console.log("→ Fetching account…");
  const usdt = await c.freeBalance("USDT");
  const btc = await c.freeBalance("BTC");
  console.log(`   USDT: ${usdt}   BTC: ${btc}`);

  const symbol = "BTCUSDT";
  const filters = await c.symbolFilters(symbol);
  console.log(`   ${symbol} filters:`, filters);

  const spend = 15; // USDT — tiny test buy
  if (usdt < spend) {
    console.error(`Not enough testnet USDT (have ${usdt}, need ${spend}).`);
    process.exit(1);
  }

  console.log(`→ Market BUY ${symbol} for ${spend} USDT…`);
  const buy = await c.marketBuyQuote(symbol, spend);
  console.log("   FILLED:", {
    orderId: buy.orderId,
    status: buy.status,
    executedQty: buy.executedQty,
    cummulativeQuoteQty: buy.cummulativeQuoteQty,
  });

  // Sell it back so the test is self-cleaning.
  const qty = roundStep(parseFloat(buy.executedQty), filters.stepSize);
  if (qty > 0) {
    console.log(`→ Market SELL ${qty} ${symbol} (cleanup)…`);
    const sell = await c.marketSell(symbol, qty);
    console.log("   FILLED:", { orderId: sell.orderId, status: sell.status });
  }

  console.log("✓ Testnet execution OK — orders place & fill.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
