import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { capFor, usedSlots } from "@/lib/boost";
import { createCheckout } from "@/lib/geniuspay";
import { BOOST_TYPES, DURATIONS } from "@/lib/format";
import { siteUrl } from "@/lib/env";

const to = (path: string) => NextResponse.redirect(new URL(path, siteUrl()), 303);

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const type = String(form.get("type"));
  const duration = Number(form.get("duration"));
  const zoneId = String(form.get("zone") ?? "");
  if (!(type in BOOST_TYPES) || !(duration in DURATIONS)) return to("/boosts?erreur=1");

  // 1. Qui paie : l’artisan connecté, profil validé.
  const user = await (await supabaseServer()).auth.getUser();
  if (!user.data.user) return to("/connexion");
  const db = supabaseAdmin();
  const { data: a } = await db.from("artisans").select("id, country_code, trade_id, status").eq("user_id", user.data.user.id).single();
  if (!a || a.status !== "approved") return to("/tableau-de-bord");

  // 2. La zone doit être l’une des zones de l’artisan (sauf accueil).
  let zone: { id: string; price_factor: number } | null = null;
  if (type !== "accueil") {
    const { data: az } = await db.from("artisan_zones").select("zone:zones(id, price_factor)").eq("artisan_id", a.id).eq("zone_id", zoneId).maybeSingle();
    zone = (az as any)?.zone ?? null;
    if (!zone) return to("/boosts?erreur=1");
  }

  // 3. Prix calculé côté serveur à partir de la grille du pays : jamais envoyé par le navigateur.
  const { data: g } = await db.from("price_grid").select("amount").eq("country_code", a.country_code)
    .eq("boost_type", type === "cible" ? "recherche" : type).eq("duration_hours", duration).single();
  if (!g) return to("/boosts?erreur=1");
  const amount = Math.round((g.amount * (type === "cible" ? Number(zone!.price_factor) : 1)) / 100) * 100;

  // 4. Places : un renouvellement du même boost reste toujours possible.
  let sameQ = db.from("boosts").select("id").eq("artisan_id", a.id).eq("type", type).eq("status", "active").gt("ends_at", new Date().toISOString());
  sameQ = zone ? sameQ.eq("zone_id", zone.id) : sameQ.is("zone_id", null);
  const { data: same } = await sameQ;
  const renewing = (same ?? []).length > 0;
  if (!renewing && (await usedSlots(db, { type, tradeId: a.trade_id, zoneId: zone?.id ?? null, country: a.country_code })) >= capFor(type)) return to("/boosts?erreur=complet");

  // 5. Boost et paiement « en attente », puis lien de paiement GeniusPay.
  const { data: boost, error } = await db.from("boosts").insert({
    artisan_id: a.id, type, zone_id: zone?.id ?? null, duration_hours: duration, amount, status: "pending",
  }).select("id").single();
  if (error || !boost) return to("/boosts?erreur=1");
  const reference = `bricolo_${randomUUID()}`;
  await db.from("payments").insert({ boost_id: boost.id, provider_ref: reference, amount });
  try {
    const { checkoutUrl } = await createCheckout({
      reference, amount, currency: "XOF", description: `${BOOST_TYPES[type].name}, ${DURATIONS[duration]}`,
      returnUrl: `${siteUrl()}/boosts?paye=1`, webhookUrl: `${siteUrl()}/api/webhooks/geniuspay`, customerEmail: user.data.user.email ?? "",
    });
    return NextResponse.redirect(checkoutUrl, 303);
  } catch {
    await db.from("payments").update({ status: "failed" }).eq("provider_ref", reference);
    await db.from("boosts").update({ status: "cancelled" }).eq("id", boost.id);
    return to("/boosts?erreur=1");
  }
}
