// Telegram notification utility for forward test trade alerts.
// Fire-and-forget pattern — never throws, never blocks the caller.
// If TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID are missing, all functions are no-ops.

import type { Trade } from "./engine/types";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";

export const TELEGRAM_ENABLED = Boolean(BOT_TOKEN && CHAT_ID);

/** Send an HTML message to the configured Telegram chat. Never throws. */
export function sendTelegramMessage(text: string): void {
  if (!TELEGRAM_ENABLED) return;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    signal: controller.signal,
  })
    .catch((err) =>
      console.warn("[telegram] send failed:", (err as Error).message),
    )
    .finally(() => clearTimeout(timeout));
}

// ── Formatting helpers ───────────────────────────────────────────────

const HEADER = "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"; // ━━━
const SECTION = "\u2500\u2500\u2500"; // ───
const FOOTER = "\n<i>Helix V5 \u2022 Forward Test \u2022 1H</i>";

function fmtPrice(symbol: string, price: number): string {
  const decimals =
    symbol.startsWith("BTC") ? 2 : symbol.startsWith("XRP") ? 4 : 2;
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function pctDiff(from: number, to: number): string {
  if (from === 0) return "0.00";
  const pct = ((to - from) / from) * 100;
  return (pct >= 0 ? "+" : "") + pct.toFixed(2);
}

function base(symbol: string): string {
  return symbol.replace("USDT", "");
}

function barsToHuman(bars: number): string {
  if (bars < 24) return `~${bars}h`;
  const days = Math.floor(bars / 24);
  const hours = bars % 24;
  return hours > 0 ? `~${days}d ${hours}h` : `~${days}d`;
}

/** Format a trade-opened notification. */
export function formatTradeOpened(symbol: string, trade: Trade): string {
  const icon = trade.direction === "LONG" ? "\ud83d\udcc8" : "\ud83d\udcc9";
  const usdValue = trade.size * trade.entryPrice;

  const lines = [
    HEADER,
    `${icon}  <b>${base(symbol)} \u00b7 ${trade.direction}</b>`,
    HEADER,
    ``,
    `\ud83d\udcb0 <b>Entry</b>        <code>$${fmtPrice(symbol, trade.entryPrice)}</code>`,
    `\ud83d\udcca <b>Size</b>          <code>${trade.size.toFixed(6)} ${base(symbol)}</code> ($${fmtPrice(symbol, usdValue)})`,
    `\u26a1 <b>Signal</b>       <code>${trade.signalScore.toFixed(2)}</code> \u2022 ${trade.signalReasons.join(" + ")}`,
    ``,
    `${SECTION}  Risk Management  ${SECTION}`,
    `\ud83d\uded1 SL          <code>$${fmtPrice(symbol, trade.stopLoss)}</code>  <i>${pctDiff(trade.entryPrice, trade.stopLoss)}%</i>`,
  ];

  if (trade.hardStop) {
    lines.push(
      `\ud83d\udee1 Hard Stop  <code>$${fmtPrice(symbol, trade.hardStop)}</code>  <i>${pctDiff(trade.entryPrice, trade.hardStop)}%</i>`,
    );
  }

  lines.push(
    `\ud83d\udcb5 At Risk     <code>$${trade.riskAmount.toFixed(2)}</code>`,
    ``,
    `${SECTION}  Take Profit Targets  ${SECTION}`,
    `\ud83c\udfaf TP1  <code>$${fmtPrice(symbol, trade.takeProfit1)}</code>  ${pctDiff(trade.entryPrice, trade.takeProfit1)}%  \u2502  close 5%`,
    `\ud83c\udfaf TP2  <code>$${fmtPrice(symbol, trade.takeProfit2)}</code>  ${pctDiff(trade.entryPrice, trade.takeProfit2)}%  \u2502  close 30%`,
    `\ud83c\udfaf TP3  <code>$${fmtPrice(symbol, trade.takeProfit3)}</code>  ${pctDiff(trade.entryPrice, trade.takeProfit3)}%  \u2502  close 65%`,
    FOOTER,
  );

  return lines.join("\n");
}

/** Format a trade-closed notification. */
export function formatTradeClosed(
  symbol: string,
  trade: Trade,
  equity?: number,
  initialCapital?: number,
  winCount?: number,
  lossCount?: number,
): string {
  const pnl = trade.pnl ?? 0;
  const win = pnl > 0;
  const icon = win ? "\u2705" : "\u274c";
  const pnlSign = pnl >= 0 ? "+" : "";
  const pnlPct = trade.pnlPct ?? 0;
  const pnlPctSign = pnlPct >= 0 ? "+" : "";

  const lines = [
    HEADER,
    `${icon}  <b>${base(symbol)} \u00b7 ${trade.direction} \u00b7 ${trade.exitReason}</b>`,
    HEADER,
    ``,
    `<code>$${fmtPrice(symbol, trade.entryPrice)}  \u2192  $${fmtPrice(symbol, trade.exitPrice ?? 0)}</code>`,
    ``,
    `${SECTION}  Performance  ${SECTION}`,
    `\ud83d\udcb0 P&amp;L           <code>${pnlSign}$${Math.abs(pnl).toFixed(2)}</code>  <b>${pnlPctSign}${pnlPct.toFixed(2)}%</b>`,
    `\ud83d\udccd R-Multiple   <code>${(trade.rMultiple ?? 0).toFixed(2)}R</code>`,
    `\u23f1 Duration       <code>${trade.barsHeld ?? 0} bars</code>  ${barsToHuman(trade.barsHeld ?? 0)}`,
    `\ud83d\udcb8 Commission  <code>$${(trade.totalCommission ?? 0).toFixed(2)}</code>`,
    ``,
    `${SECTION}  Exit Progress  ${SECTION}`,
    `TP1 ${trade.tp1Hit ? "\u2705" : "\u2b1c"}  \u2192  TP2 ${trade.tp2Hit ? "\u2705" : "\u2b1c"}  \u2192  TP3 ${trade.exitReason === "TP3" ? "\u2705" : "\u2b1c"}`,
    `Breakeven ${trade.tp1Hit ? "\u2705" : "\u2b1c"}`,
  ];

  // Portfolio context (if available)
  if (equity !== undefined && initialCapital !== undefined) {
    const eqReturn = ((equity - initialCapital) / initialCapital) * 100;
    const eqSign = eqReturn >= 0 ? "+" : "";
    lines.push(
      ``,
      `${SECTION}  Portfolio  ${SECTION}`,
      `Equity    <code>$${fmtPrice(symbol, equity)}</code>  (${eqSign}${eqReturn.toFixed(2)}%)`,
    );
    if (winCount !== undefined && lossCount !== undefined) {
      const total = winCount + lossCount;
      const wr = total > 0 ? ((winCount / total) * 100).toFixed(0) : "0";
      lines.push(`Record    <code>${winCount}W \u00b7 ${lossCount}L</code>  (${wr}%)`);
    }
  }

  lines.push(FOOTER);
  return lines.join("\n");
}

/** Format a cron summary. Returns null if nothing noteworthy happened. */
export function formatCronSummary(
  results: { symbol: string; processed: number; error?: string }[],
  durationMs: number,
  tradesClosed: number,
): string | null {
  const errors = results.filter((r) => r.error);
  if (tradesClosed === 0 && errors.length === 0) return null;

  const totalCandles = results.reduce((s, r) => s + r.processed, 0);
  const lines = [
    HEADER,
    `\u23f0  <b>Cron Tick Summary</b>`,
    HEADER,
    ``,
    `\u23f1 Duration       <code>${durationMs}ms</code>`,
    `\ud83d\udddc Candles        <code>${totalCandles}</code>`,
    `\ud83d\udcca Trades closed  <code>${tradesClosed}</code>`,
  ];

  if (errors.length > 0) {
    lines.push(``, `\u26a0\ufe0f <b>Errors:</b>`);
    for (const e of errors) {
      lines.push(`  \u2022 ${e.symbol}: <i>${e.error}</i>`);
    }
  }

  lines.push(FOOTER);
  return lines.join("\n");
}
