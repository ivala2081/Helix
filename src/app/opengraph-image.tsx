import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Helix — Institutional-Grade Price Action Backtesting";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          fontFamily: "system-ui",
          color: "#fafafa",
          position: "relative",
        }}
      >
        {/* Background gradient blob */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.35) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Logo + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            H
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>
            Helix
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 60,
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.05,
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
            gap: 60,
            marginTop: "auto",
            paddingTop: 40,
            borderTop: "1px solid #27272a",
          }}
        >
          <Stat label="Total return" value="+949.7%" tone="#10b981" />
          <Stat label="Sharpe" value="5.40" tone="#10b981" />
          <Stat label="Win rate" value="84.3%" tone="#10b981" />
          <Stat label="Profit factor" value="12.46" tone="#10b981" />
        </div>
      </div>
    ),
    { ...size },
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 16, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 44, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}
