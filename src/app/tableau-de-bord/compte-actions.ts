"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { tooMany, visitorIp } from "@/lib/rate-limit";

export type DeleteState = { ok: false; error: string } | null;

/** Efface les fichiers d'un utilisateur (un dossier par identifiant dans chaque espace de stockage). */
async function purgeFiles(uid: string) {
  const db = supabaseAdmin();
  for (const bucket of ["avatars", "realisations", "kyc"]) {
    try {
      const { data } = await db.storage.from(bucket).list(uid, { limit: 1000 });
      const paths = (data ?? []).filter((f) => f.name).map((f) => `${uid}/${f.name}`);
      if (paths.length) await db.storage.from(bucket).remove(paths);
    } catch { /* on continue : le compte doit pouvoir être supprimé même si un dossier est déjà vide */ }
  }
}

/** « Supprimer mon compte » : mot de passe + mot SUPPRIMER, puis effacement définitif du compte, de la fiche, des photos et des pièces d'identité. */
export async function deleteMyAccount(_prev: DeleteState, fd: FormData): Promise<DeleteState> {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user || !user.email) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };
  if (tooMany(`delete:${user.id}`, 5, 10 * 60_000) || tooMany(`delete:${await visitorIp()}`, 10, 10 * 60_000)) return { ok: false, error: "Trop de tentatives. Patientez quelques minutes." };
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "SUPPRIMER") return { ok: false, error: "Tapez le mot SUPPRIMER pour confirmer." };
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role === "admin") return { ok: false, error: "Un compte administrateur ne peut pas être supprimé ici." };
  // Nouvelle saisie du mot de passe : une session laissée ouverte sur un téléphone ne suffit pas à tout effacer.
  const { error: pw } = await supabaseAdmin().auth.signInWithPassword({ email: user.email, password: String(fd.get("password") ?? "") });
  if (pw) return { ok: false, error: "Mot de passe incorrect." };
  await purgeFiles(user.id);
  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: "La suppression a échoué. Écrivez-nous depuis « Contacter Bricolo »." };
  await db.auth.signOut();
  redirect("/?compte=supprime");
}
