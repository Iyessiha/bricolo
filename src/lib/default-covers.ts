/** Photos Unsplash libres de droits, affichées en cover quand l'artisan n'a pas mis sa propre photo paysage. */
const PHOTO: Record<string, string> = {
  peintre: "1688372199140-cade7ae820fe",
  menuisier: "1687422810663-c316494f725a",
  macon: "1781876633309-cbc3edd4c4e1",
  soudeur: "1569950044190-6d22b2693955",
  cameras: "1496368077930-c1e31b4e5b44",
  mecanicien: "1526583038916-f138f908476b",
  frigoriste: "1792799881226-e841c0f9c125",
};
export const defaultCoverUrl = (slug?: string | null): string | null =>
  slug && PHOTO[slug] ? `https://images.unsplash.com/photo-${PHOTO[slug]}?w=900&h=380&q=75&fm=jpg&fit=crop&auto=format` : null;
/** Les covers « marketing » générées par Bricolo ne sont plus utilisées sur les cartes : on préfère une vraie photo. */
export const isGeneratedCover = (u?: string | null) => !!u && u.includes("/cover-bricolo-");
