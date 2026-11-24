import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { capFor, isPro, usedSlots } from "./boost";

type Admin = ReturnType<typeof supabaseAdmin>;
export const TRIAL_DAYS = 7;
export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
export const nextMonthStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

/** Boost recherche de 24 h offert chaque mois aux artisans Pro vérifiés. Un seul par mois civil (garanti par un index unique en base). */
export async function claimFreeBoost(db: Admin, artisanId: string, zoneId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: a } = await db.from("artisans").select("id, status, verified, trade_id, country_code").eq("id", artisanId).maybeSingle();
  if (!a || a.status !== "approved") return { ok: false, error: "Votre profil doit être en ligne." };
  if (!a.verified) return { ok: false, error: "Le boost offert est réservé aux profils dont l’identité est vérifiée." };
  if (!(await isPro(db, artisanId))) return { ok: false, error: "Le boost offert est inclus dans le Forfait Pro." };
  const [{ data: mine }, { count: kids }] = await Promise.all([
    db.from("artisan_zones").select("zone_id").eq("artisan_id", artisanId).eq("zone_id", zoneId).maybeSingle(),
    db.from("zones").select("id", { count: "exact", head: true }).eq("parent_id", zoneId),
  ]);
  if (!mine) return { ok: false, error: "Choisissez l’une de vos zones d’intervention." };
  if ((kids ?? 0) > 0) return { ok: false, error: "Le boost offert s’applique à un quartier, pas à une ville entière." };
  const now = new Date();
  const { data: same } = await db.from("boosts").select("id").eq("artisan_id", artisanId).in("type", ["recherche", "cible"]).eq("zone_id", zoneId).eq("status", "active").gt("ends_at", now.toISOString()).limit(1);
  if (same?.length) return { ok: false, error: "Vous avez déjà un boost actif dans cette zone." };
  const used = await usedSlots(db, { type: "recherche", tradeId: a.trade_id, zoneId, country: a.country_code });
  if (used >= capFor("recherche")) return { ok: false, error: "Toutes les places de cette zone sont prises pour le moment. Choisissez une autre zone ou réessayez plus tard." };
  const { error } = await db.from("boosts").insert({
    artisan_id: artisanId, type: "recherche", zone_id: zoneId, duration_hours: 24, amount: 0, status: "active",
    starts_at: now.toISOString(), ends_at: new Date(now.getTime() + 24 * 36e5).toISOString(), free_period: monthKey(now),
  });
  if (error) return { ok: false, error: error.code === "23505" ? "Vous avez déjà utilisé votre boost offert ce mois-ci." : "Activation impossible. Réessayez." };
  return { ok: true };
}

/** Le boost offert du mois a-t-il déjà été pris ? */
export async function freeBoostUsed(db: Admin, artisanId: string) {
  const { data } = await db.from("boosts").select("id, ends_at").eq("artisan_id", artisanId).eq("free_period", monthKey()).maybeSingle();
  return data;
}

/** Essai gratuit du Forfait Pro : une seule fois par artisan et par pièce d'identité, après vérification. */
export async function trialStatus(db: Admin, artisanId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: a } = await db.from("artisans").select("id, status, verified").eq("id", artisanId).maybeSingle();
  if (!a || a.status !== "approved") return { ok: false, reason: "Votre profil doit être en ligne." };
  if (!a.verified) return { ok: false, reason: "L’essai est ouvert aux profils dont l’identité est vérifiée." };
  if (await isPro(db, artisanId)) return { ok: false, reason: "Vous avez déjà un Forfait Pro actif." };
  const { data: used } = await db.from("subscriptions").select("id").eq("artisan_id", artisanId).eq("trial", true).limit(1);
  if (used?.length) return { ok: false, reason: "Vous avez déjà profité de l’essai gratuit." };
  const { data: id } = await db.from("artisan_identity").select("doc_hash").eq("artisan_id", artisanId).maybeSingle();
  if (id?.doc_hash) {
    const { data: twins } = await db.from("artisan_identity").select("artisan_id").eq("doc_hash", id.doc_hash).neq("artisan_id", artisanId);
    const ids = (twins ?? []).map((t) => t.artisan_id);
    if (ids.length) {
      const { data: t } = await db.from("subscriptions").select("id").in("artisan_id", ids).eq("trial", true).limit(1);
      if (t?.length) return { ok: false, reason: "L’essai gratuit a déjà été utilisé avec cette pièce d’identité." };
    }
  }
  return { ok: true };
}

