import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { MARK_D, MARK_VIEWBOX } from "@/lib/logo";

const SIZES = [192, 512];

/** Icône de l'application. « m=1 » : version « maskable » (fond plein, lettre dans la zone sûre) pour les formes d'icônes d'Android. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  if (!SIZES.includes(n)) return new Response("Introuvable", { status: 404 });
  const maskable = req.nextUrl.searchParams.get("m") === "1";
  const mark = Math.round(n * (maskable ? 0.5 : 0.66)); // « maskable » : le symbole reste dans la zone sûre (80 % centraux)
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#27489a", borderRadius: maskable ? 0 : Math.round(n * 0.22) }}>
        <svg width={mark} height={mark} viewBox={MARK_VIEWBOX}><path d={MARK_D} fill="#ffffff" /></svg>
      </div>
    ),
    { width: n, height: n, headers: { "cache-control": "public, max-age=31536000, immutable" } },
  );
}
