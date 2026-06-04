// Single-flight lock for the live executor tick. SERVER-ONLY.
//
// Why: two OVERLAPPING executor ticks (a slow tick still running when the next
// cron fires, the admin test button while a tick runs, a manual run alongside
// the timer) would each read "no open position" and both fire a market OPEN,
// double-filling the customer. The per-(user,symbol) unique index rejects the
// second user_trades INSERT, but only AFTER the duplicate order already executed
// on the exchange. So ticks must be mutually exclusive BEFORE any order goes out.
//
// Why a lease row, not a Postgres advisory lock: a *session* advisory lock is
// tied to one connection, and over PostgREST every REST call is a separate
// pooled connection/transaction — the lock would release between calls and can't
// span a whole multi-request tick. Instead the lock is a single row holding the
// current holder + a lease expiry.
//
// Atomicity: acquiring is ONE conditional UPDATE — `... WHERE locked_until <=
// now()`. Under READ COMMITTED, if two ticks race, one wins the row lock and
// pushes locked_until into the future; the other blocks, then re-checks the
// predicate against the just-committed row, finds it no longer free, and updates
// 0 rows. The lease TTL means a crashed holder auto-frees and the next scheduled
// tick recovers on its own (no manual unlock). See migration
// 20260604000000_executor_tick_lock.sql.

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_LOCK_NAME = "executor-tick";
/** Lease length. Comfortably longer than a worst-case tick (a handful of
 *  customers × a few Binance round-trips = seconds), and the upper bound on how
 *  long a crashed holder blocks the next tick. */
export const DEFAULT_LOCK_TTL_MS = 5 * 60_000;

const EPOCH_ISO = new Date(0).toISOString();

export type TickLockOptions = {
  /** Lock key (allows distinct locks later, e.g. per-customer workers). */
  name?: string;
  ttlMs?: number;
  /** Holder token — defaults to a fresh per-process UUID. Override in tests. */
  token?: string;
  /** Clock injection for tests; defaults to Date.now(). */
  now?: number;
};

export type TickLockHandle = {
  acquired: boolean;
  token: string;
  /** Release the lease (only if WE still hold it). No-op when not acquired. */
  release: () => Promise<void>;
};

/** Try to acquire the single-flight executor lock. Returns immediately:
 *  `acquired: false` means another tick holds an unexpired lease — the caller
 *  should skip this run (NOT an error). Always call `release()` in a finally. */
export async function acquireTickLock(
  db: SupabaseClient,
  opts: TickLockOptions = {},
): Promise<TickLockHandle> {
  const name = opts.name ?? DEFAULT_LOCK_NAME;
  const ttlMs = opts.ttlMs ?? DEFAULT_LOCK_TTL_MS;
  const token = opts.token ?? randomUUID();
  const now = opts.now ?? Date.now();
  const nowIso = new Date(now).toISOString();
  const expiryIso = new Date(now + ttlMs).toISOString();

  // Conditional UPDATE: claim the row only if the current lease has expired.
  // Atomic under READ COMMITTED (see file header) — at most one racing tick
  // sees a non-empty result.
  const { data, error } = await db
    .from("executor_locks")
    .update({ holder: token, locked_until: expiryIso, updated_at: nowIso })
    .eq("name", name)
    .lte("locked_until", nowIso)
    .select("name");

  // Fail CLOSED on a DB error: if we can't prove we hold the lock, don't run a
  // tick that places real orders. The next scheduled tick retries.
  const acquired = !error && (data?.length ?? 0) === 1;

  return {
    acquired,
    token,
    release: async () => {
      if (!acquired) return;
      // Free the lease, but only if it's still OURS — if our lease expired and
      // another tick took over, holder != token ⇒ 0 rows ⇒ we don't clobber it.
      await db
        .from("executor_locks")
        .update({ holder: null, locked_until: EPOCH_ISO, updated_at: new Date(Date.now()).toISOString() })
        .eq("name", name)
        .eq("holder", token);
    },
  };
}
