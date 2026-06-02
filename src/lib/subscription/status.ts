// Single source of truth for "is this customer a paying member right now?".
// Every gate (dashboard, package page, exchange connect, bot enable) must use
// THIS — previously they disagreed (some used "any active row ever", some the
// newest row, and nobody checked expires_at).

export type SubscriptionRow = {
  status: string;
  expires_at?: string | null;
};

/**
 * A subscription grants access only if its NEWEST row is `active` AND not past
 * its expiry. `expires_at = null` means lifetime/one-time. Pass the single most
 * recent subscription row for the user (ordered created_at desc, limit 1).
 */
export function isSubscriptionActive(
  sub: SubscriptionRow | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!sub || sub.status !== "active") return false;
  if (sub.expires_at && new Date(sub.expires_at).getTime() <= now.getTime()) {
    return false;
  }
  return true;
}
