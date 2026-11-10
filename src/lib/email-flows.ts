import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { sendOnce, sendBatch, marketingHeaders, unsubPage, type Msg } from "./email";
import * as T from "./email-templates";
import { BOOST_TYPES, DURATIONS } from "./format";
import { siteUrl } from "./env";

/** Un e-mail raté ne doit jamais faire échouer l'action de l'utilisateur. */
async function safe<R>(fn: () => Promise<R>): Promise<R | undefined> {
  try { return await fn(); } catch (e) { console.error("[email]", e instanceof Error ? e.message : e); }
}

type Contact = { artisanId: string; name: string; userId: string; email: string; optOut: boolean };
async function contactOf(artisanId: string): Promise<Contact | null> {
  const { data } = await supabaseAdmin().from("artisans")
    .select("id, name, user_id, profile:profiles(email, marketing_opt_out)").eq("id", artisanId).maybeSingle();
  const pr = (data as any)?.profile;
  if (!data || !pr?.email) return null;
  return { artisanId: data.id, name: data.name, userId: data.user_id, email: pr.email, optOut: pr.marketing_opt_out };
}

const mail = (to: string, m: { subject: string; html: string; text: string }, extra: Partial<Msg> = {}): Msg => ({ to, ...m, ...extra });
const mk = (userId: string): Partial<Msg> => ({ headers: marketingHeaders(userId) });

/* ───────── Déclenchés par une action ───────── */
export const notifyProfileReceived = (artisanId: string) => safe(async () => {
  const c = await contactOf(artisanId); if (!c) return;
  await sendOnce("profile_received", c.artisanId, mail(c.email, T.profileReceived(c.name)));
});

export const notifyDecision = (artisanId: string, approved: boolean, reason?: string) => safe(async () => {
  const c = await contactOf(artisanId); if (!c) return;
  await sendOnce(approved ? "profile_approved" : "profile_rejected", `${c.artisanId}:${Date.now()}`, mail(c.email, T.profileDecision(c.name, approved, c.artisanId, reason)));
});

export const notifyBadge = (artisanId: string) => safe(async () => {
  const c = await contactOf(artisanId); if (!c) return;
  await sendOnce("badge_granted", c.artisanId, mail(c.email, T.badgeGranted(c.name, c.artisanId)));
});

export const notifyServiceRequest = (requestId: string) => safe(async () => {
  const db = supabaseAdmin();
  const { data: r } = await db.from("service_requests").select("*").eq("id", requestId).maybeSingle();
  if (!r?.artisan_id) return;
  const c = await contactOf(r.artisan_id); if (!c) return;
  await Promise.all([
    sendOnce("request_artisan", r.id, mail(c.email, T.requestForArtisan({ client: r.client_name, email: r.client_email, phone: r.client_phone, description: r.description, urgent: r.urgent, artisanId: c.artisanId }), r.client_email ? { replyTo: r.client_email } : undefined)),
    r.client_email ? sendOnce("request_client", r.id, mail(r.client_email, T.requestForClient(c.name, r.description))) : Promise.resolve(),
  ]);
});

export const notifyReviewRequest = (linkId: string) => safe(async () => {
  const db = supabaseAdmin();
  const { data: l } = await db.from("review_links").select("id, token, request:service_requests(client_email), artisan:artisans(name)").eq("id", linkId).maybeSingle();
  const one = (x: any) => (Array.isArray(x) ? x[0] : x);
  const email = one((l as any)?.request)?.client_email, name = one((l as any)?.artisan)?.name;
  if (!l || !email || !name) return;
  await sendOnce("review_request", l.id, mail(email, T.reviewRequest(name, `${siteUrl()}/avis/${l.token}`)));
});

export const REPORT_REASONS: Record<string, string> = { travail: "Travail non fait ou mal fait", arnaque: "Argent demandé sans prestation (arnaque)", comportement: "Comportement inapproprié", identite: "Fausse identité ou fausses photos", autre: "Autre" };

