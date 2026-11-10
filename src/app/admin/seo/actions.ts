"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/admin";
import { SETTINGS, type SettingKey } from "@/lib/site-settings";

const back = (kind: "ok" | "erreur", msg: string): never => redirect(`/admin/seo?${kind}=${encodeURIComponent(msg)}`);

/** Enregistre les titres et descriptions. Chaque texte est contrôlé (longueur) ; un champ vide rétablit le texte par défaut. */
export async function saveSeoTexts(f: FormData) {
  const ctx = await requireAdmin();
  const rows: { key: string; value: string }[] = [], clear: string[] = [];
  for (const k of Object.keys(SETTINGS) as SettingKey[]) {
    if (!(k === "home_title" || k === "home_description" || k.startsWith("seo_title_") || k.startsWith("seo_desc_")) || !f.has(k)) continue;
    const v = String(f.get(k) ?? "").replace(/\s+/g, " ").trim();
    if (!v) { clear.push(k); continue; }
    if (!SETTINGS[k].re.test(v)) back("erreur", `« ${SETTINGS[k].label} » : ${SETTINGS[k].hint}`);
    rows.push({ key: k, value: v });
  }
  if (rows.length) {
    const { error } = await ctx.db.from("site_settings").upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: "key" });
    if (error) back("erreur", "L’enregistrement a échoué. Réessayez dans un instant.");
  }
  if (clear.length) await ctx.db.from("site_settings").delete().in("key", clear);
  await audit(ctx, "reglages.seo", { type: "reglages", id: "seo", label: "Titres et descriptions Google" }, { modifies: rows.map((r) => r.key), retires: clear });
  revalidateTag("site-settings");
  revalidatePath("/", "layout");
  back("ok", "Enregistré. Google met à jour l’affichage à son prochain passage (quelques jours).");
}
