import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_PROMISE, BRAND_SLOGAN } from "@/src/lib/brand";

export const alt = `${BRAND_NAME}. ${BRAND_PROMISE} ${BRAND_SLOGAN}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#f7f4ef", color: "#292724", padding: "76px 88px", fontFamily: "Nunito Sans, sans-serif" }}>
      <div style={{ position: "absolute", width: 430, height: 430, borderRadius: 999, background: "#fbeaec", top: -190, right: -90 }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: 999, background: "#e6d3b8", opacity: 0.52, bottom: -155, left: -95 }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ width: 58, height: 5, borderRadius: 99, background: "#a95568" }} />
          <span style={{ fontSize: 30, fontWeight: 750, letterSpacing: 8 }}>{BRAND_NAME.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 950 }}>
          <span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>{BRAND_PROMISE}</span>
          <span style={{ marginTop: 32, color: "#8d3f54", fontSize: 27, fontWeight: 650 }}>{BRAND_SLOGAN}</span>
        </div>
        <div style={{ display: "flex", color: "#6b655f", fontSize: 20 }}>mybestversion.life</div>
      </div>
    </div>,
    size,
  );
}
