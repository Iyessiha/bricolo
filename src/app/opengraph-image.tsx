import { ImageResponse } from "next/og";
import { MARK_D, MARK_VIEWBOX } from "@/lib/logo";

export const alt = "Bricolo : l’annuaire des artisans de l’Afrique de l’Ouest";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#27489a", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 56, fontWeight: 800 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="50" height="50" viewBox={MARK_VIEWBOX}><path d={MARK_D} fill="#27489a" /></svg></div>Bricolo
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Le bon artisan, près de chez vous.</div>
          <div style={{ fontSize: 34, opacity: 0.88 }}>Plombiers, électriciens, menuisiers, frigoristes… vérifiés, en Afrique de l’Ouest francophone.</div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 28, opacity: 0.85 }}>
          <span>Côte d’Ivoire · Sénégal · Burkina Faso · Mali · Niger · Bénin · Togo</span>
          
        </div>
      </div>
    ),
    size,
  );
}
