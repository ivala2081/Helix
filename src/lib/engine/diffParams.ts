// Diff a BacktestParams against the V5 defaults, returning a list of
// changed fields. Used by the "Custom" badge in the form.

import type { BacktestParams } from "./types";
import { V5_DEFAULTS } from "./defaults";

export interface ParamDiff {
  key: keyof BacktestParams;
  defaultValue: BacktestParams[keyof BacktestParams];
  currentValue: BacktestParams[keyof BacktestParams];
}

export function diffFromV5(params: BacktestParams): ParamDiff[] {
  const out: ParamDiff[] = [];
  for (const k of Object.keys(V5_DEFAULTS) as (keyof BacktestParams)[]) {
    if (params[k] !== V5_DEFAULTS[k]) {
      out.push({ key: k, defaultValue: V5_DEFAULTS[k], currentValue: params[k] });
    }
  }
  return out;
}
