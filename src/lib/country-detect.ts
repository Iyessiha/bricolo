import { isCountry, type CountryCode } from "./countries";

/**
 * Pays à appliquer à une requête, par ordre de priorité :
 * 1. paramètre d’adresse `?pays=bf` (liens des publicités) ;
 * 2. choix déjà fait par le visiteur (cookie « pays ») : on ne le change pas ;
 * 3. pays de la connexion (en-tête Vercel `x-vercel-ip-country`) s’il fait partie des 7 pays.
 * Renvoie null quand rien ne change (cookie déjà posé, ou pays hors zone : Côte d’Ivoire par défaut ailleurs).
 */
export function countryToSet(opts: { param?: string | null; cookie?: string | null; geo?: string | null }): CountryCode | null {
  const param = (opts.param ?? "").toLowerCase();
  if (isCountry(param)) return param === opts.cookie ? null : param;
  if (opts.cookie) return null;
  const geo = (opts.geo ?? "").toLowerCase();
  return isCountry(geo) ? geo : null;
}
