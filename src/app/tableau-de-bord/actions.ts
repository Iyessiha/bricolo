"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { saveArtisanProfile } from "@/lib/artisan-save";
import { composeHeadline, priceLabel } from "@/lib/compose";
import { cleanHours } from "@/lib/hours";

/** Formulaire « Modifier mon profil » du tableau de bord. */
export async function saveProfile(formData: FormData) {
  const r = await saveArtisanProfile(formData);
  if (!r.ok) redirect(`/tableau-de-bord?erreur=${encodeURIComponent(r.error)}#profil`);
  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord?ok=1#profil");
}

export async function requestVerification() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  await db.from("artisans").update({ verification_requested: true }).eq("user_id", user.id);
  revalidatePath("/tableau-de-bord");
}

export async function markAnswered(formData: FormData) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  await db.from("service_requests").update({ status: "answered" }).eq("id", String(formData.get("id")));
  revalidatePath("/tableau-de-bord");
}

/** Diplôme ajouté depuis le tableau de bord (le fichier est déjà dans le stockage privé). */
export async function addDiploma(title: string, path: string): Promise<{ ok: boolean; error?: string }> {
  const db = await supabaseServer();
  const { error } = await db.rpc("submit_diploma", { p_title: title, p_path: path });
  if (error) return { ok: false, error: /limite/.test(error.message) ? "Vous pouvez envoyer 3 diplômes au maximum." : "L’envoi a échoué. Vérifiez l’intitulé et réessayez." };
  revalidatePath("/tableau-de-bord");
  return { ok: true };
}

export async function saveHours(formData: FormData) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  let parsed: unknown = {};
  try { parsed = JSON.parse(String(formData.get("hours") ?? "{}")); } catch { /* horaires ignorés */ }
  const { error } = await db.from("artisans").update({
    hours: cleanHours(parsed), open_24_7: formData.get("open_24_7") === "1", takes_urgent: formData.get("takes_urgent") === "1",
  }).eq("user_id", user.id);
  if (error) redirect("/tableau-de-bord?s=horaires&erreur=" + encodeURIComponent("L’enregistrement a échoué. Réessayez."));
  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord?s=horaires&ok=1");
}

async function me() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: a } = await db.from("artisans").select("id, cover_url").eq("user_id", user.id).maybeSingle();
  return a ? { db, user, a } : null;
}
const okPath = (p: string, uid: string) => p.startsWith(`${uid}/`) && !p.includes("..") && p.length < 200;
const keyOf = (url: string | null | undefined) => url?.split("/object/public/realisations/")[1] ?? null;

/** Photo de couverture (paysage) : le fichier est déjà dans le stockage public, on enregistre son adresse. */
export async function saveCover(path: string): Promise<{ ok: boolean; error?: string }> {
  const c = await me(); if (!c) return { ok: false, error: "Session expirée. Reconnectez-vous." };
  if (!okPath(path, c.user.id)) return { ok: false, error: "Fichier invalide." };
  const { data } = c.db.storage.from("realisations").getPublicUrl(path);
  const old = keyOf(c.a.cover_url);
  const { error } = await c.db.from("artisans").update({ cover_url: data.publicUrl }).eq("id", c.a.id);
  if (error) return { ok: false, error: "L’enregistrement a échoué." };
  if (old) await c.db.storage.from("realisations").remove([old]);
  revalidatePath("/tableau-de-bord");
  return { ok: true };
}
export async function removeCover(): Promise<{ ok: boolean }> {
  const c = await me(); if (!c) return { ok: false };
  const old = keyOf(c.a.cover_url);
  await c.db.from("artisans").update({ cover_url: null }).eq("id", c.a.id);
  if (old) await c.db.storage.from("realisations").remove([old]);
  revalidatePath("/tableau-de-bord"); return { ok: true };
}
export async function addPortfolio(path: string, caption: string): Promise<{ ok: boolean; error?: string }> {
  const c = await me(); if (!c) return { ok: false, error: "Session expirée. Reconnectez-vous." };
  if (!okPath(path, c.user.id)) return { ok: false, error: "Fichier invalide." };
  const { data } = c.db.storage.from("realisations").getPublicUrl(path);
  const { error } = await c.db.from("portfolio_photos").insert({ artisan_id: c.a.id, path, url: data.publicUrl, caption: caption.trim().slice(0, 80) || null });
  if (error) {
    await c.db.storage.from("realisations").remove([path]);
    return { ok: false, error: /portfolio_plein/.test(error.message) ? "Limite de photos atteinte. Supprimez-en une, ou passez au Forfait Pro (20 photos)." : "L’enregistrement a échoué." };
  }
  revalidatePath("/tableau-de-bord"); return { ok: true };
}
export async function removePortfolio(id: string): Promise<{ ok: boolean }> {
  const c = await me(); if (!c || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  const { data: p } = await c.db.from("portfolio_photos").select("path").eq("id", id).eq("artisan_id", c.a.id).maybeSingle();
  if (!p) return { ok: false };
  await c.db.from("portfolio_photos").delete().eq("id", id).eq("artisan_id", c.a.id);
  await c.db.storage.from("realisations").remove([p.path]);
  revalidatePath("/tableau-de-bord"); return { ok: true };
}

const to = (kind: "ok" | "erreur", msg: string): never => redirect(`/tableau-de-bord?${kind}=${encodeURIComponent(msg)}#profil`);
export async function addService(formData: FormData) {
  const c = await me(); if (!c) redirect("/connexion");
  const h = composeHeadline(String(formData.get("headline_rest") ?? ""));
  if (!h.ok) return to("erreur", h.error);
  const { error } = await c.db.from("artisan_services").insert({ artisan_id: c.a.id, headline: h.value, price_label: priceLabel(formData) });
  if (error) return to("erreur", /prestations_pleines/.test(error.message) ? "Le forfait gratuit permet 1 prestation. Passez au Forfait Pro pour en ajouter jusqu’à 10." : "La prestation n’a pas pu être ajoutée.");
  revalidatePath("/tableau-de-bord"); return to("ok", "Prestation ajoutée.");
}
export async function removeService(formData: FormData) {
  const c = await me(); if (!c) redirect("/connexion");
  const id = String(formData.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) await c.db.from("artisan_services").delete().eq("id", id).eq("artisan_id", c.a.id);
  revalidatePath("/tableau-de-bord"); return to("ok", "Prestation supprimée.");
}
