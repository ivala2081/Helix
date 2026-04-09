import { ImageResponse } from "next/og";
import {
  LOGO_GRADIENT_FROM,
  LOGO_GRADIENT_TO,
  LOGO_PATHS,
  LOGO_VIEWBOX,
} from "@/components/brand/Logo";

// Twitter/X summary_large_image format: 1200×600 (2:1 ratio).
// Taller than OG (1200×630) by 30px — we tighten padding and use
// a more compact layout with the KPI strip horizontally centered.
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";
export const alt = "Helix — Institutional-Grade Price Action Backtesting";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
          fontFamily: "system-ui",
          color: "#fafafa",
          position: "relative",
        }}
      >
        {/* Background blobs */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -180,
            width: 650,
            height: 650,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -120,
            width: 450,
            height: 450,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Logo + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg
            width="52"
            height="52"
            viewBox={LOGO_VIEWBOX}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="tw-g"
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
            <path d={LOGO_PATHS.leftLeg} stroke="url(#tw-g)" strokeWidth="4" strokeLinecap="round" />
            <path d={LOGO_PATHS.rightLeg} stroke="url(#tw-g)" strokeWidth="4" strokeLinecap="round" />
            <path d={LOGO_PATHS.crossbar} stroke="url(#tw-g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
            Helix
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.1,
          }}
        >
          <div>Institutional-grade</div>
          <div
            style={{
              background: "linear-gradient(90deg, #34d399, #60a5fa)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            price action backtesting
          </div>
        </div>

        {/* KPI strip */}
        <div
          style={{
            display: "flex",
            gap: 56,
            marginTop: "auto",
            paddingTop: 32,
            borderTop: "1px solid #27272a",
          }}
        >
          <KPI label="Total return" value="+949.7%" />
          <KPI label="Sharpe" value="5.40" />
          <KPI label="Win rate" value="84.3%" />
          <KPI label="Profit factor" value="12.46" />
        </div>
      </div>
    ),
    { ...size },
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 14, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 38, fontWeight: 700, color: "#10b981" }}>{value}</div>
    </div>
  );
}
