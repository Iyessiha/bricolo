/** Règles de format des images publiques, partagées par le navigateur (contrôle immédiat) et le serveur (contrôle définitif). */
export const COVER = { minWidth: 1200, minRatio: 2.4, maxRatio: 2.95, label: "1600 × 600 px" };
export const SHOT = { minSide: 600 };

export function coverProblem(w: number, h: number): "paysage" | "petite" | null {
  if (!w || !h) return "paysage";
  const r = w / h;
  if (r < COVER.minRatio || r > COVER.maxRatio) return "paysage";
  if (w < COVER.minWidth) return "petite";
  return null;
}
export const shotProblem = (w: number, h: number): "petite" | null => (Math.max(w, h) < SHOT.minSide ? "petite" : null);
