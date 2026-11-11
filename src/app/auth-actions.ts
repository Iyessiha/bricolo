"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { isCountry } from "@/lib/countries";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifySignupFailure } from "@/lib/email-flows";
import { domainCanReceiveMail, isDisposableError } from "@/lib/email-guard";

export type LinkState = { ok: boolean; email?: string; error?: string; sentAt?: number } | null;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f-]{36}$/i;
const fail = (error: string): LinkState => ({ ok: false, error });

const PASSWORD_RULE = "Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre.";
const strong = (p: string) => p.length >= 8 && p.length <= 72 && /[A-Za-z]/.test(p) && /\d/.test(p);
const limited = (e: { message?: string; code?: string }) => /rate|seconds|limit/i.test(`${e.code ?? ""} ${e.message ?? ""}`);

/** Inscription artisan : pays, activité, consentement et mot de passe. Un seul e-mail part (confirmation de l'adresse) ; aucune connexion ne passe ensuite par e-mail. */
export async function signupAccount(_prev: LinkState, fd: FormData): Promise<LinkState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const pays = String(fd.get("pays") ?? "");
  const tradeId = String(fd.get("trade_id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const type = fd.get("account_type") === "entreprise" ? "entreprise" : "individuel";
  const registration = String(fd.get("registration") ?? "").trim().slice(0, 60);
  if (!isCountry(pays)) return fail("Choisissez votre pays.");
  if (name.length < 2 || name.length > 80 || !UUID.test(tradeId)) return fail("Indiquez le nom de votre activité et votre métier.");
  if (!EMAIL.test(email)) return fail("Cette adresse e-mail n’est pas valide.");
  if (!strong(password)) return fail(PASSWORD_RULE);
  if (password !== String(fd.get("password2") ?? "")) return fail("Les deux mots de passe ne sont pas identiques.");
  if (fd.get("accept") !== "on") return fail("Vous devez accepter les conditions pour continuer.");
  if (fd.get("charter") !== "on") return fail("Vous devez accepter la charte de l’artisan pour continuer.");
  if (fd.get("docs_ack") !== "on") return fail("Confirmez que vous avez compris que votre identité sera vérifiée.");
  if (type === "entreprise" && fd.get("authorized") !== "on") return fail("Confirmez que vous êtes habilité(e) à créer ce profil au nom de l’entreprise.");

  if (String(fd.get("website") ?? "") !== "") return { ok: true, email, sentAt: Date.now() }; // piège à robots : champ invisible rempli
  if (!(await domainCanReceiveMail(email))) return fail("Cette adresse e-mail ne semble pas exister. Vérifiez-la.");

  const db = await supabaseServer();
  const { data, error } = await db.auth.signUp({
    email, password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/activation`,
      data: { country_code: pays, business_name: name, trade_id: tradeId, account_type: type, company_registration: registration, terms_accepted_at: new Date().toISOString(), charter_accepted_at: new Date().toISOString() },
    },
  });
  if (error) {
    if (isDisposableError(error.message)) return fail("Les adresses e-mail temporaires ne sont pas acceptées. Utilisez votre adresse personnelle.");
    if (/already|registered/i.test(error.message)) return fail("Cette adresse a déjà un compte. Connectez-vous, ou utilisez « Mot de passe oublié ».");
    if (/password/i.test(error.message)) return fail(PASSWORD_RULE);
    const kind = limited(error) ? "limite" : /smtp|mail|email|535|sending|confirmation/i.test(`${error.code ?? ""} ${error.message}`) ? "envoi_email" : "autre";
    await supabaseAdmin().from("signup_failures").insert({ email, country_code: pays, kind, message: `${error.code ?? ""} ${error.message}`.trim().slice(0, 500) }).then(() => {}, () => {});
    await notifySignupFailure({ email, kind: kind === "envoi_email" ? "Envoi de l'e-mail de confirmation" : kind === "limite" ? "Limite d'envoi atteinte" : "Erreur inconnue", message: error.message });
    return fail(limited(error) ? "Trop de demandes pour le moment. Réessayez dans quelques minutes." : "L’inscription a échoué. Réessayez dans un instant.");
  }
  if (data.session) redirect("/activation"); // confirmation d'e-mail désactivée dans Supabase : on continue directement
  return { ok: true, email, sentAt: Date.now() };
}

/** Renvoie l'e-mail de confirmation d'adresse (limité à un envoi par minute côté interface et côté Supabase). */
export async function resendConfirmation(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!EMAIL.test(email)) return { ok: false, error: "Adresse e-mail invalide." };
  const db = await supabaseServer();
  const { error } = await db.auth.resend({ type: "signup", email: email.trim().toLowerCase(), options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/activation` } });
  if (error && limited(error)) return { ok: false, error: "Un e-mail vient d’être envoyé. Patientez une minute." };
  return { ok: true };
}

/** Mot de passe oublié. Réponse identique que le compte existe ou non ; Supabase n'envoie rien pour une adresse inconnue. */
export async function forgotPassword(_prev: LinkState, fd: FormData): Promise<LinkState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return fail("Cette adresse e-mail n’est pas valide.");
  const db = await supabaseServer();
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/nouveau-mot-de-passe` });
  if (error && limited(error)) return fail("Un e-mail vient d’être envoyé. Patientez une minute avant d’en demander un autre.");
  return { ok: true, email, sentAt: Date.now() };
}

/** Définit un nouveau mot de passe (utilisateur connecté via le lien de réinitialisation, ou depuis son espace). */
export async function setNewPassword(_prev: LinkState, fd: FormData): Promise<LinkState> {
  const password = String(fd.get("password") ?? "");
  if (!strong(password)) return fail(PASSWORD_RULE);
  if (password !== String(fd.get("password2") ?? "")) return fail("Les deux mots de passe ne sont pas identiques.");
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return fail("Ce lien a expiré. Demandez un nouveau lien depuis « Mot de passe oublié ».");
  const { error } = await db.auth.updateUser({ password });
  if (error) return fail(/same|different/i.test(error.message) ? "Choisissez un mot de passe différent de l’ancien." : PASSWORD_RULE);
  const { data: p } = await db.from("profiles").select("role").eq("id", user.id).single();
  redirect(p?.role === "admin" ? "/admin?ok=Mot+de+passe+modifié" : "/tableau-de-bord?ok=1");
}

/** Connexion par mot de passe (comptes de démonstration et comptes qui en ont un). Message d'erreur identique quel que soit le motif. */
export async function loginPassword(_prev: LinkState, fd: FormData): Promise<LinkState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!EMAIL.test(email) || !password) return fail("Adresse e-mail ou mot de passe incorrect.");
  const db = await supabaseServer();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return fail(/rate|limit/i.test(`${error.code ?? ""} ${error.message ?? ""}`) ? "Trop d’essais. Patientez quelques minutes." : "Adresse e-mail ou mot de passe incorrect.");
  const { data: { user } } = await db.auth.getUser();
  const { data: p } = user ? await db.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  redirect(p?.role === "admin" ? "/admin" : "/tableau-de-bord");
}

export async function signOut() {
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect("/");
}
