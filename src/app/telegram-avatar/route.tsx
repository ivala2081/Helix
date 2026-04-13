import { ImageResponse } from "next/og";
import {
  LOGO_GRADIENT_FROM,
  LOGO_GRADIENT_TO,
  LOGO_PATHS,
  LOGO_VIEWBOX,
} from "@/components/brand/Logo";

// Telegram bot profile picture — 800×800 PNG.
// Telegram crops avatars into circles, so the mark is centred with generous
// padding and everything important stays inside a ~75% circular safe zone.
//
// Usage:
//   1. Run `npm run dev` (or deploy to Vercel)
//   2. Open /telegram-avatar in a browser
//   3. Right-click → Save Image As → helix-telegram.png
//   4. Open @BotFather → /setuserpic → select your bot → upload the PNG
export async function GET() {
  const size = 800;

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
            "radial-gradient(circle at 35% 30%, #1a2332 0%, #0d1117 50%, #09090b 100%)",
        }}
      >
        {/* Subtle circular glow behind the mark */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: 250,
            background:
              "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.06) 50%, transparent 70%)",
            display: "flex",
          }}
        />
        <svg
          width="360"
          height="360"
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
    { width: size, height: size },
  );
}
