import { cookies } from "next/headers";
import { DEFAULT_COUNTRY, isCountry, type CountryCode } from "./countries";

/** Pays affiché au visiteur (cookie « pays »), Côte d’Ivoire par défaut. */
export async function getCountry(): Promise<CountryCode> {
  const value = (await cookies()).get("pays")?.value;
  return isCountry(value) ? value : DEFAULT_COUNTRY;
}
