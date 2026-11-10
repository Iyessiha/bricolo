/** Durées du Forfait Pro. Le prix de base est le prix du mois par pays (table plan_prices). */
export const PLANS = [
  { key: "week", days: 7, label: "1 semaine", note: "Pour essayer" },
  { key: "month", days: 30, label: "1 mois", note: "Le plus simple" },
  { key: "year", days: 365, label: "1 an", note: "2 mois offerts" },
] as const;
export type PlanKey = (typeof PLANS)[number]["key"];
const r100 = (n: number) => Math.round(n / 100) * 100;
/** Semaine = un tiers du mois (sans remise) ; année = 10 mois facturés. */
export function planPrice(month: number, key: PlanKey) {
  return key === "week" ? r100(month / 3) : key === "year" ? r100(month * 10) : r100(month);
}
export const planByKey = (k: string) => PLANS.find((p) => p.key === k) ?? PLANS[1];
