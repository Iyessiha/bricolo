"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { isCountry } from "@/lib/countries";

/** Envoie le lien de connexion par e-mail. À l’inscription, le pays choisi est enregistré avec le compte. */
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const pays = String(formData.get("pays") ?? "");
  const back = pays ? "/inscription" : "/connexion";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect(`${back}?erreur=email${pays ? `&pays=${pays}` : ""}`);
  const db = await supabaseServer();
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${siteUrl()}/auth/callback`, data: isCountry(pays) ? { country_code: pays } : {} },
  });
  if (error) redirect(`${back}?erreur=envoi${pays ? `&pays=${pays}` : ""}`);
  redirect(`${back}?envoye=1&email=${encodeURIComponent(email)}${pays ? `&pays=${pays}` : ""}`);
}

export async function signOut() {
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect("/");
}
