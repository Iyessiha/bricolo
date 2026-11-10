import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createCheckout } from "@/lib/geniuspay";
import { siteUrl } from "@/lib/env";
import { planByKey, planPrice } from "@/lib/plans";

const to = (path: string) => NextResponse.redirect(new URL(path, siteUrl()), 303);
const back = (q = "") => to(`/tableau-de-bord?s=forfait${q}`);

/** Achat du Forfait Pro : le prix vient de la base (jamais du navigateur), le paiement active l'abonnement via le webhook. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const plan = planByKey(String(form.get("plan") ?? "month"));
  const user = await (await supabaseServer()).auth.getUser();
  if (!user.data.user) return to("/connexion");
  const db = supabaseAdmin();
  const { data: a } = await db.from("artisans").select("id, country_code, status").eq("user_id", user.data.user.id).single();
  if (!a || a.status !== "approved") return to("/tableau-de-bord");
  const { data: price } = await db.from("plan_prices").select("amount, week_amount, year_amount").eq("country_code", a.country_code).single();
  if (!price || price.amount <= 0) return back("&erreur=" + encodeURIComponent("Le paiement n’a pas pu démarrer. Réessayez dans un instant."));
  const amount = planPrice(price, plan.key); // semaine = 1/3 du mois, année = 10 mois

  const { data: sub, error } = await db.from("subscriptions").insert({ artisan_id: a.id, days: plan.days, amount, status: "pending" }).select("id").single();
  if (error || !sub) return back("&erreur=" + encodeURIComponent("Le paiement n’a pas pu démarrer. Réessayez dans un instant."));
  const reference = `bricolo_${randomUUID()}`;
  await db.from("payments").insert({ subscription_id: sub.id, provider_ref: reference, amount });
  try {
    const { checkoutUrl } = await createCheckout({
      reference, amount, currency: "XOF", description: `Forfait Pro Bricolo, ${plan.label}`,
      returnUrl: `${siteUrl()}/tableau-de-bord?s=forfait&paye=1`, webhookUrl: `${siteUrl()}/api/webhooks/geniuspay`, customerEmail: user.data.user.email ?? "",
    });
    return NextResponse.redirect(checkoutUrl, 303);
  } catch {
    await db.from("payments").update({ status: "failed" }).eq("provider_ref", reference);
    await db.from("subscriptions").update({ status: "cancelled" }).eq("id", sub.id);
    return back("&erreur=" + encodeURIComponent("Le paiement n’a pas pu démarrer. Réessayez dans un instant."));
  }
}
