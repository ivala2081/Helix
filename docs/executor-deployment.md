# Executor deployment & go-live runbook

How to take the customer execution engine (`scripts/executor-tick.ts`) from
testnet to a real fixed-IP VPS, and the **arming procedure** that must be
satisfied before it ever touches real money.

> **HARD GATE.** Do not arm live (`EXECUTOR_ENV=live`) until BOTH are true:
> (a) the executor is proven on testnet, AND (b) V5 has a real live track record
> and has cleared its launch gates (see [launch-gates.md](./launch-gates.md)).
> Until then the bot runs testnet only. This is a business-survival rule, not a
> preference — charging or trading real money before the bot works is the #1 way
> to destroy trust and invite liability.

---

## 1. Why a fixed-IP VPS (not GitHub Actions / Vercel)

- Binance blocks AWS/most-cloud IPs (HTTP 451) and GitHub-hosted runners rotate
  IPs every run — fine for the *paper* forward-test (`cron-tick.ts`, read-only
  market data via `data-api.binance.vision`), **not** for signed trading calls.
- Customers IP-whitelist their Binance API key to the bot's address. That only
  works if the bot has ONE stable outbound IP.
- So live execution needs a small VPS with a static IP (e.g. Hetzner / DO /
  Vultr, 1 vCPU is plenty). The paper cron can stay on GitHub Actions.

Find the IP customers must whitelist by running ON the VPS:

```bash
npm run executor-ip      # prints the egress IP, e.g. 203.0.113.42
```

The executor also logs this IP at the start of every tick.

---

## 2. Environment

Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`APP_ENCRYPTION_KEY` (the SAME key that encrypted the stored API secrets —
without it decryption fails).

Live trading keys: the customer keys live encrypted in `exchange_connections`.
For live the executor talks to `fapi.binance.com`; for testnet,
`testnet.binancefuture.com`.

| Var | Default | Meaning |
|-----|---------|---------|
| `EXECUTOR_ENV` | `testnet` | `testnet` or `live`. |
| `EXECUTOR_LIVE` | _(unset)_ | Must equal `1` to permit `EXECUTOR_ENV=live` — a second, deliberate switch so a stray env can't trade money. |
| `EXECUTOR_DRYRUN` | _(unset)_ | `1` = decide + log actions, place NO orders, write NO rows. |
| `EXECUTOR_MAX_SIGNAL_AGE_MIN` | `30` | Older `live_portfolios.updated_at` ⇒ signal stale ⇒ no new opens. |

---

## 3. Safety gates (built in — what blocks a trade)

The executor reconciles each customer's real position toward the shared V5
target (`live_portfolios.open_trade`). **Opening** a new position is gated;
**closing/managing** an existing one is never blocked (a customer must always be
able to exit). An OPEN requires ALL of:

1. **Eligibility** — active subscription + bot enabled + connection `connected`
   (re-checked every tick; lapses stop new trades immediately).
2. **Signal freshness** — the target comes from a recent cron tick. If the
   forward-test cron stalled, signals freeze and the executor refuses to open
   (logged as `stale signal`). See [cron stall incident](./launch-gates.md).
3. **Kill-switch** — V5 must not be paused for that symbol (K1 drawdown / K2
   consecutive SL / K3 daily loss), evaluated from the live forward-test record.
4. **Late-join guard** — never enter a trade already past TP1 (no chasing a
   partial at the wrong size).
5. **Idempotency** — never re-enter an engine trade id already taken.
6. **Min notional / qty** and a **1× notional cap** (margin ≥ notional).

Per-customer error isolation: a bad key / IP / permission flags THAT connection
`error` and skips it; a transient network blip does NOT (it self-heals next
tick — reconciliation is idempotent).

---

## 4. Go-live arming procedure (do in order)

1. **Prove on testnet** — seed a sim customer (`npm run seed-test-customer`),
   confirm a full open → TP ladder → close cycle and a `user_trades` closed row.
2. **Dry-run against live data** — on the VPS:
   `EXECUTOR_ENV=live EXECUTOR_LIVE=1 EXECUTOR_DRYRUN=1 npm run executor-tick`.
   Verify the egress IP, the eligible-customer list, the open-gate decisions,
   and that the *intended* actions look correct — with zero orders placed.
3. **One real customer, small** — a single consenting account, smallest risk%,
   watch a few full trades end-to-end. Compare fills to the V5 signal.
4. **Schedule it** — run every minute (reconciliation is cheap + idempotent):
   - cron: `* * * * * cd /opt/helix && EXECUTOR_ENV=live EXECUTOR_LIVE=1 npm run executor-tick >> /var/log/helix-executor.log 2>&1`
   - or a systemd timer (below).
5. **Monitor** — watch the log for `✗` lines (flagged connections) and
   `open-gate blocked` (stale cron / kill-switch). Alert on either.

To pull the plug: unset `EXECUTOR_LIVE` (or stop the timer). Existing customer
positions are then only ever *closed* by a manual run or by re-arming — they are
not abandoned mid-trade by the kill-switch (closes are never gated).

---

## 5. systemd unit + timer (example)

`/etc/systemd/system/helix-executor.service`:

```ini
[Unit]
Description=Helix customer executor tick
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/opt/helix
EnvironmentFile=/opt/helix/.env.live
ExecStart=/usr/bin/npm run executor-tick
```

`/etc/systemd/system/helix-executor.timer`:

```ini
[Unit]
Description=Run Helix executor every minute

[Timer]
OnCalendar=*:0/1
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl enable --now helix-executor.timer
journalctl -u helix-executor.service -f
```

`.env.live` holds the env vars from §2 (incl. `EXECUTOR_ENV=live`,
`EXECUTOR_LIVE=1`). Lock it down: `chmod 600`.

---

## 6. Open items for full Phase C / D

- **Concurrency**: today customers are processed sequentially. Fine for a
  handful; parallelize with a small pool when the book grows.
- **Signal source**: still the GitHub-Actions paper cron via `live_portfolios`.
  Consider moving the engine step onto the VPS too (one box, one source of
  truth, no GH-Actions dependency) once live volume justifies it.
- **Billing (Phase D)**: 15% high-water-mark profit share, reconciled against
  Binance income history (not the executor's tick-price pnl estimate).
