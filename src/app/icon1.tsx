import { ImageResponse } from "next/og";
import {
  LOGO_GRADIENT_FROM,
  LOGO_GRADIENT_TO,
  LOGO_PATHS,
  LOGO_VIEWBOX,
} from "@/components/brand/Logo";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// PWA "maskable" purpose icon. 512×512 with the brand mark sized to
// fit inside the 80% safe zone (~410×410). Android launchers crop
// arbitrary shapes (circle, squircle, rounded square) — anything
// outside the safe zone will be cut.
export default function Icon512Maskable() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Solid background fills the entire 512px so the mask has
          // something to clip — no transparent corners getting punched.
          background: "#09090b",
        }}
      >
        {/* Inner 80% safe zone is the only area guaranteed visible */}
        <div
          style={{
            width: 410,
            height: 410,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 35% 25%, #1f2937 0%, #09090b 75%)",
            borderRadius: 100,
          }}
        >
          <svg
            width="240"
            height="240"
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
      </div>
    ),
    { ...size },
  );
}
