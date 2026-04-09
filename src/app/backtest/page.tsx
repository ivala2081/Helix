"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { History } from "lucide-react";
import { BacktestForm, type BacktestConfig } from "@/components/BacktestForm";
import { EmptyStatePreview } from "@/components/EmptyStatePreview";
import { ExportToolbar } from "@/components/ExportToolbar";
import { KPICards, type KPI } from "@/components/KPICards";
import { MetricsPanel } from "@/components/MetricsPanel";
import { ParityBadge } from "@/components/ParityBadge";
import { ResultsSkeleton } from "@/components/skeletons/ResultsSkeleton";
import { StageProgress, type Stage } from "@/components/StageProgress";
import { StickyKpiBar } from "@/components/StickyKpiBar";
import { TradeTable } from "@/components/TradeTable";
import { useToast } from "@/components/ui/ToastProvider";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { EquityCurve } from "@/components/charts/EquityCurve";
import { ExitReasons } from "@/components/charts/ExitReasons";
import { MonthlyHeatmap } from "@/components/charts/MonthlyHeatmap";
import { runBacktest } from "@/lib/engine/backtester";
import { computeBuyHoldEquity } from "@/lib/engine/buyHold";
import { V5_DEFAULTS } from "@/lib/engine/defaults";
import { fetchKlines } from "@/lib/data/fetcher";
import { fmtPct, fmtUsd } from "@/lib/utils/format";
import { readShareableQueryString } from "@/lib/utils/export";
import { loadRuns, saveRun, type RunMeta } from "@/lib/utils/runHistory";
import type { BacktestParams, BacktestResult, Candle } from "@/lib/engine/types";

type Phase = "idle" | "fetching" | "running" | "done" | "error";

