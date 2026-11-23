import "server-only";
import { supabaseAdmin } from "./supabase/admin";

/** Photos par défaut téléversées par l'administration (une par métier), dans le stockage public : `defaults/<métier>.webp`. Mémorisées 60 s. */
let memo: { at: number; map: Record<string, string> } | null = null;
export const resetUploadedDefaults = () => { memo = null; };
export async function uploadedDefaults(): Promise<Record<string, string>> {
  if (memo && Date.now() - memo.at < 60_000) return memo.map;
  const map: Record<string, string> = {};
  try {
    const db = supabaseAdmin();
    const { data } = await db.storage.from("realisations").list("defaults", { limit: 100 });
    for (const f of data ?? []) {
      if (!f.name.endsWith(".webp")) continue;
      const { data: pub } = db.storage.from("realisations").getPublicUrl(`defaults/${f.name}`);
      map[f.name.replace(/\.webp$/, "")] = `${pub.publicUrl}?v=${new Date(f.updated_at ?? f.created_at ?? 0).getTime()}`;
    }
  } catch { /* on retombe sur les photos du site */ }
  memo = { at: Date.now(), map };
  return map;
}
