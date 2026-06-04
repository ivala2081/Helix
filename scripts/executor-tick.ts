// Live executor worker — mirrors the shared V5 signal (live_portfolios.open_trade)
// onto each eligible customer's Binance USDT-M futures account via target-state
// reconciliation. Phase B: testnet only.
//
// Separate from cron-tick.ts on purpose: the forward-test (paper) engine stays
// pure, and real-money execution will run on its own fixed-IP VPS (Phase C —
// Binance blocks GitHub/cloud IPs, and customers IP-whitelist the bot).
//
// Usage (local testnet, Node 20+ loads the env file natively):
//   npx tsx --env-file=.env.local scripts/executor-tick.ts
//
// Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   APP_ENCRYPTION_KEY. Optional: EXECUTOR_ENV (testnet|live, default testnet),
//   EXECUTOR_LIVE (must be "1" to permit env=live — defense in depth).

import { createClient } from "@supabase/supabase-js";
import type { FuturesEnv, FuturesFilters } from "../src/lib/exchange/binance-futures";
import {
  loadEligibleCustomers,
  loadStrategyContexts,
  runCustomerCycle,
} from "../src/lib/exchange/customers";
import { fetchEgressIp } from "../src/lib/exchange/egress-ip";
import { acquireTickLock, DEFAULT_LOCK_TTL_MS } from "../src/lib/exchange/tick-lock";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const env: FuturesEnv = process.env.EXECUTOR_ENV === "live" ? "live" : "testnet";
  // Hard gate: refuse to touch real accounts unless explicitly armed. Phase B is
  // testnet-only; this guard means a stray EXECUTOR_ENV=live can't trade money.
  if (env === "live" && process.env.EXECUTOR_LIVE !== "1") {
    console.error("EXECUTOR_ENV=live requires EXECUTOR_LIVE=1 — aborting (safety gate).");
    process.exit(1);
  }

  const dryRun = process.env.EXECUTOR_DRYRUN === "1";
  const maxAgeMin = Number(process.env.EXECUTOR_MAX_SIGNAL_AGE_MIN);
  const maxAgeMs = Number.isFinite(maxAgeMin) && maxAgeMin > 0 ? maxAgeMin * 60_000 : undefined;

  // Report the egress IP — on a fixed-IP VPS this is what customers whitelist.
  const ip = await fetchEgressIp();
  console.log(`Executor [${env}]${dryRun ? " DRY-RUN" : ""} — egress IP: ${ip ?? "unknown"}`);

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Single-flight: real ticks must NOT overlap — two concurrent ticks would each
  // read "no open position" and both fire a market OPEN, double-filling the
  // customer (the unique index rejects the 2nd INSERT only AFTER the order is
  // placed). A lease lock serializes ticks regardless of how they're triggered
  // (cron / systemd / admin button / manual run). Dry-run places no orders and
  // writes no rows, so it skips the lock — diagnostics never block or get blocked
  // by a real tick.
  const ttlMin = Number(process.env.EXECUTOR_LOCK_TTL_MIN);
  const ttlMs = Number.isFinite(ttlMin) && ttlMin > 0 ? ttlMin * 60_000 : DEFAULT_LOCK_TTL_MS;
  const lock = dryRun
    ? { acquired: true, release: async () => {} }
    : await acquireTickLock(db, { ttlMs });
  if (!lock.acquired) {
    console.log("Another executor tick is already running — skipping this run.");
    return;
  }

  try {
    const now = Date.now();
    const customers = await loadEligibleCustomers(db);
    if (customers.length === 0) {
      console.log("No eligible customers — nothing to do.");
      return;
    }

    // Load each used strategy's signals + open-gates once.
    const contexts = await loadStrategyContexts(
      db,
      customers.map((c) => c.strategy),
      now,
      maxAgeMs,
    );
    const stratSummary = [...contexts.values()]
      .map((ctx) => {
        const blocked = [...ctx.gates.entries()].filter(([, g]) => !g.allowOpen);
        return `${ctx.def.label}: ${ctx.signals.size} sym, blocked ${blocked.length ? blocked.map(([s, g]) => `${s}(${g.reason})`).join("/") : "none"}`;
      })
      .join(" | ");
    console.log(`${customers.length} eligible customer(s) — ${stratSummary}`);

    const filtersCache = new Map<string, FuturesFilters>();
    let actions = 0;
    let errors = 0;

    for (const customer of customers) {
      const ctx = contexts.get(customer.strategy);
      if (!ctx) continue;
      const records = await runCustomerCycle(db, customer, ctx, env, filtersCache, { dryRun });
      for (const r of records) {
        if (r.action === "noop") continue;
        const who = `${customer.userId.slice(0, 8)}[${customer.strategy}]`;
        if (r.error) {
          errors++;
          console.error(`  ✗ ${who} ${r.symbol}: ${r.error}`);
        } else {
          actions++;
          console.log(`  ✓ ${who} ${r.symbol}: ${r.action} — ${r.detail}`);
        }
      }
    }

    console.log(`Done — ${actions} action(s), ${errors} error(s).`);
    if (errors > 0) process.exitCode = 1;
  } finally {
    await lock.release();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