export default function BacktestPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [config, setConfig] = useState<BacktestConfig>({
    symbol: "BTCUSDT",
    interval: "1h",
    startDate: "2023-01-01",
    endDate: today,
  });
  const [params, setParams] = useState<BacktestParams>(V5_DEFAULTS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<Stage>("fetch");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [focusedTradeId, setFocusedTradeId] = useState<number | null>(null);
  const [hoveredTradeId, setHoveredTradeId] = useState<number | null>(null);
  const [history, setHistory] = useState<RunMeta[]>([]);
  const cacheRef = useRef<Map<string, Candle[]>>(new Map());
  const kpiAnchorRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const toast = useToast();

  // Load run history on mount
  useEffect(() => {
    setHistory(loadRuns());
  }, []);

  // Read URL search params on mount → pre-fill the form so a "reproduce
  // this result" link from the landing page lands ready-to-run.
  useEffect(() => {
    if (!searchParams) return;
    const { config: urlConfig, params: urlParams } = readShareableQueryString(
      new URLSearchParams(searchParams.toString()),
      V5_DEFAULTS,
    );
    if (urlConfig) {
      setConfig(urlConfig);
    }
    // Only override params if at least one diverged from V5
    let anyDiverged = false;
    for (const k of Object.keys(V5_DEFAULTS) as (keyof BacktestParams)[]) {
      if (urlParams[k] !== V5_DEFAULTS[k]) {
        anyDiverged = true;
        break;
      }
    }
    if (anyDiverged) setParams(urlParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRun() {
    setResult(null);
    setProgress(0);
    setProgressMessage("");
    setFocusedTradeId(null);
    setHoveredTradeId(null);

    try {
      const startMs = new Date(config.startDate + "T00:00:00Z").getTime();
      const endMs = new Date(config.endDate + "T23:59:59Z").getTime();
      if (!isFinite(startMs) || !isFinite(endMs) || startMs >= endMs) {
        throw new Error("Invalid date range");
      }
      if (!config.symbol || config.symbol.length < 4) {
        throw new Error("Symbol is required (e.g., BTCUSDT)");
      }

      const cacheKey = `${config.symbol}:${config.interval}:${config.startDate}:${config.endDate}`;
      let candles = cacheRef.current.get(cacheKey);

      if (!candles) {
        setPhase("fetching");
        setStage("fetch");
        candles = await fetchKlines({
          symbol: config.symbol,
          interval: config.interval,
          startMs,
          endMs,
          onProgress: (pct, msg) => {
            setProgress(pct);
            if (msg) setProgressMessage(msg);
          },
        });
        if (candles.length < params.warmupBars + 50) {
          throw new Error(
            `Not enough data: got ${candles.length} candles, need at least ${params.warmupBars + 50}`,
          );
        }
        cacheRef.current.set(cacheKey, candles);
      }

      setPhase("running");
      setStage("indicators");
      setProgress(0);
      setProgressMessage("Computing indicators…");
      const r = await runBacktest(
        candles,
        params,
        (pct, msg) => {
          // The engine's onProgress goes 5 → 25 (indicator phase) then 25 → 95 (backtest)
          if (pct < 25) {
            setStage("indicators");
            // remap 5..25 → 0..100
            setProgress(Math.max(0, ((pct - 5) / 20) * 100));
          } else {
            setStage("backtest");
            // remap 25..95 → 0..100
            setProgress(Math.max(0, ((pct - 25) / 70) * 100));
          }
          if (msg) setProgressMessage(msg);
        },
        config.symbol,
        config.interval,
      );
      setResult(r);
      setPhase("done");
      const meta = saveRun(r);
      setHistory((prev) => [meta, ...prev.filter((p) => p.id !== meta.id)].slice(0, 5));
      toast.success(
        "Backtest complete",
        `${r.metrics.totalTrades} trades · ${fmtPct(r.metrics.totalReturnPct)} return`,
      );
    } catch (e) {
      const msg = (e as Error).message || "Backtest failed";
      setPhase("error");
      toast.error("Backtest failed", msg);
    }
  }

  const busy = phase === "fetching" || phase === "running";

  // Buy-hold curve memoized
  const buyHoldCurve = useMemo(() => {
    if (!result) return undefined;
    return computeBuyHoldEquity(result.candles, result.params.initialCapital);
  }, [result]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Backtest
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Run the Helix V5 engine on any Binance pair. The full backtest runs locally in your browser.
          </p>
        </div>
        {history.length > 0 && (
          <RunHistoryDropdown
            history={history}
            onPick={(meta) => {
              setConfig({
                symbol: meta.symbol,
                interval: meta.interval,
                startDate: meta.startDate,
                endDate: meta.endDate,
              });
              toast.info("Loaded from history", `Click "Run Backtest" to re-run`);
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
        {/* Left: Form */}
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-md">
            <BacktestForm
              config={config}
              setConfig={setConfig}
              params={params}
              setParams={setParams}
              onRun={onRun}
              busy={busy}
            />
          </div>
        </aside>

        {/* Right: Results */}
        <section className="min-w-0 space-y-6">
          {phase === "idle" && !result && <EmptyStatePreview />}

          {busy && (
            <>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-md">
                <h3 className="mb-4 text-sm font-semibold">
                  {phase === "fetching" ? "Fetching market data" : "Running backtest"}
                </h3>
                <StageProgress
                  current={stage}
                  pct={progress}
                  message={progressMessage}
                />
              </div>
              <ResultsSkeleton />
            </>
          )}

          {result && phase === "done" && (
            <>
              {/* Sticky KPI bar (only when scrolled past the main strip) */}
              <StickyKpiBar
                metrics={result.metrics}
                symbol={result.symbol}
                watchRef={kpiAnchorRef}
              />

              {/* Engine parity badge — establishes trust */}
              <ParityBadge compact />

              {/* Export toolbar */}
              <ExportToolbar result={result} config={config} params={params} />

              {/* Main KPI strip — anchor for sticky observer */}
              <div ref={kpiAnchorRef}>
                <KPICards kpis={resultKpis(result)} columns={6} />
              </div>

              <EquityCurve
                equityCurve={result.equityCurve}
                buyHoldCurve={buyHoldCurve}
                initialCapital={result.params.initialCapital}
              />
              <CandlestickChart
                candles={result.candles}
                trades={result.trades}
                symbol={result.symbol}
                focusedTradeId={focusedTradeId ?? hoveredTradeId}
              />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ExitReasons metrics={result.metrics} />
                <MonthlyHeatmap trades={result.trades} />
              </div>
              <MetricsPanel metrics={result.metrics} />
              <TradeTable
                trades={result.trades}
                onHover={setHoveredTradeId}
                onSelect={setFocusedTradeId}
                selectedId={focusedTradeId}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function RunHistoryDropdown({
  history,
  onPick,
}: {
  history: RunMeta[];
  onPick: (meta: RunMeta) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-1.5 text-xs text-[var(--color-muted)] backdrop-blur-md hover:text-white"
      >
        <History className="h-3.5 w-3.5" />
        History · {history.length}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-2 shadow-2xl backdrop-blur-xl sm:w-72">
            {history.map((h) => {
              const ret = h.totalReturnPct;
              const tone = ret >= 0 ? "text-emerald-400" : "text-red-400";
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    onPick(h);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--color-bg)]"
                >
                  <div>
                    <div className="font-mono font-semibold">
                      {h.symbol} · {h.interval}
                    </div>
                    <div className="text-[10px] text-[var(--color-muted)]">
                      {h.startDate} → {h.endDate} · {h.totalTrades} trades
                    </div>
                  </div>
                  <div className={"font-mono font-semibold " + tone}>
                    {fmtPct(ret)}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function resultKpis(r: BacktestResult): KPI[] {
  const m = r.metrics;
  return [
    {
      label: "Total return",
      value: fmtPct(m.totalReturnPct),
      tone: m.totalReturnPct >= 0 ? "positive" : "negative",
      sublabel: fmtUsd(m.netProfit),
    },
    {
      label: "Sharpe",
      value: m.sharpeRatio.toFixed(2),
      tone: m.sharpeRatio >= 1 ? "positive" : m.sharpeRatio >= 0 ? "neutral" : "negative",
    },
    {
      label: "Max drawdown",
      value: fmtPct(-m.maxDrawdownPct),
      tone: "negative",
    },
    {
      label: "Win rate",
      value: (m.winRate * 100).toFixed(1) + "%",
      tone: m.winRate >= 0.5 ? "positive" : "neutral",
      sublabel: `${m.winCount}/${m.totalTrades}`,
    },
    {
      label: "Profit factor",
      value: isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : "∞",
      tone: m.profitFactor >= 1.5 ? "positive" : "neutral",
    },
    {
      label: "Expectancy",
      value: fmtUsd(m.expectancy),
      tone: m.expectancy >= 0 ? "positive" : "negative",
      sublabel: "per trade",
    },
  ];
}
