import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
            color: "#000",
            fontSize: 110,
            fontWeight: 800,
            fontFamily: "system-ui",
            borderRadius: 36,
          }}
        >
          H
        </div>
      </div>
    ),
    { ...size },
  );
}
