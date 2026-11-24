import { coverSvg, hasCoverSvg } from "@/lib/cover-svg";

/** Cover par défaut en SVG pour un métier : /cover-defaut/plombier */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = slug.replace(/\.svg$/, "");
  if (!hasCoverSvg(s)) return new Response("Introuvable", { status: 404 });
  return new Response(coverSvg(s), { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
}
