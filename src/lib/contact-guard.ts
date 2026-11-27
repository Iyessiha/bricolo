/** Les clients contactent l'artisan par les boutons de la fiche (WhatsApp, appel, message Bricolo) : ni numéro, ni e-mail, ni lien de messagerie dans les textes libres. */
const DEVISE = /^\s*(f\s*cfa|fcfa|cfa|xof|f\b|francs?)/i;
const MILLIERS = /^\d{1,3}([ .  ]\d{3})+$/;

export type ContactKind = "telephone" | "email" | "lien";

export function findContact(text: string | null | undefined): ContactKind | null {
  const t = String(text ?? "");
  if (!t) return null;
  if (/[\w.+-]+\s?(@|\(at\)|\[at\])\s?[\w-]+\s?(\.|\(dot\)|\[dot\])\s?[a-z]{2,}/i.test(t)) return "email";
  if (/(wa\.me|whatsapp\.com|t\.me|chat\.whatsapp)/i.test(t)) return "lien";
  const re = /(?:\+|00)?\d(?:[ .\-–()  ]*\d){7,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const raw = m[0].trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8) continue;
    // « 10 000 000 FCFA » est un prix, pas un numéro.
    if (MILLIERS.test(raw) && DEVISE.test(t.slice(m.index + m[0].length, m.index + m[0].length + 12))) continue;
    if (DEVISE.test(t.slice(m.index + m[0].length, m.index + m[0].length + 12)) && !/^[+0]/.test(raw)) continue;
    return "telephone";
  }
  return null;
}

export const CONTACT_MESSAGES: Record<ContactKind, string> = {
  telephone: "Retirez le numéro de téléphone de ce texte : les clients vous joignent avec les boutons WhatsApp et Appeler de votre fiche, qui utilisent le numéro que vous avez indiqué.",
  email: "Retirez l’adresse e-mail de ce texte : les clients vous écrivent avec le bouton Message de votre fiche.",
  lien: "Retirez le lien de messagerie de ce texte : les clients vous joignent avec les boutons de votre fiche.",
};

/** Message d'erreur si l'un des textes contient une coordonnée, sinon null. `champs` : { libellé: texte }. */
export function contactError(champs: Record<string, string | string[] | null | undefined>): string | null {
  for (const [label, v] of Object.entries(champs)) {
    const k = findContact(Array.isArray(v) ? v.join("\n") : v);
    if (k) return `${label} : ${CONTACT_MESSAGES[k]}`;
  }
  return null;
}
