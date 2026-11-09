"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { isCountry } from "@/lib/countries";

export type LinkState = { ok: boolean; email?: string; error?: string; sentAt?: number } | null;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f-]{36}$/i;
const fail = (error: string): LinkState => ({ ok: false, error });
const reason = (e: { message?: string; code?: string }) =>
  /rate|seconds|limit/i.test(`${e.code ?? ""} ${e.message ?? ""}`)
    ? "Un lien vient d’être envoyé. Patientez une minute avant d’en demander un autre."
    : "L’envoi a échoué. Réessayez dans un instant.";

/** Inscription artisan : pays, activité et consentement sont enregistrés avec le compte, puis le lien est envoyé. */
export async function signupLink(_prev: LinkState, fd: FormData): Promise<LinkState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const pays = String(fd.get("pays") ?? "");
  const tradeId = String(fd.get("trade_id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!isCountry(pays)) return fail("Choisissez votre pays.");
  if (name.length < 2 || name.length > 80 || !UUID.test(tradeId)) return fail("Indiquez le nom de votre activité et votre métier.");
  if (!EMAIL.test(email)) return fail("Cette adresse e-mail n’est pas valide.");
  if (fd.get("accept") !== "on") return fail("Vous devez accepter les conditions pour continuer.");

  const db = await supabaseServer();
  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, emailRedirectTo: `${siteUrl()}/auth/callback`,
      data: { country_code: pays, business_name: name, trade_id: tradeId, terms_accepted_at: new Date().toISOString() },
    },
  });
  if (error) return fail(reason(error));
  return { ok: true, email, sentAt: Date.now() };
}

/** Connexion : envoie un lien à une adresse déjà inscrite (aucun nouveau compte n’est créé). */
export async function loginLink(_prev: LinkState, fd: FormData): Promise<LinkState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return fail("Cette adresse e-mail n’est pas valide.");
  const db = await supabaseServer();
  const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/auth/callback` } });
  // Réponse identique que le compte existe ou non, pour ne pas révéler qui est inscrit.
  if (error && /rate|seconds|limit/i.test(`${error.code ?? ""} ${error.message ?? ""}`)) return fail(reason(error));
  return { ok: true, email, sentAt: Date.now() };
}

export async function signOut() {
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect("/");
}
