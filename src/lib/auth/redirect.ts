/** Only allow a same-origin relative path as a post-auth redirect target.
 *  Blocks `//evil.com`, `https://evil.com`, `javascript:` etc. (open-redirect).
 *  Falls back to /app for anything that isn't a clean absolute path. */
export function sanitizeNext(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  return "/app";
}