export const notifyReport = (reportId: string) => safe(async () => {
  const db = supabaseAdmin();
  const { data: r } = await db.from("reports").select("*, artisan:artisans(id, name)").eq("id", reportId).maybeSingle();
  const a = Array.isArray((r as any)?.artisan) ? (r as any).artisan[0] : (r as any)?.artisan;
  if (!r || !a) return;
  const { data: admins } = await db.from("profiles").select("email").eq("role", "admin");
  const m = T.reportForAdmin({ artisan: a.name, artisanId: a.id, reasonLabel: REPORT_REASONS[r.reason] ?? r.reason, details: r.details, contact: r.reporter_contact });
  await Promise.all((admins ?? []).filter((x) => x.email).map((x) => sendOnce("report_admin", `${r.id}:${x.email}`, mail(x.email as string, m))));
});

export const notifySanction = (artisanId: string, kind: "avertissement" | "badge_retire" | "suspension" | "bannissement", reason: string) => safe(async () => {
  const c = await contactOf(artisanId); if (!c) return;
  await sendOnce("sanction", `${c.artisanId}:${Date.now()}`, mail(c.email, T.sanctionForArtisan({ name: c.name, kind, reason })));
});

export const notifyBoostPaid = (providerRef: string) => safe(async () => {
  const db = supabaseAdmin();
  const { data: pay } = await db.from("payments").select("boost_id, amount, status").eq("provider_ref", providerRef).maybeSingle();
  if (!pay || pay.status !== "paid" || !pay.boost_id) return;
  const { data: b } = await db.from("boosts").select("*, zone:zones(name)").eq("id", pay.boost_id).maybeSingle();
  if (!b) return;
  const c = await contactOf(b.artisan_id); if (!c) return;
  let q = db.from("boosts").select("ends_at").eq("artisan_id", b.artisan_id).eq("type", b.type).eq("status", "active");
  q = b.zone_id ? q.eq("zone_id", b.zone_id) : q.is("zone_id", null);
  const { data: act } = await q.order("ends_at", { ascending: false }).limit(1).maybeSingle();
  const endsAt = act?.ends_at ?? b.ends_at;
  if (!endsAt) return;
  await sendOnce("boost_receipt", providerRef, mail(c.email, T.boostReceipt({
    name: c.name, label: BOOST_TYPES[b.type]?.name ?? "Boost", zone: (b as any).zone?.name ?? null,
    duration: DURATIONS[b.duration_hours] ?? `${b.duration_hours} h`, amount: pay.amount, endsAt, merged: b.status === "merged",
  })));
});

