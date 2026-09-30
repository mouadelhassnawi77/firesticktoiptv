import { ImageResponse } from "next/og";
import { site, formatPrice } from "@/lib/site";
import { lowestMonthly, trial } from "@/lib/shop";

export const alt = `${site.name}: IPTV Service USA`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const bars = ["#e9eef4", "#ffcc00", "#18b6c9", "#2e9e4f", "#c2398f", "#d7263d", "#1f4fb8"];

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f1f3f6",
          color: "#13233a",
          padding: "72px 80px",
          borderBottom: "24px solid #ffcc00",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", height: 56, border: "4px solid #13233a" }}>
            {bars.map((c) => (
              <div key={c} style={{ width: 10, height: "100%", background: c }} />
            ))}
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>{site.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>
            IPTV Service for the USA
          </div>
          <div style={{ fontSize: 34, marginTop: 24, color: "#4a5a70" }}>
            {`${site.channelCount} channels from ${formatPrice(lowestMonthly)}/month. Free ${trial.hours}-hour trial.`}
          </div>
        </div>
      </div>
    ),
    size
  );
}
