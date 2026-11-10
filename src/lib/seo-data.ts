import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { COUNTRIES, isCountry, type CountryCode } from "./countries";
import { slugify, type Z } from "./seo";

/** Lecture publique (sans session) : les pages de référencement ne dépendent d'aucun visiteur. */
const pub = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export const inCountry = (code: string, name: string) => (code === "ci" ? `en ${name}` : `au ${name}`);
/** Textes par défaut des pages « Artisans en <pays> » (utilisés tant qu'aucun texte n'est saisi dans l'admin). */
export const defaultHubTitle = (code: string, name: string) => `Artisans ${inCountry(code, name)} : plombiers, électriciens, menuisiers…`;
export const defaultHubDesc = (code: string, name: string, plurals: string[]) => `Trouvez un artisan vérifié ${inCountry(code, name)} : ${plurals.slice(0, 5).map((t) => t.toLowerCase()).join(", ")} et plus. Comparez, appelez ou écrivez sur WhatsApp. Gratuit.`;

export const loadHub = cache(async (pays: string) => {
  if (!isCountry(pays)) return null;
  const db = pub();
  const [{ data: trades }, { data: zones }, { data: arts }] = await Promise.all([
    db.from("trades").select("id, slug, name, plural, description").order("plural"),
    db.from("zones").select("id, name, parent_id, country_code").eq("country_code", pays).order("name"),
    db.from("artisans").select("id, trade_id").eq("country_code", pays).eq("status", "approved").limit(20000),
  ]);
  const count = new Map<string, number>();
  for (const a of arts ?? []) count.set(a.trade_id, (count.get(a.trade_id) ?? 0) + 1);
  return { country: COUNTRIES.find((c) => c.code === pays)!, trades: trades ?? [], zones: (zones ?? []) as Z[], count, total: arts?.length ?? 0 };
});

export const loadListing = cache(async (pays: string, metier: string, zoneSlug?: string) => {
  const hub = await loadHub(pays);
  if (!hub) return null;
  const trade = hub.trades.find((t) => t.slug === metier);
  if (!trade) return null;
  let zone: Z | null = null;
  if (zoneSlug) {
    zone = hub.zones.find((z) => slugify(z.name) === zoneSlug) ?? null;
    if (!zone) return null;
  }
  const { data } = await pub().rpc("search_artisans", {
    p_country: pays as CountryCode, p_trade: trade.id, p_zone: zone?.id ?? null,
    p_verified: false, p_open: false, p_urgent: false, p_seed: "seo",
  });
  return { ...hub, trade, zone, list: ((data ?? []) as any[]).map((a) => ({ ...a, trade: trade.name })) };
});

export const loadArtisanMeta = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: a } = await pub().from("artisans")
    .select("id, name, headline, description, photo_url, cover_url, country_code, status, avg_rating, review_count, trade:trades(name, plural, slug), zones:artisan_zones(zone:zones(name))")
    .eq("id", id).maybeSingle();
  if (!a || a.status !== "approved") return null;
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);
  return { ...a, trade: one(a.trade as any) as { name: string; plural: string; slug: string } | null, zoneNames: ((a as any).zones ?? []).map((z: any) => one(z.zone)?.name).filter(Boolean) as string[] };
});
