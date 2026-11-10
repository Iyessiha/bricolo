import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";

/** Compte le clic (Appeler / WhatsApp) puis redirige vers l’application du téléphone. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const type = req.nextUrl.searchParams.get("type") === "whatsapp" ? "whatsapp" : "call";
  const back = new URL(`/artisan/${id}`, req.url);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL("/resultats", req.url));
  const db = supabaseAdmin();
  const { data: a } = await db.from("artisans").select("name, phone, whatsapp, status, trade:trades(name)").eq("id", id).maybeSingle();
  if (!a || a.status !== "approved") return NextResponse.redirect(new URL("/resultats", req.url));
  await db.from("events").insert({ artisan_id: id, type });
  const num = ((type === "whatsapp" ? a.whatsapp ?? a.phone : a.phone) ?? "").replace(/[^\d+]/g, "");
  if (!num) return NextResponse.redirect(back);
  if (type !== "whatsapp") return NextResponse.redirect(`tel:${num}`);
  // Message pré-rempli : l’artisan sait tout de suite que le client vient de Bricolo.
  const trade = (Array.isArray(a.trade) ? a.trade[0]?.name : (a.trade as { name?: string } | null)?.name)?.toLowerCase();
  const site = new URL(siteUrl()).host;
  const text = `🔧 *Bricolo* — Bonjour, je vous contacte depuis votre fiche sur Bricolo (${site})${trade ? `, ${trade}` : ""}. J’ai besoin d’un service : `;
  return NextResponse.redirect(`https://wa.me/${num.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`);
}
