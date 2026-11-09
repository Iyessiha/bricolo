import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";

export type AdminCtx = { db: ReturnType<typeof supabaseAdmin>; id: string; email: string };

/** Vérifie la session ET le rôle administrateur, puis donne un accès serveur complet. À appeler dans chaque page et chaque action d'administration. */
export async function requireAdmin(): Promise<AdminCtx> {
  const s = await supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: me } = await s.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/");
  return { db: supabaseAdmin(), id: user.id, email: user.email ?? "" };
}

/** Journal d'activité : qui a fait quoi, sur quoi. Ne bloque jamais l'action. */
export async function audit(ctx: AdminCtx, action: string, target?: { type: string; id: string; label?: string }, detail?: Record<string, unknown>) {
  try {
    await ctx.db.from("admin_audit").insert({ admin_id: ctx.id, admin_email: ctx.email, action, target_type: target?.type ?? null, target_id: target?.id ?? null, label: target?.label ?? null, detail: detail ?? null });
  } catch { /* journal non bloquant */ }
}

export const day = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));
export const ago = (iso: string) => { const h = Math.floor((Date.now() - new Date(iso).getTime()) / 36e5); return h < 1 ? "à l’instant" : h < 48 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`; };
export const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/** Série par jour sur n jours (du plus ancien au plus récent) à partir de dates ISO, avec valeur optionnelle. */
export function perDay(rows: { at: string; v?: number }[], n = 30) {
  const out: { d: string; v: number }[] = [];
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) out.push({ d: new Date(today.getTime() - i * 864e5).toISOString().slice(0, 10), v: 0 });
  const idx = new Map(out.map((o, i) => [o.d, i]));
  for (const r of rows) { const i = idx.get(r.at.slice(0, 10)); if (i !== undefined) out[i].v += r.v ?? 1; }
  return out;
}
