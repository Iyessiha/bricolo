"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { saveArtisanProfile } from "@/lib/artisan-save";
import { notifyProfileReceived } from "@/lib/email-flows";
import { documentHash } from "@/lib/email-guard";

export type StepState = { ok: boolean; error?: string } | null;

/** Étape 1 du tunnel : la fiche. */
export async function saveProfileStep(_prev: StepState, fd: FormData): Promise<StepState> {
  const r = await saveArtisanProfile(fd);
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/activation");
  return { ok: true };
}

/** Étape 2 : la photo est déjà dans le stockage public ; on enregistre son adresse. */
export async function savePhoto(path: string): Promise<{ ok: boolean; error?: string }> {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) return { ok: false, error: "Fichier invalide." };
  const { data } = db.storage.from("avatars").getPublicUrl(path);
  const { error } = await db.from("artisans").update({ photo_url: data.publicUrl }).eq("user_id", user.id);
  if (error) return { ok: false, error: "L’enregistrement de la photo a échoué." };
  revalidatePath("/activation");
  return { ok: true };
}

export type Dossier = {
  docType: string; docNumber: string; front: string; back?: string | null; selfie: string;
  diploma?: { title: string; path: string } | null;
};

/** Étape finale : envoie le dossier (pièce d'identité, selfie, diplôme facultatif) à l'administration. */
export async function submitDossier(d: Dossier): Promise<{ ok: boolean; error?: string }> {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };

  // Fichiers d'une éventuelle soumission précédente (dossier refusé) : on les supprime après le nouvel envoi.
  const { data: old } = await db.from("artisan_identity").select("front_path, back_path, selfie_path").eq("artisan_id", (await db.from("artisans").select("id").eq("user_id", user.id).maybeSingle()).data?.id ?? "").maybeSingle();

  const dh = documentHash(d.docType, d.docNumber ?? "");
  if (!dh) return { ok: false, error: "Le numéro de la pièce est invalide. Recopiez-le tel qu’il est écrit sur le document." };
  const { error } = await db.rpc("submit_identity", { p_doc_type: d.docType, p_front: d.front, p_back: d.back ?? null, p_selfie: d.selfie, p_doc_hash: dh.hash, p_doc_last4: dh.last4 });
  if (error) {
    const m = error.message;
    return { ok: false, error: /piece_deja_utilisee/.test(m) ? "Cette pièce d’identité est déjà liée à un autre compte. Si c’est une erreur, contactez-nous." : /numero_invalide/.test(m) ? "Le numéro de la pièce est invalide." : /photo_requise/.test(m) ? "Ajoutez d’abord votre photo de profil." : /deja_verifie/.test(m) ? "Votre identité est déjà vérifiée." : /profil_requis/.test(m) ? "Complétez d’abord votre profil." : "L’envoi du dossier a échoué. Réessayez." };
  }
  if (d.diploma?.title.trim()) await db.rpc("submit_diploma", { p_title: d.diploma.title, p_path: d.diploma.path });
  if (old) {
    const keep = new Set([d.front, d.back, d.selfie]);
    const stale = [old.front_path, old.back_path, old.selfie_path].filter((p): p is string => !!p && !keep.has(p));
    if (stale.length) await db.storage.from("kyc").remove(stale);
  }
  const { data: a } = await db.from("artisans").select("id").eq("user_id", user.id).maybeSingle();
  if (a?.id) { const id = a.id as string; after(() => notifyProfileReceived(id)); }
  revalidatePath("/tableau-de-bord");
  return { ok: true };
}
