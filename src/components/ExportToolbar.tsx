"use client";

import { Copy, Download, FileText } from "lucide-react";
import { Button } from "./ui/Button";
import { useToast } from "./ui/ToastProvider";
import { downloadFile, paramsToQueryString, tradesToCsv } from "@/lib/utils/export";
import { V5_DEFAULTS } from "@/lib/engine/defaults";
import type { BacktestParams, BacktestResult } from "@/lib/engine/types";

interface BacktestConfig {
  symbol: string;
  interval: string;
  startDate: string;
  endDate: string;
}

export function ExportToolbar({
  result,
  config,
  params,
}: {
  result: BacktestResult;
  config: BacktestConfig;
  params: BacktestParams;
}) {
  const toast = useToast();

  const onDownloadCsv = () => {
    const csv = tradesToCsv(result.trades);
    const fname = `helix-${result.symbol}-${result.interval}-${config.startDate}-to-${config.endDate}.csv`;
    downloadFile(fname, csv, "text/csv;charset=utf-8");
    toast.success("CSV downloaded", `${result.trades.length} trades exported`);
  };

  const onCopyUrl = async () => {
    const qs = paramsToQueryString(config, params, V5_DEFAULTS);
    const url = `${window.location.origin}${window.location.pathname}?${qs}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", "Anyone with this URL can re-run your backtest");
    } catch {
      toast.error("Copy failed", "Your browser blocked clipboard access");
    }
  };

  const onDownloadPng = () => {
    // Find the first <canvas> on the page (the candlestick chart). Lightweight-charts
    // composes multiple canvases — we grab the largest one.
    const canvases = Array.from(document.querySelectorAll("canvas"));
    if (canvases.length === 0) {
      toast.error("No chart to export");
      return;
    }
    const target = canvases.reduce((biggest, c) =>
      c.width * c.height > biggest.width * biggest.height ? c : biggest,
    );
    target.toBlob((blob) => {
      if (!blob) {
        toast.error("Export failed");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `helix-chart-${result.symbol}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Chart exported");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={onDownloadCsv}>
        <FileText className="h-3.5 w-3.5" />
        Download CSV
      </Button>
      <Button variant="secondary" size="sm" onClick={onCopyUrl}>
        <Copy className="h-3.5 w-3.5" />
        Copy link
      </Button>
      <Button variant="secondary" size="sm" onClick={onDownloadPng}>
        <Download className="h-3.5 w-3.5" />
        Chart PNG
      </Button>
    </div>
  );
}
