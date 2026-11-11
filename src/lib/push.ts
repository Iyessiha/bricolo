import "server-only";
import * as webpush from "web-push";
import { supabaseAdmin } from "./supabase/admin";
import { COMPANY } from "./company";

/** Les notifications ne s'activent que si les clés VAPID sont renseignées (sinon tout est ignoré sans erreur). */
export const pushEnabled = () => Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
let ready = false;
function init() {
  if (ready || !pushEnabled()) return pushEnabled();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${COMPANY.email}`, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true; return true;
}

/** Nombre affiché sur l'icône : demandes de clients pas encore traitées + réponses de l'équipe non lues. */
export async function badgeCountFor(artisanId: string): Promise<number> {
  const db = supabaseAdmin();
  const [a, b] = await Promise.all([
    db.from("service_requests").select("id", { count: "exact", head: true }).eq("artisan_id", artisanId).eq("status", "new"),
    db.from("support_messages").select("id", { count: "exact", head: true }).eq("artisan_id", artisanId).eq("sender", "admin").is("read_at", null),
  ]);
  return Math.min((a.count ?? 0) + (b.count ?? 0), 99);
}

export type PushMsg = { title: string; body: string; url?: string; tag?: string };

/** Envoie une notification à tous les appareils d'un artisan. Ne lève jamais d'erreur. */
export async function pushToArtisan(artisanId: string, msg: PushMsg) {
  try {
    if (!init()) return;
    const db = supabaseAdmin();
    const { data: a } = await db.from("artisans").select("user_id").eq("id", artisanId).maybeSingle();
    if (!a?.user_id) return;
    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", a.user_id);
    if (!subs?.length) return;
    const badge = await badgeCountFor(artisanId);
    const payload = JSON.stringify({ ...msg, url: msg.url ?? "/tableau-de-bord", badge });
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "high" });
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_subscriptions").delete().eq("id", s.id); // appareil désinstallé
        else console.error("[push]", e?.statusCode ?? e?.message);
      }
    }));
  } catch (e) { console.error("[push]", e instanceof Error ? e.message : e); }
}
