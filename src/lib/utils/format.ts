export function fmtUsd(n: number, decimals = 2): string {
  if (!isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return (
    sign +
    "$" +
    abs.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function fmtPct(n: number, decimals = 2): string {
  if (!isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + n.toFixed(decimals) + "%";
}

export function fmtNum(n: number, decimals = 2): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtCompact(n: number): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(2);
}

export function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace("T", " ");
}
