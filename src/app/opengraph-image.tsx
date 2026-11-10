import { ImageResponse } from "next/og";

export const alt = "Bricolo : l’annuaire des artisans de l’Afrique de l’Ouest";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#27489a", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 56, fontWeight: 800 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#fff", color: "#27489a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>B</div>Bricolo
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
