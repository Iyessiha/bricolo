import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Efface les fichiers d'un utilisateur (un dossier par identifiant dans chaque espace de stockage). */
export async function purgeFiles(uid: string) {
  const db = supabaseAdmin();
  for (const bucket of ["avatars", "realisations", "kyc"]) {
    try {
      const { data } = await db.storage.from(bucket).list(uid, { limit: 1000 });
      const paths = (data ?? []).filter((f) => f.name).map((f) => `${uid}/${f.name}`);
      if (paths.length) await db.storage.from(bucket).remove(paths);
    } catch { /* le compte doit pouvoir être supprimé même si un dossier est déjà vide */ }
  }
}

/** Effacement définitif : fichiers, puis compte (la fiche et les données liées partent en cascade). */
export async function purgeAccount(uid: string) {
  await purgeFiles(uid);
  return supabaseAdmin().auth.admin.deleteUser(uid);
}
