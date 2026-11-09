"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { saveArtisanProfile } from "@/lib/artisan-save";

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
