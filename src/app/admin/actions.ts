"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { notifyBadge, notifyDecision } from "@/lib/email-flows";
import { supabaseServer } from "@/lib/supabase/server";

async function admin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" ? db : null;
}
const back = (path: string, kind: "ok" | "erreur", msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);

const REASONS: Record<string, string> = {
  illisible: "La pièce d’identité est illisible ou incomplète.",
  nom: "Le nom sur la pièce ne correspond pas à celui du profil.",
  selfie: "Le selfie ne montre pas clairement votre visage avec la pièce.",
  expiree: "La pièce d’identité est expirée.",
  photo: "La photo de profil n’est pas conforme (visage non visible).",
  autre: "",
};

/** Décision sur le dossier : valide l'identité et le profil ensemble, ou refuse avec un motif lisible par l'artisan. */
export async function reviewDossier(formData: FormData) {
  const db = await admin();
  if (!db) redirect("/");
  const id = String(formData.get("id"));
  const page = `/admin/artisan/${id}`;
  const approve = formData.get("decision") === "approve";
  let reason: string | null = null;
  if (!approve) {
    const preset = String(formData.get("preset") ?? "autre");
    const detail = String(formData.get("detail") ?? "").trim().slice(0, 300);
    reason = [REASONS[preset] ?? "", detail].filter(Boolean).join(" ");
    if (reason.length < 5) back(page, "erreur", "Indiquez un motif de refus (liste ou précisions).");
  }
  const { error } = await db.rpc("review_artisan", { p_artisan: id, p_approve: approve, p_reason: reason });
  if (error) back(page, "erreur", /identite_requise/.test(error.message) ? "Aucune pièce d’identité à valider pour ce profil." : /photo_requise/.test(error.message) ? "Ce profil n’a pas de photo." : "La décision n’a pas pu être enregistrée.");
  after(() => notifyDecision(id, approve, reason ?? undefined));
  revalidatePath("/admin");
  back("/admin", "ok", approve ? "Profil validé et mis en ligne." : "Dossier refusé, l’artisan est prévenu.");
}

export async function reviewDiplomaAction(formData: FormData) {
  const db = await admin();
  if (!db) redirect("/");
  const id = String(formData.get("artisan"));
  const page = `/admin/artisan/${id}`;
  const approve = formData.get("decision") === "approve";
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;
  if (!approve && (!reason || reason.length < 5)) back(page, "erreur", "Indiquez pourquoi le diplôme est refusé.");
  const { error } = await db.rpc("review_diploma", { p_diploma: String(formData.get("diploma")), p_approve: approve, p_reason: reason });
  if (error) back(page, "erreur", "La décision n’a pas pu être enregistrée.");
  revalidatePath(page);
  back(page, "ok", approve ? "Diplôme vérifié." : "Diplôme refusé.");
}

export async function verifyArtisan(formData: FormData) {
  const db = await admin();
  if (!db) return;
  const id = String(formData.get("id"));
  await db.from("artisans").update({ verified: true, verification_requested: false }).eq("id", id);
  after(() => notifyBadge(id));
  revalidatePath("/admin");
}

export async function savePrices(formData: FormData) {
  const db = await admin();
  if (!db) return;
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("p:")) continue;
    const amount = Math.max(0, parseInt(String(value), 10) || 0);
    await db.from("price_grid").update({ amount }).eq("id", key.slice(2));
  }
  revalidatePath("/admin");
  revalidatePath("/boosts");
  back("/admin?vue=prix", "ok", "Prix enregistrés.");
}
