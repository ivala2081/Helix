"use client";

import { useCallback, useEffect, useState } from "react";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { LiveTradeStats, type TradeStats } from "./LiveTradeStats";
import { LiveTradeTable, type TradeRow } from "./LiveTradeTable";
import { LiveExitReasons } from "./LiveExitReasons";

const PAGE_SIZE = 50;

interface ApiResponse {
  trades: TradeRow[];
  total: number;
  stats: TradeStats;
  exitReasons: Record<string, number>;
}

export function LiveTradeAnalytics() {
  const dict = useDictionary().live.tradeAnalytics;

  const [symbolFilter, setSymbolFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState("exit_ts");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      sort: sortKey,
      dir: sortDir,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (symbolFilter) params.set("symbol", symbolFilter);

    fetch(`/api/live/trades?${params}`)
      .then((r) => r.json())
      .then((json: ApiResponse) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbolFilter, sortKey, sortDir, page]);

  const handleSymbolChange = useCallback((s: string | null) => {
    setSymbolFilter(s);
    setPage(0);
  }, []);

  const handleSortChange = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
      setPage(0);
    },
    [sortKey],
  );

  return (
    <div className="mt-10 space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {dict.title}
      </h2>

      {/* Stats KPI strip */}
      <LiveTradeStats stats={data?.stats ?? null} dict={dict.stats} />

      {/* Table + Exit reasons */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <LiveTradeTable
          trades={data?.trades ?? []}
          total={data?.total ?? 0}
          loading={loading}
          symbolFilter={symbolFilter}
          sortKey={sortKey}
          sortDir={sortDir}
          page={page}
          pageSize={PAGE_SIZE}
          onSymbolChange={handleSymbolChange}
          onSortChange={handleSortChange}
          onPageChange={setPage}
          dict={dict}
        />
        <LiveExitReasons
          exitReasons={data?.exitReasons ?? null}
          title={dict.exitReasons.title}
        />
      </div>
    </div>
  );
}
