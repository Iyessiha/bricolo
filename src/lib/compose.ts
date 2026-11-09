const UNIT_LABEL: Record<string, string> = { intervention: "par intervention", heure: "par heure", jour: "par jour", "m²": "par m²", "mètre": "par mètre", "pièce": "par pièce" };
/** Tarif construit à partir du montant et de l'unité choisis ; l'ancien champ libre reste accepté. */
export function priceLabel(f: FormData): string | null {
  if (!f.has("price_unit")) return String(f.get("price_label") ?? "").trim().slice(0, 60) || null;
  const unit = String(f.get("price_unit"));
  if (unit === "devis") return "Sur devis gratuit";
  const n = parseInt(String(f.get("price_amount") ?? "").replace(/\D/g, ""), 10);
  if (!n || n < 100 || n > 10_000_000 || !UNIT_LABEL[unit]) return null;
  return `Dès ${n} F ${UNIT_LABEL[unit]}`;
}


/** « Je vais … » : retire un éventuel préfixe saisi deux fois, normalise les espaces et la première lettre. */
export function composeHeadline(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const rest = raw.trim().replace(/^je\s+vais\s+/i, "").replace(/\s+/g, " ");
  if (rest.length < 8) return { ok: false, error: "Complétez votre promesse : « Je vais … » (8 caractères minimum)." };
  if (rest.length > 70) return { ok: false, error: "Votre promesse est trop longue (70 caractères maximum)." };
  return { ok: true, value: `Je vais ${rest.charAt(0).toLowerCase()}${rest.slice(1)}` };
}
