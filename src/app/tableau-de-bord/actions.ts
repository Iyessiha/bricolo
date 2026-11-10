"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyReviewRequest } from "@/lib/email-flows";
import { supabaseServer } from "@/lib/supabase/server";
import { saveArtisanProfile, saveArtisanZones } from "@/lib/artisan-save";
import { composeHeadline, lines, priceLabel } from "@/lib/compose";
import sharp from "sharp";
import { coverProblem, shotProblem } from "@/lib/cover-rules";
import { cleanHours } from "@/lib/hours";

/** Formulaire « Modifier mon profil » du tableau de bord. */
export async function saveProfile(formData: FormData) {
  const r = await saveArtisanProfile(formData);
  if (!r.ok) redirect(`/tableau-de-bord?s=profil&erreur=${encodeURIComponent(r.error)}`);
  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord?s=profil&ok=1");
}

/** Onglet « Zones et horaires » : enregistre seulement les zones. */
export async function saveZones(formData: FormData) {
  const r = await saveArtisanZones(formData);
  if (!r.ok) redirect(`/tableau-de-bord?s=profil&p=zones&erreur=${encodeURIComponent(r.error)}`);
  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord?s=profil&p=zones&ok=1");
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
  const id = String(formData.get("id"));
  // La politique d'accès ne renvoie que les demandes de cet artisan.
  const { data: r } = await db.from("service_requests").select("id, artisan_id, client_email, status").eq("id", id).maybeSingle();
  await db.from("service_requests").update({ status: "answered" }).eq("id", id);
  // Demande traitée avec une adresse e-mail : le client reçoit un lien pour donner son avis (une seule fois par demande).
  if (r?.artisan_id && r.client_email && r.status === "new") {
    const { data: link } = await supabaseAdmin().from("review_links").insert({ artisan_id: r.artisan_id, request_id: r.id }).select("id").maybeSingle();
    if (link) after(() => notifyReviewRequest(link.id));
  }
  revalidatePath("/tableau-de-bord");
}

/** « Demander un avis » : crée un lien personnel à usage unique que l'artisan envoie à son client (WhatsApp, SMS…). */
export async function createReviewLink(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const c = await me();
  if (!c) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };
  const { data: a } = await c.db.from("artisans").select("status").eq("id", c.a.id).single();
  if (a?.status !== "approved") return { ok: false, error: "Votre profil doit être en ligne pour demander des avis." };
  const { data: link, error } = await supabaseAdmin().from("review_links").insert({ artisan_id: c.a.id }).select("token").single();
  if (error || !link) return { ok: false, error: /trop_de_liens/.test(error?.message ?? "") ? "Vous avez atteint la limite de 10 demandes d’avis par mois. Réessayez plus tard." : "Le lien n’a pas pu être créé. Réessayez." };
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return { ok: true, url: `${base}/avis/${link.token}` };
}

