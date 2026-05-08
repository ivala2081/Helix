// Manual resume for a kill-switch-paused portfolio.
//
// Usage: npx tsx scripts/resume-portfolio.ts <SYMBOL>
//
// Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Flips status from 'paused_kill_switch' back to 'active' and clears
// kill_switch_state. The next cron-tick will re-evaluate; if the
// triggering condition still holds the portfolio will be paused again.

import { createClient } from "@supabase/supabase-js";

async function main() {
  const symbol = process.argv[2];
  if (!symbol) {
    console.error("Usage: npx tsx scripts/resume-portfolio.ts <SYMBOL>");
    process.exit(2);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: readErr } = await db
    .from("live_portfolios")
    .select("symbol,status,kill_switch_state")
    .eq("symbol", symbol)
    .maybeSingle();

  if (readErr || !existing) {
    console.error(`Portfolio ${symbol} not found:`, readErr?.message);
    process.exit(1);
  }
  if (existing.status !== "paused_kill_switch") {
    console.log(`${symbol} is not paused (status=${existing.status}). Nothing to do.`);
    return;
  }

  const { error: updErr } = await db
    .from("live_portfolios")
    .update({
      status: "active",
      kill_switch_state: null,
      updated_at: new Date().toISOString(),
    })
    .eq("symbol", symbol);

  if (updErr) {
    console.error(`Failed to resume ${symbol}:`, updErr.message);
    process.exit(1);
  }

  console.log(`Resumed ${symbol}. Previous kill_switch_state:`, existing.kill_switch_state);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
