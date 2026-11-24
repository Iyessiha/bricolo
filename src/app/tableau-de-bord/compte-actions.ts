"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { tooMany, visitorIp } from "@/lib/rate-limit";
import { purgeAccount } from "@/lib/account-purge";
import { sendEmail } from "@/lib/email";
import { accountDeletionScheduled } from "@/lib/email-templates";

const GRACE_DAYS = 7;

export type DeleteState = { ok: false; error: string } | null;

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
  const { data: a } = await supabaseAdmin().from("artisans").select("id, name, status, deletion_at").eq("user_id", user.id).maybeSingle();
  if (!a) {
    // Compte sans fiche artisan : rien à protéger, effacement immédiat.
    const { error } = await purgeAccount(user.id);
    if (error) return { ok: false, error: "La suppression a échoué. Écrivez-nous depuis « Contacter Bricolo »." };
    await db.auth.signOut();
    redirect("/?compte=supprime");
  }
  if (!a.deletion_at) {
    const at = new Date(Date.now() + GRACE_DAYS * 864e5);
    const { error } = await supabaseAdmin().from("artisans").update({
      deletion_at: at.toISOString(), status_before_deletion: a.status, status: "suspended", suspended_at: new Date().toISOString(), reject_reason: "Suppression du compte demandée par l’artisan",
    }).eq("id", a.id);
    if (error) return { ok: false, error: "La demande a échoué. Écrivez-nous depuis « Contacter Bricolo »." };
    await sendEmail({ to: user.email, ...accountDeletionScheduled(a.name, at.toISOString()) }).catch(() => {});
  }
  redirect("/tableau-de-bord?s=compte");
}

/** Annule une suppression en attente : la fiche retrouve son état d'avant. */
export async function cancelAccountDeletion() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const admin = supabaseAdmin();
  const { data: a } = await admin.from("artisans").select("id, status_before_deletion, deletion_at").eq("user_id", user.id).maybeSingle();
  if (a?.deletion_at) {
    await admin.from("artisans").update({ status: a.status_before_deletion ?? "approved", suspended_at: null, reject_reason: null, deletion_at: null, status_before_deletion: null }).eq("id", a.id);
  }
  redirect("/tableau-de-bord?s=compte");
}
