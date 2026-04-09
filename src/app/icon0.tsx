import { ImageResponse } from "next/og";
import {
  LOGO_GRADIENT_FROM,
  LOGO_GRADIENT_TO,
  LOGO_PATHS,
  LOGO_VIEWBOX,
} from "@/components/brand/Logo";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// PWA "any" purpose icon. 192×192. Used by Android home-screen
// when the launcher does NOT apply its own mask.
export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 35% 25%, #1f2937 0%, #09090b 75%)",
          borderRadius: 32,
        }}
      >
        <svg
          width="128"
          height="128"
          viewBox={LOGO_VIEWBOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="g"
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
          <path
            d={LOGO_PATHS.leftLeg}
            stroke="url(#g)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d={LOGO_PATHS.rightLeg}
            stroke="url(#g)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d={LOGO_PATHS.crossbar}
            stroke="url(#g)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
