import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPro } from "@/lib/boost";
import { siteUrl } from "@/lib/env";
import { kitImage, type KitKind } from "@/lib/kit-art";

export const dynamic = "force-dynamic";
const KINDS: KitKind[] = ["affiche", "statut", "carte"];
const FILE: Record<KitKind, string> = { affiche: "affiche-bricolo", statut: "statut-whatsapp-bricolo", carte: "carte-bricolo" };

/** Kit WhatsApp du Forfait Pro : image personnalisée de l'artisan connecté (affiche, statut WhatsApp, carte), ?dl=1 pour la télécharger. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!KINDS.includes(kind as KitKind)) return new NextResponse("Introuvable", { status: 404 });
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/connexion", siteUrl()), 303);
  const db = supabaseAdmin();
  const { data: a } = await db.from("artisans").select("id, name, headline, verified, status, country_code, trade:trades(name)").eq("user_id", user.id).maybeSingle();
  if (!a || a.status !== "approved") return NextResponse.redirect(new URL("/tableau-de-bord", siteUrl()), 303);
  if (!(await isPro(db, a.id))) return NextResponse.redirect(new URL("/tableau-de-bord?s=forfait", siteUrl()), 303);
  const trade = (Array.isArray(a.trade) ? a.trade[0] : a.trade) as { name: string } | null;
  const link = `${siteUrl()}/artisan/${a.id}?s=qr`;
  const img = await kitImage(kind as KitKind, { name: a.name, trade: trade?.name ?? "", country: a.country_code, headline: a.headline, verified: !!a.verified, link, display: siteUrl().replace(/^https?:\/\//, "") });
  const res = new NextResponse(await img.arrayBuffer(), { headers: { "content-type": "image/png", "cache-control": "private, max-age=60" } });
  if (req.nextUrl.searchParams.get("dl")) res.headers.set("content-disposition", `attachment; filename="${FILE[kind as KitKind]}-${a.id.slice(0, 8)}.png"`);
  return res;
}
