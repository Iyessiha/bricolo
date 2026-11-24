import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { purgeAccount } from "@/lib/account-purge";

/** Passe les boosts terminés à « expired ». Le classement ignore déjà les boosts échus : ceci tient la base propre. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Non autorisé", { status: 401 });
  const db = supabaseAdmin();
  const { data } = await db.from("boosts").update({ status: "expired" }).eq("status", "active").lt("ends_at", new Date().toISOString()).select("id");
  // Paiements jamais terminés depuis plus de 24 h : marqués abandonnés, avec le boost ou le forfait qui attendait. Un paiement réellement encaissé tard reste activable (webhook ou confirmation manuelle).
  const old = new Date(Date.now() - 864e5).toISOString();
  const { data: stale } = await db.from("payments").select("id, boost_id, subscription_id, raw").eq("status", "pending").lt("created_at", old).limit(500);
  for (const p of stale ?? []) {
    await db.from("payments").update({ status: "failed", raw: { ...(p.raw as object ?? {}), abandonne: "aucune confirmation après 24 h" } }).eq("id", p.id).eq("status", "pending");
    if (p.boost_id) await db.from("boosts").update({ status: "cancelled" }).eq("id", p.boost_id).eq("status", "pending");
    if (p.subscription_id) await db.from("subscriptions").update({ status: "cancelled" }).eq("id", p.subscription_id).eq("status", "pending");
  }
  // Suppressions de compte demandées il y a plus de 7 jours : effacement définitif.
  const { data: due } = await db.from("artisans").select("user_id").not("deletion_at", "is", null).lt("deletion_at", new Date().toISOString()).limit(50);
  let purged = 0;
  for (const d of due ?? []) { const { error } = await purgeAccount(d.user_id); if (!error) purged++; }
  return NextResponse.json({ expired: data?.length ?? 0, abandoned: stale?.length ?? 0, purged });
}
