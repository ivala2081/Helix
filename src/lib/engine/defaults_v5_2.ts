import type { BacktestParams } from "./types";
import { V5_DEFAULTS } from "./defaults";

// V5.2 parameter set. PLACEHOLDER — currently identical to V5 so the per-customer
// strategy plumbing works end to end. The quant walk-forward R&D
// (scripts/walkforward.ts) will replace this with validated chop-gate / entry-
// confirmation params ONLY IF they beat V5 OUT-OF-SAMPLE. Until then V5.2 == V5,
// so assigning a customer to V5.2 changes nothing behaviourally yet.
export const V5_2_DEFAULTS: BacktestParams = { ...V5_DEFAULTS };
