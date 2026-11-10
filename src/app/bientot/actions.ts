"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { domainCanReceiveMail, ipHash } from "@/lib/email-guard";
import { WAIT_COUNTRIES } from "@/lib/waitlist";


/** Inscription à la liste d'attente : robot écarté, adresse contrôlée, cinq inscriptions par heure et par connexion au plus. */
export async function joinWaitlist(f: FormData) {
  const back = (q: string): never => redirect(`/bientot?${q}`);
  if (f.get("website")) redirect("/bientot?merci=1"); // robot : on fait comme si
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const country = String(f.get("country") ?? "");
  const role = String(f.get("role") ?? "");
  const trade = String(f.get("trade") ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || null;
  const city = String(f.get("city") ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) back("erreur=email");
  if (!WAIT_COUNTRIES.some(([c]) => c === country) || !["artisan", "client"].includes(role)) back("erreur=champs");
  if (f.get("accord") !== "on") back("erreur=accord");
  if (!(await domainCanReceiveMail(email))) back("erreur=email");

  const db = supabaseAdmin();
  const ip = await ipHash(await headers());
  if (ip) {
    const { count } = await db.from("waitlist").select("id", { count: "exact", head: true }).eq("ip_hash", ip).gt("created_at", new Date(Date.now() - 36e5).toISOString());
    if ((count ?? 0) >= 5) back("erreur=trop");
  }
  const { error } = await db.from("waitlist").insert({ email, country, role, trade: role === "artisan" ? trade : null, city, ip_hash: ip });
  if (error && error.code !== "23505") back("erreur=envoi"); // 23505 : déjà inscrit, on remercie quand même
  redirect(`/bientot?merci=1&pays=${country}`);
}
