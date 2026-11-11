import "server-only";
import { supabaseServer } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";

export type SupportMsg = { id: string; sender: "artisan" | "admin"; body: string; created_at: string; read_at: string | null };
const COLS = "id, sender, body, created_at, read_at";

export async function currentUser() { return (await (await supabaseServer()).auth.getUser()).data.user; }

/** L'artisan connecté (null si ce n'est pas un artisan). */
export async function currentArtisan() {
  const u = await currentUser(); if (!u) return null;
  const { data } = await supabaseAdmin().from("artisans").select("id, name").eq("user_id", u.id).maybeSingle();
  return data ? { ...data, userId: u.id } : null;
}
/** L'administrateur connecté (null sinon). */
export async function currentAdmin() {
  const s = await supabaseServer(); const { data: { user } } = await s.auth.getUser(); if (!user) return null;
  const { data: me } = await s.from("profiles").select("role").eq("id", user.id).single();
  return me?.role === "admin" ? user : null;
}

export async function listMessages(artisanId: string, readerIs: "artisan" | "admin"): Promise<SupportMsg[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("support_messages").select(COLS).eq("artisan_id", artisanId).order("created_at", { ascending: false }).limit(200);
  // On marque comme lus les messages de l'autre partie.
  const other = readerIs === "artisan" ? "admin" : "artisan";
  if ((data ?? []).some((m) => m.sender === other && !m.read_at))
    await db.from("support_messages").update({ read_at: new Date().toISOString() }).eq("artisan_id", artisanId).eq("sender", other).is("read_at", null);
  return ((data ?? []) as SupportMsg[]).reverse();
}

export const unreadForArtisan = async (artisanId: string) =>
  (await supabaseAdmin().from("support_messages").select("id", { count: "exact", head: true }).eq("artisan_id", artisanId).eq("sender", "admin").is("read_at", null)).count ?? 0;

/** Contrôle et enregistre un message. Limite : 20 messages par heure et par artisan. */
export async function addMessage(artisanId: string, sender: "artisan" | "admin", userId: string, raw: unknown): Promise<{ ok: true; id: string; firstUnread: boolean } | { ok: false; error: string; status: number }> {
  const body = String(raw ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!body) return { ok: false, error: "Écrivez votre message.", status: 400 };
  if (body.length > 2000) return { ok: false, error: "Message trop long (2000 caractères maximum).", status: 400 };
  const db = supabaseAdmin();
  if (sender === "artisan") {
    const since = new Date(Date.now() - 36e5).toISOString();
    const { count } = await db.from("support_messages").select("id", { count: "exact", head: true }).eq("artisan_id", artisanId).eq("sender", "artisan").gte("created_at", since);
    if ((count ?? 0) >= 20) return { ok: false, error: "Vous avez envoyé beaucoup de messages. Patientez un peu, nous vous répondons dès que possible.", status: 429 };
  }
  // Avant d'insérer : y avait-il déjà un message de cet expéditeur non lu ? (pour ne pas prévenir par e-mail à chaque message)
  const { count: pending } = await db.from("support_messages").select("id", { count: "exact", head: true }).eq("artisan_id", artisanId).eq("sender", sender).is("read_at", null);
  const { data, error } = await db.from("support_messages").insert({ artisan_id: artisanId, sender, sender_user_id: userId, body }).select("id").single();
  if (error || !data) return { ok: false, error: "Le message n’a pas pu être envoyé. Réessayez.", status: 500 };
  return { ok: true, id: data.id, firstUnread: (pending ?? 0) === 0 };
}
