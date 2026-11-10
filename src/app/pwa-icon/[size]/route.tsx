import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

const SIZES = [192, 512];

/** Icône de l'application. « m=1 » : version « maskable » (fond plein, lettre dans la zone sûre) pour les formes d'icônes d'Android. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  if (!SIZES.includes(n)) return new Response("Introuvable", { status: 404 });
  const maskable = req.nextUrl.searchParams.get("m") === "1";
  const glyph = Math.round(n * (maskable ? 0.46 : 0.62));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#27489a", borderRadius: maskable ? 0 : Math.round(n * 0.22) }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: Math.round(glyph * 1.25), height: Math.round(glyph * 1.25), borderRadius: Math.round(glyph * 0.3), background: "#ffffff", color: "#27489a", fontSize: glyph, fontWeight: 800 }}>B</div>
      </div>
    ),
    { width: n, height: n, headers: { "cache-control": "public, max-age=31536000, immutable" } },
  );
}
