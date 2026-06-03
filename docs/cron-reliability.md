# Forward-test cron reliability

**Problem.** The forward-test tick (`.github/workflows/forward-test-cron.yml`) is
scheduled every 15 min, but GitHub Actions **scheduled** workflows are best-effort
and get deprioritized under load — real gaps of 1.5–23 hours have been observed
(`live_cron_runs.ran_at`). The tick self-heals data-wise (it paginates from
`last_candle_ts` and catches up missed closed candles), so **no PnL data is lost**,
but two real harms remain:

1. **Late public signals.** On catch-up, the bot would otherwise broadcast
   hours-late "signals" to the public copier channel (@ArikanTrade) — misleading.
   *Mitigated in code:* `cron-tick.ts` `MAX_PUBLIC_AGE_MS` suppresses any public
   broadcast whose candle closed > 45 min ago (DB record + private channel +
   cumulative tally still get everything).
2. **Late live execution** (when the executor runs on a VPS) — a signal mirrored
   hours late fills customers at a bad price. Solved by reliable scheduling below.

The tick also self-alerts: when it runs after a > 60 min gap it sends a private
Telegram warning so a stall is visible.

---

## Durable fix: external trigger (do this — owner action)

Drive the workflow from an **external** scheduler via the GitHub
`workflow_dispatch` API instead of relying on GitHub's own scheduler. External
HTTP cron services fire far more reliably than GH scheduled workflows.

**1. Create a fine-grained GitHub PAT** (github.com → Settings → Developer
settings → Fine-grained tokens):
- Repository access: only `ivala2081/Helix`.
- Permissions: **Actions → Read and write**.
- Copy the token.

**2. Point an external cron service at the dispatch endpoint.** Use
[cron-job.org](https://cron-job.org) (free) or EasyCron:
- **URL:** `https://api.github.com/repos/ivala2081/Helix/actions/workflows/forward-test-cron.yml/dispatches`
- **Method:** `POST`
- **Headers:**
  - `Authorization: Bearer <YOUR_PAT>`
  - `Accept: application/vnd.github+json`
  - `X-GitHub-Api-Version: 2022-11-28`
- **Body:** `{"ref":"main"}`
- **Schedule:** every 15 min.

Test it once with curl:
```bash
curl -X POST \
  -H "Authorization: Bearer <YOUR_PAT>" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/ivala2081/Helix/actions/workflows/forward-test-cron.yml/dispatches \
  -d '{"ref":"main"}'
```
A 204 response = accepted. Keep the GH `schedule:` block too — the external
trigger is redundancy, not a replacement; whichever fires first does the work
(the tick is idempotent via `last_candle_ts`).

**Manual catch-up anytime:** GitHub → Actions → "Forward Test Cron" → Run
workflow. Or locally (suppresses public broadcasts older than 45 min
automatically): `npx tsx --env-file=.env.local scripts/cron-tick.ts`.

---

## Eventual fix: move scheduling to the VPS (Phase C)

The fixed-IP VPS that will host the executor (`docs/executor-deployment.md`)
should also run the forward-test tick on a real system cron / systemd timer —
system cron does not have GitHub Actions' best-effort scheduling problem. At that
point the external trigger above can be retired. Until the VPS exists, the
external trigger is the reliable option.
