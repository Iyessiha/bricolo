import "server-only";
import { supabaseAdmin } from "./supabase/admin";

export type DefaultCover = { url: string; kind: "svg" | "photo" };
/** Réglages des covers par défaut : photo téléversée par l'administration (`defaults/<métier>.webp`) et mode d'affichage par métier (photo ou SVG). Mémorisés 60 s. */
let memo: { at: number; up: Record<string, string>; modes: Record<string, "photo" | "svg"> } | null = null;
export const resetUploadedDefaults = () => { memo = null; };
export async function defaultSettings() {
  if (memo && Date.now() - memo.at < 60_000) return memo;
  const up: Record<string, string> = {}, modes: Record<string, "photo" | "svg"> = {};
  try {
    const db = supabaseAdmin();
    const [{ data: files }, { data: rows }] = await Promise.all([
      db.storage.from("realisations").list("defaults", { limit: 100 }),
      db.from("trade_default_covers").select("slug, mode"),
    ]);
    for (const f of files ?? []) {
      if (!f.name.endsWith(".webp")) continue;
      const { data: pub } = db.storage.from("realisations").getPublicUrl(`defaults/${f.name}`);
      up[f.name.replace(/\.webp$/, "")] = `${pub.publicUrl}?v=${new Date(f.updated_at ?? f.created_at ?? 0).getTime()}`;
    }
    for (const r of rows ?? []) modes[r.slug] = r.mode === "svg" ? "svg" : "photo";
  } catch { /* on retombe sur les photos du site */ }
  memo = { at: Date.now(), up, modes };
  return memo;
}
/** Cover par défaut d'un métier : dessin SVG si choisi, sinon photo téléversée, sinon null (photo du site). */
export async function defaultCoverFor(slug?: string | null): Promise<DefaultCover | null> {
  if (!slug) return null;
  const s = await defaultSettings();
  if (s.modes[slug] === "svg") return { url: `/cover-defaut/${slug}`, kind: "svg" };
  return s.up[slug] ? { url: s.up[slug], kind: "photo" } : null;
}
export const uploadedDefaults = async () => (await defaultSettings()).up;
/** Ajoute à une carte artisan la cover par défaut de son métier (photo ou dessin), pour les listes qui n'ont pas de cover propre. */
export function withDefault<T extends { trade_slug?: string | null }>(a: T, ds: Awaited<ReturnType<typeof defaultSettings>>): T & { default_cover: string | null; default_kind: "svg" | "photo" } {
  const sl = a.trade_slug ?? "";
  const svg = ds.modes[sl] === "svg";
  return { ...a, default_kind: svg ? "svg" : "photo", default_cover: !sl ? null : svg ? `/cover-defaut/${sl}` : ds.up[sl] ?? null };
}
