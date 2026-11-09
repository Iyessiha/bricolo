import "server-only";
import { supabaseAdmin } from "./supabase/admin";

export const MAX_SEARCH_SLOTS = 5;
export const MAX_HOME_SLOTS = 6;
type Admin = ReturnType<typeof supabaseAdmin>;

const group = (t: string) => (t === "accueil" ? "accueil" : t === "urgence" ? "urgence" : "recherche");
const typesOf = (t: string) => (group(t) === "recherche" ? ["recherche", "cible"] : [t]);

/** Nombre d’artisans boostés sur le même emplacement (métier + zone, ou accueil du pays). */
export async function usedSlots(db: Admin, o: { type: string; tradeId: string; zoneId: string | null; country: string }) {
  let q = db.from("boosts").select("artisan_id, zone_id").eq("status", "active").gt("ends_at", new Date().toISOString()).in("type", typesOf(o.type));
  if (group(o.type) !== "accueil" && o.zoneId) q = q.eq("zone_id", o.zoneId);
  const { data: boosts } = await q;
  const ids = [...new Set((boosts ?? []).map((b) => b.artisan_id))];
  if (!ids.length) return 0;
  let a = db.from("artisans").select("id").in("id", ids).eq("country_code", o.country);
  if (group(o.type) !== "accueil") a = a.eq("trade_id", o.tradeId);
  const { data } = await a;
  return data?.length ?? 0;
}

export const capFor = (type: string) => (type === "accueil" ? MAX_HOME_SLOTS : MAX_SEARCH_SLOTS);

/** Active le boost payé. Idempotent : un webhook reçu deux fois ne prolonge pas deux fois. */
export async function activateFromPayment(providerRef: string, paidAmount: number) {
  const db = supabaseAdmin();
  const { data: pay } = await db.from("payments").select("*").eq("provider_ref", providerRef).maybeSingle();
  if (!pay) return { ok: false as const, reason: "paiement inconnu" };
  if (pay.status === "paid") return { ok: true as const, already: true };
  if (paidAmount < pay.amount) return { ok: false as const, reason: "montant insuffisant" };

  const { data: boost } = await db.from("boosts").select("*").eq("id", pay.boost_id).single();
  if (!boost) return { ok: false as const, reason: "boost introuvable" };

  const now = new Date();
  const ms = boost.duration_hours * 36e5;
  let q = db.from("boosts").select("id, ends_at").eq("artisan_id", boost.artisan_id).eq("type", boost.type)
    .eq("status", "active").gt("ends_at", now.toISOString()).neq("id", boost.id);
  q = boost.zone_id ? q.eq("zone_id", boost.zone_id) : q.is("zone_id", null);
  const { data: same } = await q.maybeSingle();

  if (same) {
    await db.from("boosts").update({ ends_at: new Date(new Date(same.ends_at).getTime() + ms).toISOString() }).eq("id", same.id);
    await db.from("boosts").update({ status: "merged" }).eq("id", boost.id);
  } else {
    await db.from("boosts").update({ status: "active", starts_at: now.toISOString(), ends_at: new Date(now.getTime() + ms).toISOString() }).eq("id", boost.id);
  }
  await db.from("payments").update({ status: "paid", paid_at: now.toISOString() }).eq("id", pay.id);
  return { ok: true as const, already: false };
}
