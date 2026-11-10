/** Une icône par métier (affichée sur l’accueil). Métier inconnu : outil générique. */
export const TRADE_ICONS: Record<string, string> = {
  plombier: "🚰", electricien: "⚡", frigoriste: "❄️", macon: "🧱", peintre: "🎨", mecanicien: "🔧",
  menuisier: "🪚", ebeniste: "🪑", soudeur: "🔥", tapissier: "🛋️", carreleur: "🔲", plaquiste: "🏗️",
  serrurier: "🔑", couvreur: "🏠", electromenager: "🧺", vitrier: "🪟", cameras: "📹", solaire: "☀️",
  carrossier: "🚗", jardinier: "🌿", nettoyage: "🧹", puisatier: "💧", informatique: "💻",
};
export const tradeIcon = (slug: string) => TRADE_ICONS[slug] ?? "🛠️";
