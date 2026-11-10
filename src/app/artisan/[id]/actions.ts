"use server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { notifyServiceRequest } from "@/lib/email-flows";
import { headers } from "next/headers";
import { domainCanReceiveMail, ipHash } from "@/lib/email-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Numéro saisi (local ou +indicatif) → chiffres avec indicatif pays, ou null si invalide. */
function normalizePhone(raw: string, prefix: string): string | null {
  if (!raw) return null;
  const intl = /^\s*(\+|00)/.test(raw);
  let d = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("00")) d = d.slice(2);
  if (!intl) d = prefix.replace(/\D/g, "") + d;
  return d.length >= 9 && d.length <= 15 ? d : null;
}

export async function sendRequest(artisanId: string, formData: FormData) {
  const db = supabaseAdmin();
  const { data: a } = await db.from("artisans").select("country_code, trade_id").eq("id", artisanId).eq("status", "approved").single();
  if (!a) redirect("/resultats");
  const email = String(formData.get("email") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (formData.get("website")) redirect(`/artisan/${artisanId}?envoye=1`); // robot
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const { data: country } = await db.from("countries").select("phone_prefix").eq("code", a.country_code).maybeSingle();
  const phone = normalizePhone(rawPhone, country?.phone_prefix ?? "");
  // Au moins un moyen de répondre : e-mail ou numéro valide.
  if (description.length < 5 || (!emailOk && !phone) || (email && !emailOk) || (rawPhone && !phone)) redirect(`/artisan/${artisanId}?erreur=contact`);
  if (emailOk && !(await domainCanReceiveMail(email))) redirect(`/artisan/${artisanId}?erreur=email`);
  const { data: req, error } = await db.from("service_requests").insert({
    artisan_id: artisanId, country_code: a.country_code, trade_id: a.trade_id,
    zone_id: String(formData.get("zone") || "") || null, description: description.slice(0, 1000),
    urgent: formData.get("urgent") === "on", client_name: String(formData.get("name") ?? "").slice(0, 80) || null, client_email: emailOk ? email : null, client_phone: phone, ip_hash: await ipHash(await headers()),
  }).select("id").single();
  if (error) redirect(`/artisan/${artisanId}?erreur=${/demande_deja_envoyee/.test(error.message) ? "doublon" : "limite"}`);
  if (req) after(() => notifyServiceRequest(req.id));
  await db.from("events").insert({ artisan_id: artisanId, type: "request" });
  redirect(`/artisan/${artisanId}?envoye=1`);
}
