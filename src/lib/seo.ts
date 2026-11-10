import { COUNTRIES, type CountryCode } from "./countries";

export const SITE_NAME = "Bricolo";
export const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const countryByCode = (c: string) => COUNTRIES.find((x) => x.code === c);

/** Texte JSON-LD sûr à insérer dans une balise script : on neutralise « < » pour qu'aucune valeur ne puisse fermer la balise. */
export const jsonLd = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");

export const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

/** Famille de zones : une zone couvre elle-même, sa ville et ses quartiers (comme zone_family en base). */
export type Z = { id: string; name: string; parent_id: string | null; country_code: string };
export function zoneFamily(zones: Z[], id: string) {
  const z = zones.find((x) => x.id === id);
  return new Set([id, ...(z?.parent_id ? [z.parent_id] : []), ...zones.filter((x) => x.parent_id === id).map((x) => x.id)]);
}
export type CountryCodeT = CountryCode;

export const DEFAULT_TITLE = "Bricolo : trouvez un artisan de confiance en Afrique de l’Ouest";
export const DEFAULT_DESC = "Plombiers, électriciens, menuisiers, frigoristes, mécaniciens et plus : comparez des artisans vérifiés près de chez vous en Côte d’Ivoire, au Sénégal, Burkina Faso, Mali, Niger, Bénin et Togo. Gratuit, sans compte.";
