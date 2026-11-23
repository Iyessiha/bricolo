/** Photos par défaut des cartes : des artisans d'Afrique de l'Ouest, légères (WebP), hébergées sur le site. Choix stable par artisan. */
const GARAGE = ["/photos/covers/mecanicien.webp", "/photos/covers/mecanicien-2.webp"];
const CHANTIER = ["/photos/covers/chantier-1.webp", "/photos/covers/chantier-2.webp"];
const GARAGE_TRADES = new Set(["mecanicien", "carrossier"]);
const pick = (l: string[], key: string) => l[[...key].reduce((n, c) => n + c.charCodeAt(0), 0) % l.length];
export const defaultCoverUrl = (slug?: string | null, key = ""): string => pick(slug && GARAGE_TRADES.has(slug) ? GARAGE : CHANTIER, key);
/** Les covers « marketing » générées par Bricolo ne sont plus utilisées sur les cartes : on préfère une vraie photo. */
export const isGeneratedCover = (u?: string | null) => !!u && u.includes("/cover-bricolo-");
