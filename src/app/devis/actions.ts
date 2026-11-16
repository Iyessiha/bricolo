"use server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import { getCountry } from "@/lib/country";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { domainCanReceiveMail, ipHash } from "@/lib/email-guard";
import { normalizePhone } from "@/lib/phone";
import { tooMany, visitorIp } from "@/lib/rate-limit";
import { turnstileOk } from "@/lib/turnstile";
import { notifyQuote } from "@/lib/email-flows";

const MAX = 3;
const UUID = /^[0-9a-f-]{36}$/i;

/** Une seule demande, envoyée à jusqu'à 3 artisans vérifiés du métier et de la zone, choisis au hasard parmi les premiers résultats (aucun passe-droit pour les boosts). */
export async function sendQuote(formData: FormData) {
  const trade = String(formData.get("metier") ?? ""), zone = String(formData.get("zone") ?? "");
  const back = (q: string): never => redirect(`/devis?metier=${encodeURIComponent(trade)}&zone=${encodeURIComponent(zone)}&${q}`);
  if (formData.get("website")) redirect("/devis?envoye=1"); // robot
  const ip = await visitorIp();
  if (tooMany(`quote:${ip}`, 4, 10 * 60_000)) back("erreur=limite");
  if (!(await turnstileOk(formData, ip))) back("erreur=robot");

  const email = String(formData.get("email") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const country = await getCountry();
  const db = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("countries").select("phone_prefix").eq("code", country).maybeSingle();
  const phone = normalizePhone(rawPhone, c?.phone_prefix ?? "");
  if (!UUID.test(trade) || !UUID.test(zone)) back("erreur=choix");
  if (description.length < 5 || (!emailOk && !phone) || (email && !emailOk) || (rawPhone && !phone)) back("erreur=contact");
  if (emailOk && !(await domainCanReceiveMail(email))) back("erreur=email");

  const { data: rows } = await db.rpc("search_artisans", { p_country: country, p_trade: trade, p_zone: zone, p_verified: true, p_open: false, p_urgent: formData.get("urgent") === "on", p_seed: String(Date.now()) });
  const pool = ((rows ?? []) as { id: string }[]).slice(0, 12).map((r) => r.id);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const chosen = pool.slice(0, MAX);
  if (!chosen.length) back("erreur=aucun");

  const hash = await ipHash(await headers());
  const common = { country_code: country, trade_id: trade, zone_id: zone, description: description.slice(0, 1000), urgent: formData.get("urgent") === "on", client_name: String(formData.get("name") ?? "").slice(0, 80) || null, client_email: emailOk ? email : null, client_phone: phone, ip_hash: hash };
  const ids: string[] = []; let limited = false;
  for (const artisan_id of chosen) {
    const { data: req, error } = await admin.from("service_requests").insert({ ...common, artisan_id }).select("id").single();
    if (req) { ids.push(req.id); await admin.from("events").insert({ artisan_id, type: "request" }); }
    else if (/trop_de_demandes/.test(error?.message ?? "")) { limited = true; break; }
    // « demande_deja_envoyee » : cet artisan a déjà reçu une demande de cette personne depuis moins d'une heure, on passe au suivant
  }
  if (!ids.length) back(`erreur=${limited ? "limite" : "doublon"}`);
  after(() => notifyQuote(ids));
  redirect(`/devis?envoye=${ids.length}`);
}
