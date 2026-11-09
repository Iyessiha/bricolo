const nf = new Intl.NumberFormat("fr-FR");
export const fcfa = (n: number) => `${nf.format(n)} FCFA`;
export const initials = (name: string) =>
  name.split(/[\s&'’-]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("");
export function timeLeft(endsAt: string) {
  const h = Math.max(0, Math.round((new Date(endsAt).getTime() - Date.now()) / 36e5));
  return h >= 24 ? `${Math.floor(h / 24)} j ${h % 24} h` : `${h} h`;
}
export const DURATIONS: Record<number, string> = { 24: "24 h", 72: "3 jours", 168: "7 jours" };
export const BOOST_TYPES: Record<string, { name: string; text: string }> = {
  recherche: { name: "Boost recherche", text: "Passe en tête des résultats de votre métier dans la zone choisie." },
  accueil: { name: "Boost accueil", text: "Apparaît dans « Artisans à la une » sur la page d’accueil." },
  urgence: { name: "Boost urgence", text: "Reçoit en premier les demandes de dépannage." },
  cible: { name: "Boost ciblé", text: "Mise en avant dans une zone précise, au prix de la demande de la zone." },
};

/** Tarif saisi librement par l'artisan → affichage propre : « 5000 » devient « Dès 5 000 FCFA », « 5000-10000f » devient « 5 000 – 10 000 FCFA ». */
export function priceText(raw?: string | null): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const nums = t.match(/\d[\d\s.,]*\d|\d/g);
  if (!nums) return t; // « Sur devis », « Selon travaux »…
  let out = t.replace(/\d[\d\s.,]*\d|\d/g, (m) => nf.format(Number(m.replace(/[\s.,]/g, ""))));
  out = out.replace(/\s*-\s*/g, " – ").replace(/\s*(fcfa|f\s*cfa|xof|francs?|frs?|f)(?![a-zà-ÿ])\.?/gi, " FCFA").replace(/\s{2,}/g, " ").trim();
  if (!/FCFA/.test(out)) out = out.replace(/(\d)(?!.*\d)/, "$1 FCFA");
  if (/^\d/.test(out) && !out.includes("–")) out = `Dès ${out}`;
  return out;
}
