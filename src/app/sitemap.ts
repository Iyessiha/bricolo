import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import { COUNTRIES } from "@/lib/countries";
import { slugify, zoneFamily, type Z } from "@/lib/seo";

export const revalidate = 3600;

/** L'API plafonne chaque réponse à 1 000 lignes : on lit par tranches pour ne rien oublier quand le site grandit. */
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>) {
  const out: T[] = [];
  for (let i = 0; i < 100; i++) {
    const { data } = await page(i * 1000, i * 1000 + 999);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
}

/** Plan du site : pages fixes, une page par pays, par métier et par ville AVEC au moins un artisan en ligne (pas de page vide dans Google), et chaque fiche approuvée. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/resultats`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/bientot`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/inscription`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...["/charte-artisan", "/mentions-legales", "/conditions-utilisation", "/confidentialite", "/cookies"].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
  try {
    const db = supabaseAdmin();
    const [arts, az, zones, { data: trades }] = await Promise.all([
      all((f, t) => db.from("artisans").select("id, country_code, trade_id, created_at").eq("status", "approved").order("id").range(f, t)),
      all((f, t) => db.from("artisan_zones").select("artisan_id, zone_id").order("artisan_id").order("zone_id").range(f, t)),
      all((f, t) => db.from("zones").select("id, name, parent_id, country_code").order("id").range(f, t)),
      db.from("trades").select("id, slug"),
    ]);
    const slugOf = new Map((trades ?? []).map((t) => [t.id, t.slug]));
    const zs = zones as Z[];
    const zonesOf = new Map<string, Set<string>>();
    for (const r of az) { if (!zonesOf.has(r.artisan_id)) zonesOf.set(r.artisan_id, new Set()); zonesOf.get(r.artisan_id)!.add(r.zone_id); }
    const out: MetadataRoute.Sitemap = [];
    const seen = new Set<string>();
    const push = (path: string, last: Date, priority: number) => { if (!seen.has(path)) { seen.add(path); out.push({ url: `${base}${path}`, lastModified: last, changeFrequency: "weekly", priority }); } };
    const latest = new Map<string, Date>();
    const bump = (k: string, d: Date) => { const c = latest.get(k); if (!c || d > c) latest.set(k, d); };

    for (const a of arts) {
      const d = a.created_at ? new Date(a.created_at) : now;
      const ts = slugOf.get(a.trade_id);
      push(`/artisan/${a.id}`, d, 0.6);
      bump(`/artisans/${a.country_code}`, d);
      if (!ts) continue;
      bump(`/artisans/${a.country_code}/${ts}`, d);
      // Une ville ou un quartier est couvert si l'artisan y travaille, dans sa ville, ou dans l'un de ses quartiers.
      const mine = zonesOf.get(a.id) ?? new Set<string>();
      for (const z of zs.filter((x) => x.country_code === a.country_code)) {
        const fam = zoneFamily(zs, z.id);
        if ([...mine].some((id) => fam.has(id))) bump(`/artisans/${a.country_code}/${ts}/${slugify(z.name)}`, d);
      }
    }
    for (const c of COUNTRIES) if (latest.has(`/artisans/${c.code}`)) push(`/artisans/${c.code}`, latest.get(`/artisans/${c.code}`)!, 0.9);
    for (const [k, d] of latest) if (k.split("/").length > 3) push(k, d, k.split("/").length === 4 ? 0.8 : 0.7);
    return [...fixed, ...out];
  } catch {
    return fixed;
  }
}
