import { ImageResponse } from "next/og";

export const alt = "My Best Version · Life, but more you.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#FFF6F2", color: "#2F2F33", padding: "72px 84px", fontFamily: "Georgia, serif" }}>
      <div style={{ position: "absolute", width: 420, height: 420, borderRadius: 999, background: "#F6CFCC", opacity: 0.72, top: -180, right: -80 }} />
      <div style={{ position: "absolute", width: 310, height: 310, borderRadius: 999, background: "#E6D3B8", opacity: 0.55, bottom: -150, left: -80 }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #2F2F33", borderRadius: 28, background: "linear-gradient(135deg, #F6CFCC, #FFF6F2)", fontFamily: "Arial, sans-serif", fontSize: 29, fontWeight: 700, letterSpacing: 2 }}>MBV</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Arial, sans-serif", fontSize: 31, fontWeight: 700, letterSpacing: 10 }}>MY BEST VERSION</span>
            <span style={{ marginTop: 10, fontFamily: "Arial, sans-serif", color: "#E88A7E", fontSize: 20, letterSpacing: 5 }}>PLANEA · ACCIONA · LOGRA</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
          <span style={{ fontSize: 77, lineHeight: 1.05 }}>Life, but more you.</span>
          <span style={{ marginTop: 22, fontFamily: "Arial, sans-serif", fontSize: 28, lineHeight: 1.4, color: "#6F625C" }}>Convierte tu visión en planes, hábitos y acciones sostenibles.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Arial, sans-serif", fontSize: 20, color: "#6F625C" }}><span style={{ width: 74, height: 5, borderRadius: 99, background: "#E88A7E" }} /> Planeación en cascada · bienestar · finanzas · progreso</div>
      </div>
    </div>,
    size,
  );
}

