import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { BOOST_TYPES, DURATIONS } from "./format";

export type Receipt = { id: string; no: string; paidAt: string; label: string; amount: number; currency: string; ref: string; artisanName: string; email: string | null };

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
const planLabel = (days: number) => `Forfait Pro · ${days >= 360 ? "1 an" : days >= 28 ? `${Math.round(days / 30)} mois` : `${days} jours`}`;
const COLS = "id, amount, currency, provider_ref, paid_at, created_at, boost:boosts(type, duration_hours, artisan:artisans(id, name, user_id)), sub:subscriptions(days, artisan:artisans(id, name, user_id))";

function shape(p: any, email: string | null): (Receipt & { userId: string }) | null {
  const b = one<any>(p.boost), s = one<any>(p.sub);
  const artisan = one<any>(b?.artisan ?? s?.artisan);
  if (!artisan) return null;
  const label = b ? `${BOOST_TYPES[b.type]?.name ?? `Boost ${b.type}`} · ${DURATIONS[b.duration_hours] ?? `${b.duration_hours} h`}` : planLabel(s?.days ?? 0);
  return { id: p.id, no: `BR-${String(p.id).slice(0, 8).toUpperCase()}`, paidAt: p.paid_at ?? p.created_at, label, amount: p.amount, currency: p.currency, ref: p.provider_ref, artisanName: artisan.name, email, userId: artisan.user_id };
}

/** Un reçu : uniquement pour un paiement confirmé et seulement pour son propriétaire (ou un administrateur). */
export async function getReceipt(paymentId: string, userId: string, isAdmin: boolean): Promise<Receipt | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("payments").select(COLS).eq("id", paymentId).eq("status", "paid").maybeSingle();
  if (!data) return null;
  const r = shape(data, null);
  if (!r || (r.userId !== userId && !isAdmin)) return null;
  const { data: pr } = await db.from("profiles").select("email").eq("id", r.userId).maybeSingle();
  return { ...r, email: pr?.email ?? null };
}

/** Derniers paiements confirmés d'un artisan (boosts et Forfait Pro). */
export async function listPaid(artisanId: string): Promise<Receipt[]> {
  const db = supabaseAdmin();
  const [{ data: bs }, { data: ss }] = await Promise.all([
    db.from("boosts").select("id").eq("artisan_id", artisanId),
    db.from("subscriptions").select("id").eq("artisan_id", artisanId),
  ]);
  const bids = (bs ?? []).map((x) => x.id), sids = (ss ?? []).map((x) => x.id);
  const parts = [bids.length ? `boost_id.in.(${bids.join(",")})` : "", sids.length ? `subscription_id.in.(${sids.join(",")})` : ""].filter(Boolean);
  if (!parts.length) return [];
  const { data } = await db.from("payments").select(COLS).eq("status", "paid").or(parts.join(",")).order("paid_at", { ascending: false }).limit(30);
  return (data ?? []).map((p) => shape(p, null)).filter(Boolean) as Receipt[];
}

export type PaymentRow = { id: string; at: string; label: string; amount: number; status: "pending" | "paid" | "failed"; kind: "forfait" | "boost" };

/** Tous les paiements d'un artisan, du plus récent au plus ancien, avec leur état réel (payé, en attente, échoué). */
export async function listPayments(artisanId: string): Promise<PaymentRow[]> {
  const db = supabaseAdmin();
  const [{ data: bs }, { data: ss }] = await Promise.all([
    db.from("boosts").select("id").eq("artisan_id", artisanId),
    db.from("subscriptions").select("id").eq("artisan_id", artisanId),
  ]);
  const bids = (bs ?? []).map((x) => x.id), sids = (ss ?? []).map((x) => x.id);
  const parts = [bids.length ? `boost_id.in.(${bids.join(",")})` : "", sids.length ? `subscription_id.in.(${sids.join(",")})` : ""].filter(Boolean);
  if (!parts.length) return [];
  const { data } = await db.from("payments").select(COLS + ", status").or(parts.join(",")).order("created_at", { ascending: false }).limit(40);
  return (data ?? []).map((p: any) => { const r = shape(p, null); return r ? { id: p.id, at: p.paid_at ?? p.created_at, label: r.label, amount: p.amount, status: p.status, kind: one<any>(p.boost) ? "boost" : "forfait" } : null; }).filter(Boolean) as PaymentRow[];
}
