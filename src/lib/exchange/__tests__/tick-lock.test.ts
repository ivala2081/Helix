import { describe, it, expect } from "vitest";
import { acquireTickLock } from "../tick-lock";
import type { SupabaseClient } from "@supabase/supabase-js";

// Minimal in-memory stand-in for the single `executor_locks` row + the conditional
// UPDATE the lock relies on. ISO-8601 UTC ("…Z") strings compare lexicographically
// in the same order as the timestamps, so `<=` on the string models `locked_until
// <= now()` faithfully.
type Row = { name: string; holder: string | null; locked_until: string };

function makeLockDb(initial?: Partial<Row>) {
  const row: Row = {
    name: "executor-tick",
    holder: null,
    locked_until: new Date(0).toISOString(),
    ...initial,
  };
  const db = {
    from(table: string) {
      if (table !== "executor_locks") throw new Error("unexpected table " + table);
      let patch: Partial<Row> = {};
      const filters: Array<["eq" | "lte", keyof Row, string]> = [];
      const builder = {
        update(p: Partial<Row>) {
          patch = p;
          return builder;
        },
        eq(col: keyof Row, val: string) {
          filters.push(["eq", col, val]);
          return builder;
        },
        lte(col: keyof Row, val: string) {
          filters.push(["lte", col, val]);
          return builder;
        },
        select() {
          return builder;
        },
        // Both `.select()`-terminated (acquire) and bare-await (release) resolve here.
        then(resolve: (r: { data: { name: string }[]; error: null }) => void) {
          const match = filters.every(([op, col, val]) => {
            const cur = row[col];
            if (op === "eq") return cur === val;
            return cur != null && cur <= val; // lte
          });
          if (!match) return resolve({ data: [], error: null });
          Object.assign(row, patch);
          resolve({ data: [{ name: row.name }], error: null });
        },
      };
      return builder;
    },
  };
  return { db: db as unknown as SupabaseClient, row };
}

const T0 = 1_900_000_000_000;

describe("acquireTickLock — single-flight", () => {
  it("acquires a free lock and stamps holder + future expiry", async () => {
    const { db, row } = makeLockDb();
    const lock = await acquireTickLock(db, { token: "A", now: T0, ttlMs: 60_000 });
    expect(lock.acquired).toBe(true);
    expect(row.holder).toBe("A");
    expect(new Date(row.locked_until).getTime()).toBe(T0 + 60_000);
  });

  it("a SECOND concurrent tick cannot acquire a held, unexpired lease", async () => {
    const { db } = makeLockDb();
    const a = await acquireTickLock(db, { token: "A", now: T0, ttlMs: 60_000 });
    const b = await acquireTickLock(db, { token: "B", now: T0 + 1_000, ttlMs: 60_000 });
    expect(a.acquired).toBe(true);
    expect(b.acquired).toBe(false);
  });

  it("a tick CAN acquire once the previous lease has expired (crash recovery)", async () => {
    const { db } = makeLockDb();
    await acquireTickLock(db, { token: "A", now: T0, ttlMs: 60_000 });
    // 61s later A never released (crashed) — lease expired → B takes over.
    const b = await acquireTickLock(db, { token: "B", now: T0 + 61_000, ttlMs: 60_000 });
    expect(b.acquired).toBe(true);
  });

  it("release frees the lease so the next tick can acquire", async () => {
    const { db, row } = makeLockDb();
    const a = await acquireTickLock(db, { token: "A", now: T0, ttlMs: 60_000 });
    await a.release();
    expect(row.holder).toBeNull();
    const b = await acquireTickLock(db, { token: "B", now: T0 + 1_000, ttlMs: 60_000 });
    expect(b.acquired).toBe(true);
  });

  it("release only frees OUR lease — never clobbers a successor", async () => {
    const { db, row } = makeLockDb();
    const a = await acquireTickLock(db, { token: "A", now: T0, ttlMs: 60_000 });
    // A's lease expires and B takes over.
    const b = await acquireTickLock(db, { token: "B", now: T0 + 61_000, ttlMs: 60_000 });
    expect(b.acquired).toBe(true);
    // A wakes up late and releases — must NOT free B's lease.
    await a.release();
    expect(row.holder).toBe("B");
  });

  it("fails CLOSED (not acquired) on a DB error", async () => {
    const db = {
      from: () => ({
        update: () => ({
          eq: () => ({
            lte: () => ({
              select: () => Promise.resolve({ data: null, error: { message: "boom" } }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const lock = await acquireTickLock(db, { token: "A", now: T0 });
    expect(lock.acquired).toBe(false);
  });
});
