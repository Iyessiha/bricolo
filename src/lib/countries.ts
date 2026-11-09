export const COUNTRIES = [
  { code: "ci", name: "Côte d’Ivoire", capital: "Abidjan" },
  { code: "sn", name: "Sénégal", capital: "Dakar" },
  { code: "bf", name: "Burkina Faso", capital: "Ouagadougou" },
  { code: "ml", name: "Mali", capital: "Bamako" },
  { code: "ne", name: "Niger", capital: "Niamey" },
  { code: "bj", name: "Bénin", capital: "Cotonou" },
  { code: "tg", name: "Togo", capital: "Lomé" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];
export const DEFAULT_COUNTRY: CountryCode = "ci";

export function isCountry(code: unknown): code is CountryCode {
  return typeof code === "string" && COUNTRIES.some((c) => c.code === code);
}
export function countryName(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
export function countryCapital(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.capital ?? "";
}