export async function startTrial(db: Admin, artisanId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const st = await trialStatus(db, artisanId);
  if (!st.ok) return { ok: false, error: st.reason };
  const now = new Date();
  const { error } = await db.from("subscriptions").insert({
    artisan_id: artisanId, months: 1, days: TRIAL_DAYS, amount: 0, status: "active", trial: true,
    starts_at: now.toISOString(), ends_at: new Date(now.getTime() + TRIAL_DAYS * 864e5).toISOString(),
  });
  if (error) return { ok: false, error: error.code === "23505" ? "Vous avez déjà profité de l’essai gratuit." : "Activation impossible. Réessayez." };
  return { ok: true };
}

/** Ce que le Forfait Pro a apporté depuis son début : vues, appels, messages WhatsApp, demandes. */
export async function proRecap(db: Admin, artisanId: string, since: string) {
  const count = (type: string) => db.from("events").select("id", { count: "exact", head: true }).eq("artisan_id", artisanId).eq("type", type).gte("created_at", since);
  const [v, c, w, r] = await Promise.all([count("view"), count("call"), count("whatsapp"), count("request")]);
  return { vues: v.count ?? 0, appels: c.count ?? 0, wa: w.count ?? 0, demandes: r.count ?? 0 };
}

const UTC_OFFSET: Record<string, number> = { bj: 1, ne: 1 }; // les autres pays de la zone sont à l'heure de Greenwich
export type DetailedStats = {
  days: { d: string; v: number }[]; views: number; contacts: number; rate: number;
  sources: { key: string; label: string; n: number }[]; bestDay: string | null; bestHours: string | null; since: string;
};
const SRC_LABEL: Record<string, string> = { recherche: "Recherche", accueil: "Page d’accueil", qr: "QR code (affiche, carte)", wa: "Partage WhatsApp", direct: "Lien direct ou autre" };
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Statistiques détaillées (Forfait Pro) : vues par jour et par provenance, taux de contact, jour et heures où les clients appellent le plus. */
export async function detailedStats(db: Admin, artisanId: string, country: string, days = 30): Promise<DetailedStats> {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today.getTime() - (days - 1) * 864e5);
  const { data } = await db.from("events").select("type, source, created_at").eq("artisan_id", artisanId).gte("created_at", since.toISOString()).limit(8000);
  const off = (UTC_OFFSET[country] ?? 0) * 36e5;
  const perDay: { d: string; v: number }[] = Array.from({ length: days }, (_, i) => ({ d: new Date(since.getTime() + i * 864e5).toISOString().slice(0, 10), v: 0 }));
  const idx = new Map(perDay.map((x, i) => [x.d, i]));
  const src = new Map<string, number>(); const wd = Array(7).fill(0), hr = Array(24).fill(0);
  let views = 0, contacts = 0;
  for (const e of data ?? []) {
    if (e.type === "view") {
      views++; const i = idx.get(String(e.created_at).slice(0, 10)); if (i !== undefined) perDay[i].v++;
      const k = e.source && SRC_LABEL[e.source] ? e.source : "direct"; src.set(k, (src.get(k) ?? 0) + 1);
    } else if (e.type === "call" || e.type === "whatsapp") {
      contacts++; const t = new Date(new Date(e.created_at).getTime() + off); wd[t.getUTCDay()]++; hr[t.getUTCHours()]++;
    }
  }
  const sources = [...src.entries()].map(([key, n]) => ({ key, label: SRC_LABEL[key], n })).sort((a, b) => b.n - a.n);
  const maxDay = Math.max(...wd);
  // Meilleure plage de 3 heures consécutives
  let bestStart = 0, bestSum = -1;
  for (let h = 0; h < 22; h++) { const sum = hr[h] + hr[h + 1] + hr[h + 2]; if (sum > bestSum) { bestSum = sum; bestStart = h; } }
  return {
    days: perDay, views, contacts, rate: views ? Math.round((contacts / views) * 100) : 0, sources, since: since.toISOString(),
    bestDay: contacts >= 5 && maxDay > 0 ? WEEKDAYS[wd.indexOf(maxDay)] : null,
    bestHours: contacts >= 5 && bestSum > 0 ? `${bestStart} h – ${bestStart + 3} h` : null,
  };
}
