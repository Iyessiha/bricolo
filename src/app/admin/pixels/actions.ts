"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/admin";
import { SETTINGS, type SettingKey } from "@/lib/site-settings";

const back = (kind: "ok" | "erreur", msg: string): never => redirect(`/admin/pixels?${kind}=${encodeURIComponent(msg)}`);

/** Enregistre les identifiants. Chaque valeur est contrôlée avant écriture ; une valeur vide désactive l'outil. */
export async function saveSettings(f: FormData) {
  const ctx = await requireAdmin();
  const rows: { key: string; value: string }[] = [];
  const clear: string[] = [];
  for (const k of Object.keys(SETTINGS) as SettingKey[]) {
    if (!f.has(k)) continue;
    const v = String(f.get(k) ?? "").trim();
    if (!v) { clear.push(k); continue; }
    if (!SETTINGS[k].re.test(v)) back("erreur", `« ${SETTINGS[k].label} » : format invalide. ${SETTINGS[k].hint}`);
    rows.push({ key: k, value: v });
  }
  if (rows.length) {
    const { error } = await ctx.db.from("site_settings").upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: "key" });
    if (error) back("erreur", "L’enregistrement a échoué. Réessayez dans un instant.");
  }
  if (clear.length) await ctx.db.from("site_settings").delete().in("key", clear);
  await audit(ctx, "reglages.pixels", { type: "reglages", id: "site", label: "Pixels et référencement" }, { actifs: rows.map((r) => r.key), retires: clear });
  revalidateTag("site-settings");
  revalidatePath("/", "layout");
  back("ok", "Réglages enregistrés. Ils sont actifs sur le site dans quelques secondes.");
}
