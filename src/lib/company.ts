/** Fiche légale de la société. Un seul endroit à modifier : toutes les pages légales et le pied de page la lisent. */
export const COMPANY = {
  name: "MonWe Infinity LLC",
  brand: "Bricolo",
  legalForm: "société à responsabilité limitée (Limited Liability Company, LLC) de droit américain, immatriculée dans l’État du Nouveau-Mexique (États-Unis)",
  manager: "Ilboudo Yessiha",
  managerTitle: "Gérante",
  email: "monweci@gmail.com",
  activityPlace: "Bingerville, Abidjan, Côte d’Ivoire",
  /** Facultatifs : renseignez-les, ils s’affichent automatiquement dans les mentions légales. */
  registrationNumber: "" as string,
  postalAddress: "" as string,
  phone: "" as string,
} as const;

export const LEGAL_UPDATED = "9 novembre 2026";

export const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/conditions-utilisation", label: "Conditions d’utilisation" },
  { href: "/conditions-boosts", label: "Conditions des boosts" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
] as const;
