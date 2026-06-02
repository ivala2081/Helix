// Report the bot's outbound (egress) public IP. On a fixed-IP VPS this is the
// address customers must add to their Binance API-key IP whitelist, and that
// Binance itself must not be blocking. Logged at executor startup; also exposed
// via `npm run executor-ip`. SERVER-ONLY.

export async function fetchEgressIp(): Promise<string | null> {
  for (const url of ["https://api.ipify.org?format=json", "https://ifconfig.co/json"]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const b = (await r.json()) as { ip?: string };
      if (b?.ip) return b.ip;
    } catch {
      // try next provider
    }
  }
  return null;
}
