"use server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Dépôt d'un avis par un client, via un lien personnel à usage unique. L'avis est ensuite modéré par l'équipe. */
export async function submitReview(token: string, formData: FormData) {
  const back = (k: string): never => redirect(`/avis/${token}?${k}`);
  if (formData.get("website")) redirect(`/avis/${token}?merci=1`); // robot
  if (!/^[0-9a-f]{32}$/.test(token)) redirect("/");
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  const rating = parseInt(String(formData.get("rating") ?? ""), 10);
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 600);
  if (name.length < 2 || name.length > 60 || !(rating >= 1 && rating <= 5)) back("erreur=champs");

  const db = supabaseAdmin();
  // Le lien ne sert qu'une fois : on le « consomme » d'abord, de façon atomique.
  const { data: link } = await db.from("review_links").update({ used_at: new Date().toISOString() })
    .eq("token", token).is("used_at", null).gt("expires_at", new Date().toISOString()).select("id, artisan_id, request_id").maybeSingle();
  if (!link) back("erreur=lien");
  const l = link!;
  const { data: rev, error } = await db.from("reviews").insert({
    artisan_id: l.artisan_id, author_name: name, rating, comment: comment || null, status: "pending", verified_by: l.request_id ? "demande" : "artisan",
  }).select("id").single();
  if (error || !rev) {
    await db.from("review_links").update({ used_at: null }).eq("id", l.id); // on rend le lien : l'avis n'a pas été enregistré
    back("erreur=envoi");
  }
  await db.from("review_links").update({ review_id: rev!.id }).eq("id", l.id);
  redirect(`/avis/${token}?merci=1`);
}
