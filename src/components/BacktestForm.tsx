"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, Play, X } from "lucide-react";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Input, Label } from "./ui/Input";
import { Select } from "./ui/Select";
import { V5_DEFAULTS } from "@/lib/engine/defaults";
import { diffFromV5 } from "@/lib/engine/diffParams";
import { cn } from "@/lib/utils/cn";
import type { BacktestParams } from "@/lib/engine/types";

export interface BacktestConfig {
  symbol: string;
  interval: string;
  startDate: string;
  endDate: string;
}

const POPULAR_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "AVAXUSDT"] as const;

type ValidationState = "idle" | "checking" | "valid" | "invalid";

export function BacktestForm({
  config,
  setConfig,
  params,
  setParams,
  onRun,
  busy,
}: {
  config: BacktestConfig;
  setConfig: (c: BacktestConfig) => void;
  params: BacktestParams;
  setParams: (p: BacktestParams) => void;
  onRun: () => void;
  busy: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validation, setValidation] = useState<ValidationState>("idle");

  const updateParam = <K extends keyof BacktestParams>(
    key: K,
    value: BacktestParams[K],
  ) => setParams({ ...params, [key]: value });

  const diff = diffFromV5(params);
  const isCustom = diff.length > 0;

  // Debounced symbol validation against /api/klines
  useEffect(() => {
    const sym = config.symbol.trim().toUpperCase();
    if (sym.length < 4) {
      setValidation("idle");
      return;
    }
    setValidation("checking");
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/klines?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(config.interval)}&limit=1`,
          { signal: ctrl.signal },
        );
        if (!r.ok) {
          setValidation("invalid");
          return;
        }
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) setValidation("valid");
        else setValidation("invalid");
      } catch {
        // aborted — leave as-is
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [config.symbol, config.interval]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRun();
      }}
      className="space-y-4"
    >
      {/* Form title with custom badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Configuration
        </h2>
        {isCustom && (
          <Badge tone="accent" title={`${diff.length} param(s) changed from V5`}>
            Custom · {diff.length}
          </Badge>
        )}
      </div>

      {/* Symbol picker chips */}
      <div>
        <Label>Quick pick</Label>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_SYMBOLS.map((s) => {
            const active = config.symbol === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setConfig({ ...config, symbol: s })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-mono font-semibold tracking-tight transition-all",
                  active
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow shadow-emerald-500/20"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:border-[var(--color-muted)] hover:text-white",
                )}
              >
                {s.replace("USDT", "")}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="symbol">Symbol</Label>
        <div className="relative">
          <Input
            id="symbol"
            value={config.symbol}
            onChange={(e) =>
              setConfig({ ...config, symbol: e.target.value.toUpperCase().trim() })
            }
            placeholder="BTCUSDT"
            autoComplete="off"
            spellCheck={false}
            className="pr-9 font-mono"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {validation === "checking" && (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted)]" />
            )}
            {validation === "valid" && <Check className="h-4 w-4 text-emerald-400" />}
            {validation === "invalid" && <X className="h-4 w-4 text-red-400" />}
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Any Binance spot pair (e.g., ETHUSDT, SOLUSDT, AVAXUSDT)
        </p>
      </div>

      <div>
        <Label htmlFor="interval">Timeframe</Label>
        <Select
          id="interval"
          value={config.interval}
          onChange={(e) => setConfig({ ...config, interval: e.target.value })}
        >
          <option value="15m">15 minutes</option>
          <option value="30m">30 minutes</option>
          <option value="1h">1 hour</option>
          <option value="4h">4 hours</option>
          <option value="1d">1 day</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={config.startDate}
            onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={config.endDate}
            onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="initialCapital">Initial Capital (USD)</Label>
        <Input
          id="initialCapital"
          type="number"
          min="100"
          step="100"
          value={params.initialCapital}
          onChange={(e) =>
            updateParam("initialCapital", parseFloat(e.target.value) || 10000)
          }
          className="font-mono"
        />
      </div>

      {/* Advanced parameters */}
      <div>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-xs font-medium uppercase tracking-wider text-[var(--color-muted)] hover:text-white"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Advanced parameters (V5 defaults)
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/60 p-3 backdrop-blur-md">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput
                label="Risk %"
                value={params.riskPct * 100}
                step={0.5}
                onChange={(v) => updateParam("riskPct", v / 100)}
              />
              <NumberInput
                label="Max position %"
                value={params.maxPositionPct * 100}
                step={5}
                onChange={(v) => updateParam("maxPositionPct", v / 100)}
              />
              <NumberInput
                label="SL × ATR"
                value={params.slAtrMult}
                step={0.1}
                onChange={(v) => updateParam("slAtrMult", v)}
              />
              <NumberInput
                label="TP1 × ATR"
                value={params.tp1AtrMult}
                step={0.1}
                onChange={(v) => updateParam("tp1AtrMult", v)}
              />
              <NumberInput
                label="TP2 × ATR"
                value={params.tp2AtrMult}
                step={0.5}
                onChange={(v) => updateParam("tp2AtrMult", v)}
              />
              <NumberInput
                label="TP3 × ATR"
                value={params.tp3AtrMult}
                step={0.5}
                onChange={(v) => updateParam("tp3AtrMult", v)}
              />
              <NumberInput
                label="Min signal score"
                value={params.minSignalScore}
                step={0.05}
                onChange={(v) => updateParam("minSignalScore", v)}
              />
              <NumberInput
                label="SL suppress bars"
                value={params.minBarsBeforeSl}
                step={1}
                onChange={(v) => updateParam("minBarsBeforeSl", Math.round(v))}
              />
            </div>
            <button
              type="button"
              className="text-xs text-blue-400 hover:underline"
              onClick={() => setParams(V5_DEFAULTS)}
            >
              Reset to V5 defaults
            </button>
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Run Backtest
          </>
        )}
      </Button>
    </form>
  );
}

function NumberInput({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="font-mono"
      />
    </div>
  );
}
