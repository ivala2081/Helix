// Central pricing config — monthly subscription + profit-share (high-water mark).
//
// MODEL: $99/month base (covers infra, enforceable via bot-shutoff on non-pay)
// + 15% of net new profit. The profit-share is NON-CUSTODIAL: billed by invoice
// against measured P&L once the execution engine runs — NEVER via withdrawal
// keys (API keys stay trade-only). The 15% collection is built after execution.

export const MONTHLY_PRICE_USD = 99;
export const PROFIT_SHARE_PCT = 15;
export const SUBSCRIPTION_DAYS = 30;

// Single launch gate for the customer funnel. While FALSE, the public surfaces
// must NOT take payment or imply the bot is live/trading — the execution engine
// is testnet-only and V5 has no live track record yet (see project_v5_live_verdict).
// Flip to true ONLY when the bot actually trades real accounts AND V5 has shown a
// real live record. One flip swaps all "early-access / canlı doğrulama" copy and
// re-enables the payment form across the funnel.
export const EXECUTION_LIVE = false;
