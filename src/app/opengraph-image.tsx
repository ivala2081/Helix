import { ImageResponse } from "next/og";
import {
  LOGO_GRADIENT_FROM,
  LOGO_GRADIENT_TO,
  LOGO_PATHS,
  LOGO_VIEWBOX,
} from "@/components/brand/Logo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Helix";

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
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
          color: "#fafafa",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)",
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
              "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg
            width="96"
            height="96"
            viewBox={LOGO_VIEWBOX}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="og-logo-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={LOGO_GRADIENT_FROM} />
                <stop offset="1" stopColor={LOGO_GRADIENT_TO} />
              </linearGradient>
            </defs>
            <path d={LOGO_PATHS.leftLeg} stroke="url(#og-logo-grad)" strokeWidth="4" strokeLinecap="round" />
            <path d={LOGO_PATHS.rightLeg} stroke="url(#og-logo-grad)" strokeWidth="4" strokeLinecap="round" />
            <path d={LOGO_PATHS.crossbar} stroke="url(#og-logo-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 128, fontWeight: 300, letterSpacing: -4 }}>
            Helix
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
            fontSize: 22,
            color: "#71717a",
            textTransform: "uppercase",
            letterSpacing: 6,
          }}
        >
          Live forward test
        </div>
      </div>
    ),
    { ...size },
  );
}
