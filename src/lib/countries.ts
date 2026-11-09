export const COUNTRIES = [
  { code: "ci", emoji: "🇨🇮", name: "Côte d’Ivoire", capital: "Abidjan" },
  { code: "sn", emoji: "🇸🇳", name: "Sénégal", capital: "Dakar" },
  { code: "bf", emoji: "🇧🇫", name: "Burkina Faso", capital: "Ouagadougou" },
  { code: "ml", emoji: "🇲🇱", name: "Mali", capital: "Bamako" },
  { code: "ne", emoji: "🇳🇪", name: "Niger", capital: "Niamey" },
  { code: "bj", emoji: "🇧🇯", name: "Bénin", capital: "Cotonou" },
  { code: "tg", emoji: "🇹🇬", name: "Togo", capital: "Lomé" },
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
export function countryEmoji(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.emoji ?? "";
}
