import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

const PHONE_USED = "Ce numéro de téléphone ou WhatsApp est déjà utilisé par un autre profil.";
const UNIT_LABEL: Record<string, string> = { intervention: "par intervention", heure: "par heure", jour: "par jour", "m²": "par m²", "mètre": "par mètre", "pièce": "par pièce" };
/** Tarif construit à partir du montant et de l'unité choisis ; l'ancien champ libre reste accepté. */
function priceLabel(f: FormData): string | null {
  if (!f.has("price_unit")) return String(f.get("price_label") ?? "").trim().slice(0, 60) || null;
  const unit = String(f.get("price_unit"));
  if (unit === "devis") return "Sur devis gratuit";
  const n = parseInt(String(f.get("price_amount") ?? "").replace(/\D/g, ""), 10);
  if (!n || n < 100 || n > 10_000_000 || !UNIT_LABEL[unit]) return null;
  return `Dès ${n} F ${UNIT_LABEL[unit]}`;
}

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
    const rest = String(formData.get("headline_rest") ?? "").trim().replace(/^je\s+vais\s+/i, "").replace(/\s+/g, " ");
    if (rest.length < 8) return { ok: false, error: "Complétez votre promesse : « Je vais … » (8 caractères minimum)." };
    if (rest.length > 70) return { ok: false, error: "Votre promesse est trop longue (70 caractères maximum)." };
    fields.headline = `Je vais ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
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
  await db.from("artisan_zones").delete().eq("artisan_id", artisanId);
  await db.from("artisan_zones").insert(zoneIds.map((zone_id) => ({ artisan_id: artisanId!, zone_id })));
  return { ok: true, created, artisanId };
}
