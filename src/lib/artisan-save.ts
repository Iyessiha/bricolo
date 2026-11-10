import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { composeHeadline, priceLabel } from "@/lib/compose";
import { PRO_LIMITS } from "@/lib/boost";

const PHONE_USED = "Ce numéro de téléphone ou WhatsApp est déjà utilisé par un autre profil.";
export type SaveResult = { ok: true; created: boolean; artisanId: string } | { ok: false; error: string };

/** Enregistre (crée ou met à jour) la fiche de l'utilisateur connecté. Partagé par le tunnel d'activation et le formulaire du tableau de bord. */
export async function saveArtisanProfile(formData: FormData): Promise<SaveResult> {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };
  const { data: profile } = await db.from("profiles").select("country_code").eq("id", user.id).single();
  if (!profile?.country_code) return { ok: false, error: "Pays manquant." };

  const exp = String(formData.get("experience_years") ?? "").trim();
  const experience = /^\d{1,2}$/.test(exp) ? parseInt(exp, 10) : null;
  const fields = {
    name: String(formData.get("name") ?? "").trim(),
    trade_id: String(formData.get("trade_id") ?? ""),
    description: String(formData.get("description") ?? "").trim() || null,
    price_label: priceLabel(formData),
    headline: null as string | null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
    experience_years: experience,
    account_type: formData.get("account_type") === "entreprise" ? "entreprise" : "individuel",
    company_name: null as string | null,
  };
  if (fields.account_type === "entreprise") fields.company_name = String(formData.get("company_name") ?? "").trim().slice(0, 120) || fields.name;
  if (formData.has("headline_rest")) {
    const h = composeHeadline(String(formData.get("headline_rest") ?? ""));
    if (!h.ok) return { ok: false, error: h.error };
    fields.headline = h.value;
  }
  const registration = String(formData.get("registration_number") ?? "").trim().slice(0, 60);
  const zoneIds = formData.getAll("zones").map(String);
  if (fields.name.length < 2) return { ok: false, error: "Indiquez le nom affiché aux clients." };
  if (!fields.trade_id) return { ok: false, error: "Choisissez votre métier." };
  if (!zoneIds.length) return { ok: false, error: "Choisissez au moins une zone couverte." };
  if (experience === null || experience > 60) return { ok: false, error: "Indiquez vos années d’expérience (0 si vous débutez)." };
  if (!fields.phone || fields.phone.replace(/\D/g, "").length < 8) return { ok: false, error: "Indiquez un numéro de téléphone valide." };

  if (fields.headline === null && !formData.has("headline_rest")) delete (fields as any).headline;
  const { data: existing } = await db.from("artisans").select("id").eq("user_id", user.id).maybeSingle();
  // Forfait gratuit : 3 zones maximum. Les artisans qui en avaient davantage avant la règle les conservent (sans en ajouter).
  {
    const uniq = [...new Set(zoneIds)];
    let allowed: number = PRO_LIMITS.free.zones;
    let isPro = false;
    if (existing?.id) {
      const [{ data: sub }, { count }] = await Promise.all([
        db.from("subscriptions").select("id").eq("artisan_id", existing.id).eq("status", "active").gt("ends_at", new Date().toISOString()).limit(1),
        db.from("artisan_zones").select("zone_id", { count: "exact", head: true }).eq("artisan_id", existing.id),
      ]);
      if ((sub?.length ?? 0) > 0) { allowed = Math.max(PRO_LIMITS.pro.zones, count ?? 0); isPro = true; }
      else allowed = Math.max(allowed, count ?? 0);
    }
    if (uniq.length > allowed) return { ok: false, error: isPro ? `Le Forfait Pro permet ${PRO_LIMITS.pro.zones} zones d’intervention, ou une ville entière. Retirez-en quelques-unes.` : `Le forfait gratuit permet ${PRO_LIMITS.free.zones} zones d’intervention. Retirez-en ou passez au Forfait Pro.` };
    // Forfait Pro : une seule ville entière.
    if (isPro) {
      const { data: kids } = await db.from("zones").select("parent_id").in("parent_id", uniq);
      const cities = new Set((kids ?? []).map((k) => k.parent_id));
      if (cities.size > PRO_LIMITS.pro.cities) return { ok: false, error: "Le Forfait Pro couvre une seule ville entière. Pour plusieurs villes, choisissez leurs quartiers." };
    }
    // « Toute la ville » (une zone qui a des quartiers) est réservé au Forfait Pro.
    if (!isPro) {
      const [{ data: kids }, { data: had }] = await Promise.all([
        db.from("zones").select("parent_id").in("parent_id", uniq),
        existing?.id ? db.from("artisan_zones").select("zone_id").eq("artisan_id", existing.id) : Promise.resolve({ data: [] as { zone_id: string }[] }),
      ]);
      const keep = new Set((had ?? []).map((r) => r.zone_id));
      if ((kids ?? []).some((k) => k.parent_id && !keep.has(k.parent_id))) return { ok: false, error: "« Toute la ville » est réservé au Forfait Pro. Choisissez vos quartiers (3 au maximum) ou passez au Forfait Pro." };
    }
    zoneIds.splice(0, zoneIds.length, ...uniq);
  }
  let artisanId = existing?.id as string | undefined, created = false;
  if (artisanId) {
    const { error } = await db.from("artisans").update(fields).eq("id", artisanId);
    if (error) return { ok: false, error: /telephone_deja_utilise/.test(error.message) ? PHONE_USED : "L’enregistrement a échoué. Réessayez." };
  } else {
    const { data, error } = await db.from("artisans").insert({ ...fields, user_id: user.id, country_code: profile.country_code }).select("id").single();
    if (error || !data) return { ok: false, error: /telephone_deja_utilise/.test(error?.message ?? "") ? PHONE_USED : "L’enregistrement a échoué. Réessayez." };
    artisanId = data.id as string; created = true;
  }
  if (fields.account_type === "entreprise" && registration) await db.from("artisan_companies").upsert({ artisan_id: artisanId, registration_number: registration, updated_at: new Date().toISOString() });
  else await db.from("artisan_companies").delete().eq("artisan_id", artisanId);
  // L'ordre compte : si le Forfait Pro se termine, les 3 premières zones restent actives. Les zones déjà détenues gardent leur rang, les nouvelles passent après.
  const { data: held } = await db.from("artisan_zones").select("zone_id, position").eq("artisan_id", artisanId).order("position");
  const rank = new Map((held ?? []).map((r, i) => [r.zone_id as string, i]));
  const ordered = [...zoneIds].sort((a, b) => (rank.get(a) ?? 1e6) - (rank.get(b) ?? 1e6));
  await db.from("artisan_zones").delete().eq("artisan_id", artisanId);
  await db.from("artisan_zones").insert(ordered.map((zone_id, position) => ({ artisan_id: artisanId!, zone_id, position })));
  return { ok: true, created, artisanId };
}
