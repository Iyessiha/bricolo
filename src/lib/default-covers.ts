/** Photos Unsplash libres de droits, affichées en cover quand l'artisan n'a pas mis sa propre photo paysage. */
const PHOTO: Record<string, string> = {
  peintre: "1688372199140-cade7ae820fe",
  menuisier: "1687422810663-c316494f725a",
  macon: "1781876633309-cbc3edd4c4e1",
  soudeur: "1569950044190-6d22b2693955",
  cameras: "1496368077930-c1e31b4e5b44",
  mecanicien: "1526583038916-f138f908476b",
  frigoriste: "1792799881226-e841c0f9c125",
  electricien: "1621905251189-08b45d6a269e",
  plombier: "1676210134188-4c05dd172f89",
  carreleur: "1522061541612-28ef361a3045",
  serrurier: "1585914641050-fa9883c4e21c",
  couvreur: "1726589004565-bedfba94d3a2",
  solaire: "1668097613572-40b7c11c8727",
  jardinier: "1637531347055-4fa8aa80c111",
  informatique: "1639776738932-956082f0b704",
};
/** Métiers sans photo dédiée : une photo de chantier du site, jamais un pictogramme. */
const GENERIC = "/photos/artisane-chantier.jpg";
export const defaultCoverUrl = (slug?: string | null): string =>
  slug && PHOTO[slug] ? `https://images.unsplash.com/photo-${PHOTO[slug]}?w=900&h=380&q=75&fm=jpg&fit=crop&auto=format` : GENERIC;
/** Les covers « marketing » générées par Bricolo ne sont plus utilisées sur les cartes : on préfère une vraie photo. */
export const isGeneratedCover = (u?: string | null) => !!u && u.includes("/cover-bricolo-");
