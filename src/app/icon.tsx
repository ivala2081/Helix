import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
          color: "#000",
          fontSize: 44,
          fontWeight: 800,
          fontFamily: "system-ui",
          borderRadius: 12,
        }}
      >
        H
      </div>
    ),
    { ...size },
  );
}
