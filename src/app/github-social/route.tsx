import { ImageResponse } from "next/og";
import {
  LOGO_GRADIENT_FROM,
  LOGO_GRADIENT_TO,
  LOGO_PATHS,
  LOGO_VIEWBOX,
} from "@/components/brand/Logo";

// GitHub social preview: 1280×640 (2:1).
// Not wired into Next.js metadata — this is a standalone route at
// /github-social that generates a PNG you can download and upload
// to GitHub → Settings → Social preview.
const SIZE = { width: 1280, height: 640 };

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
          color: "#fafafa",
          position: "relative",
          textAlign: "center",
          padding: 80,
        }}
      >
        {/* Background blobs */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -100,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.28) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -100,
            width: 550,
            height: 550,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Centred logo mark — large */}
        <svg
          width="96"
          height="96"
          viewBox={LOGO_VIEWBOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="gh-g"
              x1="4"
              y1="4"
              x2="28"
              y2="28"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor={LOGO_GRADIENT_FROM} />
              <stop offset="1" stopColor={LOGO_GRADIENT_TO} />
            </linearGradient>
          </defs>
          <path d={LOGO_PATHS.leftLeg} stroke="url(#gh-g)" strokeWidth="4" strokeLinecap="round" />
          <path d={LOGO_PATHS.rightLeg} stroke="url(#gh-g)" strokeWidth="4" strokeLinecap="round" />
          <path d={LOGO_PATHS.crossbar} stroke="url(#gh-g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Title cluster */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 32,
            gap: 8,
          }}
        >
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: -1.5 }}>
            Helix
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: "#a1a1aa",
              maxWidth: 700,
              lineHeight: 1.4,
            }}
          >
            Institutional-grade price action backtesting.
            Market Structure + Fair Value Gaps on any Binance pair.
          </div>
        </div>

        {/* KPI row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 48,
            padding: "24px 40px",
            borderRadius: 16,
            border: "1px solid #27272a",
            background: "rgba(24,24,27,0.6)",
          }}
        >
          <GhStat label="Return" value="+949.7%" />
          <GhStat label="Sharpe" value="5.40" />
          <GhStat label="Win rate" value="84.3%" />
          <GhStat label="Profit factor" value="12.46" />
        </div>
      </div>
    ),
    { ...SIZE },
  );
}

function GhStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ fontSize: 13, color: "#71717a", textTransform: "uppercase", letterSpacing: 1.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#10b981" }}>{value}</div>
    </div>
  );
}
