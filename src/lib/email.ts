import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "./supabase/admin";
import { siteUrl } from "./env";

/** Client Resend minimal (API REST, aucune dépendance). Sans RESEND_API_KEY : mode simulation, rien n'est envoyé. */
export type Msg = {
  to: string; subject: string; html: string; text?: string; replyTo?: string;
  headers?: Record<string, string>; tags?: { name: string; value: string }[];
};
type Sent = { ok: boolean; id?: string; mock?: boolean; error?: string };

const API = "https://api.resend.com";
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);
const sender = () => process.env.EMAIL_FROM || "Bricolo <onboarding@resend.dev>";

const body = (m: Msg) => ({
  from: sender(), to: [m.to], subject: m.subject, html: m.html, text: m.text,
  reply_to: m.replyTo || process.env.EMAIL_REPLY_TO || undefined, headers: m.headers, tags: m.tags,
});

export async function sendEmail(m: Msg): Promise<Sent> {
  if (!emailConfigured()) { console.info("[email:simulation]", m.to, "|", m.subject); return { ok: true, mock: true }; }
  try {
    const r = await fetch(`${API}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body(m)),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.message ?? `HTTP ${r.status}` };
    return { ok: true, id: j.id };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "réseau" }; }
}

/** Envoi groupé (100 par appel). Retourne le nombre d'envois réussis et échoués. */
export async function sendBatch(msgs: Msg[]) {
  let sent = 0, failed = 0;
  if (!emailConfigured()) { console.info("[email:simulation] lot de", msgs.length); return { sent: msgs.length, failed: 0, mock: true }; }
  for (let i = 0; i < msgs.length; i += 100) {
    const chunk = msgs.slice(i, i + 100);
    try {
      const r = await fetch(`${API}/emails/batch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map(body)),
      });
      if (r.ok) sent += chunk.length; else failed += chunk.length;
    } catch { failed += chunk.length; }
  }
  return { sent, failed, mock: false };
}

/** Envoie un e-mail une seule fois pour (modèle, référence). Un échec libère la place pour un nouvel essai. */
export async function sendOnce(template: string, ref: string, m: Msg) {
  const db = supabaseAdmin();
  const { error } = await db.from("email_log").insert({ template, ref, to_email: m.to, status: "pending" });
  if (error) return { ok: false, skipped: error.code === "23505" };
  const r = await sendEmail(m);
  if (r.ok && !r.mock) await db.from("email_log").update({ status: "sent", provider_id: r.id }).eq("template", template).eq("ref", ref);
  else await db.from("email_log").delete().eq("template", template).eq("ref", ref); // simulation ou échec : on pourra réessayer
  return { ok: r.ok, skipped: false };
}

/* ───────── Désabonnement marketing ───────── */
const secret = () => process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "";
export const unsubToken = (userId: string) => createHmac("sha256", secret()).update(`unsub:${userId}`).digest("hex").slice(0, 32);
export function unsubValid(userId: string, token: string) {
  if (!secret() || !/^[0-9a-f-]{36}$/i.test(userId)) return false;
  const a = Buffer.from(unsubToken(userId)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const unsubPage = (userId: string) => `${siteUrl()}/desabonnement?u=${userId}&t=${unsubToken(userId)}`;
/** En-têtes exigés par Gmail/Yahoo pour les envois marketing (désabonnement en un clic). */
export const marketingHeaders = (userId: string) => ({
  "List-Unsubscribe": `<${siteUrl()}/api/desabonnement?u=${userId}&t=${unsubToken(userId)}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});
