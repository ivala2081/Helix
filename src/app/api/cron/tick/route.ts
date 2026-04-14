// Deprecated. Cron tick logic moved to scripts/cron-tick.ts, invoked from
// .github/workflows/forward-test-cron.yml. Binance geo-blocks Vercel's AWS
// IPs (HTTP 451), so the tick runs on a GitHub Actions runner instead.
// This stub stays so any stale caller gets a loud 410 instead of silent 404.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error: "Gone — forward-test cron now runs via GitHub Actions",
      script: "scripts/cron-tick.ts",
      workflow: ".github/workflows/forward-test-cron.yml",
    },
    { status: 410 },
  );
}
