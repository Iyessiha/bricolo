/** Numéro saisi (local ou +indicatif) → chiffres avec indicatif pays, ou null si invalide. */
export function normalizePhone(raw: string, prefix: string): string | null {
  if (!raw) return null;
  const intl = /^\s*(\+|00)/.test(raw);
  let d = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("00")) d = d.slice(2);
  if (!intl) d = prefix.replace(/\D/g, "") + d;
  return d.length >= 9 && d.length <= 15 ? d : null;
}

