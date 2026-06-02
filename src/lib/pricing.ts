// Central pricing config — monthly subscription + profit-share (high-water mark).
//
// MODEL: $99/month base (covers infra, enforceable via bot-shutoff on non-pay)
// + 15% of net new profit. The profit-share is NON-CUSTODIAL: billed by invoice
// against measured P&L once the execution engine runs — NEVER via withdrawal
// keys (API keys stay trade-only). The 15% collection is built after execution.

export const MONTHLY_PRICE_USD = 99;
export const PROFIT_SHARE_PCT = 15;
export const SUBSCRIPTION_DAYS = 30;
