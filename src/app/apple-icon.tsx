import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const bars = ["#e9eef4", "#ffcc00", "#18b6c9", "#2e9e4f", "#c2398f", "#d7263d", "#1f4fb8"];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#13233a" }}>
        <div style={{ display: "flex", height: 110 }}>
          {bars.map((c) => (
            <div key={c} style={{ width: 18, height: "100%", background: c }} />
          ))}
        </div>
      </div>
    ),
    size
  );
}
