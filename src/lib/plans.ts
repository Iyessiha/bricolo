/** Durées du Forfait Pro. Le prix de base est le prix du mois par pays (table plan_prices). */
export const PLANS = [
  { key: "week", days: 7, label: "1 semaine", note: "Pour essayer" },
  { key: "month", days: 30, label: "1 mois", note: "Le plus simple" },
  { key: "quarter", days: 90, label: "3 mois", note: "Pour la saison" },
  { key: "year", days: 365, label: "1 an", note: "2 mois offerts" },
] as const;
export type PlanKey = (typeof PLANS)[number]["key"];
const r100 = (n: number) => Math.round(n / 100) * 100;
export type PlanRow = { amount: number; week_amount?: number | null; year_amount?: number | null };
/** Prix automatique : semaine = un tiers du mois (sans remise) ; 3 mois = 3 mois ; année = 10 mois facturés. */
export function autoPrice(month: number, key: PlanKey) {
  return key === "week" ? r100(month / 3) : key === "quarter" ? r100(month * 3) : key === "year" ? r100(month * 10) : r100(month);
}
/** Prix final : le prix fixé à la main dans l'admin pour la durée, sinon le prix automatique. */
export function planPrice(row: PlanRow, key: PlanKey) {
  const o = key === "week" ? row.week_amount : key === "year" ? row.year_amount : null;
  return o != null && o > 0 ? o : autoPrice(row.amount, key);
}
export const planByKey = (k: string) => PLANS.find((p) => p.key === k) ?? PLANS[1];
