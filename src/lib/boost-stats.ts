import type { SupabaseClient } from "@supabase/supabase-js";

export type Counts = { vues: number; appels: number; wa: number; contacts: number };
export type BoostResult = {
  id: string; type: string; zoneName: string | null; hours: number; startsAt: string; endsAt: string; active: boolean;
  during: Counts; before: Counts;
  /** Variation des contacts (appels + WhatsApp) en % ; null si on a trop peu de données pour comparer honnêtement. */
  lift: number | null;
};

const none = (): Counts => ({ vues: 0, appels: 0, wa: 0, contacts: 0 });
const MIN_SAMPLE = 5; // en dessous, un pourcentage ne veut rien dire

/** Compte les événements (vues, appels, WhatsApp) d'un artisan par fenêtres de temps, en une seule requête. */
export async function countWindows(db: SupabaseClient, artisanId: string, windows: { from: number; to: number }[]): Promise<Counts[]> {
  if (!windows.length) return [];
  const min = Math.min(...windows.map((w) => w.from));
  const { data } = await db.from("events").select("type, created_at").eq("artisan_id", artisanId).gte("created_at", new Date(min).toISOString()).limit(20000);
  const out = windows.map(none);
  for (const e of data ?? []) {
    const t = new Date(e.created_at).getTime();
    windows.forEach((w, i) => {
      if (t < w.from || t >= w.to) return;
      if (e.type === "view") out[i].vues++; else if (e.type === "call") { out[i].appels++; out[i].contacts++; } else if (e.type === "whatsapp") { out[i].wa++; out[i].contacts++; }
    });
  }
  return out;
}

/** Variation en % entre deux périodes de même durée, ou null si l'échantillon est trop petit. */
export function liftPct(before: number, during: number): number | null {
  if (before + during < MIN_SAMPLE) return null;
  if (before === 0) return null; // pas de base de comparaison : on ne calcule pas un « +∞ % »
  return Math.round(((during - before) / before) * 100);
}

/** Résultats des boosts de l'artisan : pendant le boost, et sur une période de même durée juste avant. Comparaison indicative, pas une preuve. */
export async function boostResults(db: SupabaseClient, artisanId: string, limit = 8): Promise<BoostResult[]> {
  const { data: bs } = await db.from("boosts").select("id, type, duration_hours, starts_at, ends_at, status, zone:zones(name)").eq("artisan_id", artisanId).in("status", ["active", "expired"]).not("starts_at", "is", null).order("starts_at", { ascending: false }).limit(limit);
  const list = (bs ?? []).filter((b) => b.starts_at && b.ends_at);
  const now = Date.now();
  const wins: { from: number; to: number }[] = [];
  for (const b of list) {
    const s = new Date(b.starts_at!).getTime(), e = Math.min(new Date(b.ends_at!).getTime(), now), len = Math.max(e - s, 36e5);
    wins.push({ from: s, to: e }, { from: s - len, to: s });
  }
  const c = await countWindows(db, artisanId, wins);
  return list.map((b, i) => {
    const during = c[i * 2], before = c[i * 2 + 1];
    const z = Array.isArray(b.zone) ? b.zone[0] : b.zone;
    return { id: b.id, type: b.type, zoneName: (z as { name?: string } | null)?.name ?? null, hours: b.duration_hours, startsAt: b.starts_at!, endsAt: b.ends_at!, active: new Date(b.ends_at!).getTime() > now, during, before, lift: liftPct(before.contacts, during.contacts) };
  });
}
