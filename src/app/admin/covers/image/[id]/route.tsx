import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { coverImage, coverInputOf } from "@/lib/cover-art";

/** Aperçu ou téléchargement (?dl=1) de la cover Bricolo d'un artisan. Réservé à l'équipe. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Introuvable", { status: 404 });
  const { db } = await requireAdmin();
  const c = await coverInputOf(db, id);
  if (!c) return new NextResponse("Introuvable", { status: 404 });
  let img;
  try { img = await coverImage(c); }
  catch { img = await coverImage({ ...c, photoUrl: null, shotUrl: null }); } // une photo illisible ne bloque pas la cover
  const res = new NextResponse(await img.arrayBuffer(), { headers: { "content-type": "image/png", "cache-control": "private, max-age=120" } });
  if (req.nextUrl.searchParams.get("dl")) res.headers.set("content-disposition", `attachment; filename="cover-bricolo-${id.slice(0, 8)}.png"`);
  return res;
}