/** Réponse publique de l'artisan à un avis publié (une réponse par avis, modifiable). */
export async function replyToReview(formData: FormData) {
  const c = await me(); if (!c) redirect("/connexion");
  const id = String(formData.get("id") ?? "");
  const reply = String(formData.get("reply") ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
  if (/^[0-9a-f-]{36}$/i.test(id) && reply.length >= 2)
    await supabaseAdmin().from("reviews").update({ artisan_reply: reply, replied_at: new Date().toISOString() }).eq("id", id).eq("artisan_id", c.a.id).eq("status", "published");
  revalidatePath("/tableau-de-bord"); revalidatePath(`/artisan/${c.a.id}`);
  redirect("/tableau-de-bord?ok=1");
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
  if (error) redirect("/tableau-de-bord?s=profil&p=zones&erreur=" + encodeURIComponent("L’enregistrement a échoué. Réessayez."));
  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord?s=profil&p=zones&ok=1");
}

async function me() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: a } = await db.from("artisans").select("id, cover_url").eq("user_id", user.id).maybeSingle();
  return a ? { db, user, a } : null;
}
const okPath = (p: string, uid: string) => p.startsWith(`${uid}/`) && !p.includes("..") && p.length < 200;
/** Contrôle définitif côté serveur : un fichier envoyé en contournant le navigateur est supprimé s'il n'a pas le bon format. */
async function badFormat(db: Awaited<ReturnType<typeof supabaseServer>>, path: string, kind: "cover" | "shot"): Promise<string | null> {
  try {
    const { data } = await db.storage.from("realisations").download(path);
    if (!data) return "Fichier introuvable.";
    const m = await sharp(Buffer.from(await data.arrayBuffer())).metadata();
    const p = kind === "cover" ? coverProblem(m.width ?? 0, m.height ?? 0) : shotProblem(m.width ?? 0, m.height ?? 0);
    if (!p) return null;
    await db.storage.from("realisations").remove([path]);
    return p === "paysage" ? "Cette image n’a pas le bon format : la couverture doit être large et horizontale (idéalement 1600 × 600 px)." : "Cette image est trop petite pour rester nette.";
  } catch { await db.storage.from("realisations").remove([path]); return "Image illisible. Essayez-en une autre."; }
}
const keyOf = (url: string | null | undefined) => url?.split("/object/public/realisations/")[1] ?? null;

/** Photo de couverture (paysage) : le fichier est déjà dans le stockage public, on enregistre son adresse. */
export async function saveCover(path: string): Promise<{ ok: boolean; error?: string }> {
  const c = await me(); if (!c) return { ok: false, error: "Session expirée. Reconnectez-vous." };
  if (!okPath(path, c.user.id)) return { ok: false, error: "Fichier invalide." };
  const bad = await badFormat(c.db, path, "cover"); if (bad) return { ok: false, error: bad };
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
  const bad = await badFormat(c.db, path, "shot"); if (bad) return { ok: false, error: bad };
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

const svcTo = (kind: "ok" | "erreur", msg: string): never => redirect(`/tableau-de-bord?s=prestations&${kind}=${encodeURIComponent(msg)}`);
export async function addService(formData: FormData) {
  const c = await me(); if (!c) redirect("/connexion");
  const h = composeHeadline(String(formData.get("headline_rest") ?? ""));
  if (!h.ok) return svcTo("erreur", h.error);
  const { error } = await c.db.from("artisan_services").insert({ artisan_id: c.a.id, headline: h.value, price_label: priceLabel(formData), included: lines(formData.get("included"), 8), extras: lines(formData.get("extras"), 6) });
  if (error) return svcTo("erreur", /prestations_pleines/.test(error.message) ? "Le forfait gratuit permet 1 prestation. Passez au Forfait Pro pour en ajouter jusqu’à 10." : "La prestation n’a pas pu être ajoutée.");
  revalidatePath("/tableau-de-bord"); return svcTo("ok", "Prestation ajoutée.");
}
export async function updateService(formData: FormData) {
  const c = await me(); if (!c) redirect("/connexion");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return svcTo("erreur", "Prestation introuvable.");
  const h = composeHeadline(String(formData.get("headline_rest") ?? ""));
  if (!h.ok) return svcTo("erreur", h.error);
  const { error } = await c.db.from("artisan_services").update({ headline: h.value, price_label: priceLabel(formData), included: lines(formData.get("included"), 8), extras: lines(formData.get("extras"), 6) }).eq("id", id).eq("artisan_id", c.a.id);
  if (error) return svcTo("erreur", "La prestation n’a pas pu être modifiée.");
  revalidatePath("/tableau-de-bord"); revalidatePath(`/artisan/${c.a.id}`); return svcTo("ok", "Prestation modifiée.");
}
export async function removeService(formData: FormData) {
  const c = await me(); if (!c) redirect("/connexion");
  const id = String(formData.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) await c.db.from("artisan_services").delete().eq("id", id).eq("artisan_id", c.a.id);
  revalidatePath("/tableau-de-bord"); return svcTo("ok", "Prestation supprimée.");
}