/* ───────── Tâche quotidienne ───────── */
const DAY = 864e5;
export async function runReminders() {
  const db = supabaseAdmin();
  const now = Date.now();
  const out = { expiring: 0, completeProfile: 0, firstBoost: 0, documents: 0 };
  let marketingBudget = 40; // plan gratuit Resend : 100 e-mails/jour au total

  // 1. Boost qui se termine dans les 30 prochaines heures (transactionnel). Les boosts de 24 h sont ignorés.
  const { data: ending } = await db.from("boosts").select("id, artisan_id, type, ends_at, duration_hours")
    .eq("status", "active").gt("ends_at", new Date(now).toISOString()).lt("ends_at", new Date(now + 30 * 36e5).toISOString()).gt("duration_hours", 24).limit(50);
  for (const b of ending ?? []) {
    const c = await contactOf(b.artisan_id); if (!c) continue;
    const r = await sendOnce("boost_expiring", b.id, mail(c.email, T.boostExpiring(c.name, BOOST_TYPES[b.type]?.name ?? "boost", b.ends_at)));
    if (r.ok) out.expiring++;
  }

  // 2. Compte créé il y a 2 à 14 jours sans fiche artisan (marketing)
  const { data: profs } = await db.from("profiles").select("id, email, marketing_opt_out, created_at").eq("role", "artisan").eq("marketing_opt_out", false)
    .not("country_code", "is", null).lt("created_at", new Date(now - 2 * DAY).toISOString()).gt("created_at", new Date(now - 14 * DAY).toISOString()).limit(200);
  if (profs?.length) {
    const { data: has } = await db.from("artisans").select("user_id").in("user_id", profs.map((x) => x.id));
    const done = new Set((has ?? []).map((x) => x.user_id));
    for (const pr of profs.filter((x) => !done.has(x.id))) {
      if (marketingBudget <= 0) break;
      const r = await sendOnce("nudge_profile", pr.id, mail(pr.email, T.completeProfileNudge(unsubPage(pr.id)), mk(pr.id)));
      if (r.ok) { out.completeProfile++; marketingBudget--; }
    }
  }

  // 3. Artisan validé depuis 7 à 45 jours qui n'a jamais pris de boost (marketing)
  const { data: arts } = await db.from("artisans").select("id").eq("status", "approved")
    .lt("created_at", new Date(now - 7 * DAY).toISOString()).gt("created_at", new Date(now - 45 * DAY).toISOString()).limit(200);
  if (arts?.length) {
    const { data: bs } = await db.from("boosts").select("artisan_id").in("artisan_id", arts.map((x) => x.id));
    const boosted = new Set((bs ?? []).map((x) => x.artisan_id));
    for (const a of arts.filter((x) => !boosted.has(x.id))) {
      if (marketingBudget <= 0) break;
      const c = await contactOf(a.id); if (!c || c.optOut) continue;
      const r = await sendOnce("nudge_first_boost", a.id, mail(c.email, T.firstBoostNudge(c.name, unsubPage(c.userId)), mk(c.userId)));
      if (r.ok) { out.firstBoost++; marketingBudget--; }
    }
  }

  // 4. Profil créé depuis 2 à 14 jours mais dossier d'identité jamais envoyé (rappel de service, une seule fois)
  const { data: waiting } = await db.from("artisans").select("id").eq("status", "pending")
    .lt("created_at", new Date(now - 2 * DAY).toISOString()).gt("created_at", new Date(now - 14 * DAY).toISOString()).limit(100);
  if (waiting?.length) {
    const { data: ids } = await db.from("artisan_identity").select("artisan_id").in("artisan_id", waiting.map((x) => x.id));
    const sent = new Set((ids ?? []).map((x) => x.artisan_id));
    for (const a of waiting.filter((x) => !sent.has(x.id)).slice(0, 30)) {
      const c = await contactOf(a.id); if (!c) continue;
      const r = await sendOnce("nudge_documents", a.id, mail(c.email, T.documentsReminder(c.name)));
      if (r.ok) out.documents++;
    }
  }
  return out;
}

/* ───────── Campagnes (admin) ───────── */
export type Audience = { country?: string; trade?: string; noBoost?: boolean };

export async function audienceOf(a: Audience) {
  const db = supabaseAdmin();
  let q = db.from("artisans").select("id, name, user_id, profile:profiles(email, marketing_opt_out)").eq("status", "approved");
  if (a.country) q = q.eq("country_code", a.country);
  if (a.trade) q = q.eq("trade_id", a.trade);
  const { data } = await q.limit(5000);
  let rows = (data ?? []).filter((r: any) => r.profile?.email && !r.profile.marketing_opt_out);
  if (a.noBoost) {
    const { data: act } = await db.from("boosts").select("artisan_id").eq("status", "active").gt("ends_at", new Date().toISOString());
    const busy = new Set((act ?? []).map((x) => x.artisan_id));
    rows = rows.filter((r: any) => !busy.has(r.id));
  }
  const seen = new Set<string>();
  return rows.filter((r: any) => !seen.has(r.profile.email) && seen.add(r.profile.email))
    .map((r: any) => ({ name: r.name as string, userId: r.user_id as string, email: r.profile.email as string }));
}

export async function sendCampaign(o: { subject: string; body: string; audience: Audience; by: string }) {
  const people = await audienceOf(o.audience);
  const msgs = people.map((p) => mail(p.email, T.campaign(o.subject, o.body, p.name, unsubPage(p.userId)), mk(p.userId)));
  const res = await sendBatch(msgs);
  await supabaseAdmin().from("campaigns").insert({
    subject: o.subject, body: o.body, audience: o.audience, recipients: people.length, sent: res.sent, failed: res.failed, created_by: o.by,
  });
  return { recipients: people.length, ...res };
}

export const sendTest = (to: string, userId: string, subject: string, body: string) =>
  sendBatch([mail(to, T.campaign(subject, body, "Test", unsubPage(userId)), mk(userId))]);
