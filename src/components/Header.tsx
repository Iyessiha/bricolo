import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import { getCountry } from "@/lib/country";
import { setCountry } from "@/app/actions";
import CountrySelect from "./CountrySelect";

export default async function Header() {
  const country = await getCountry();
  return (
    <>
      <header className="top">
        <div className="inner topin">
          <Link className="brand" href="/" aria-label="Bricolo, accueil">
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h6v11h10v7H4z" fill="currentColor" /></svg>
            Bricolo
          </Link>
          <nav className="nav" aria-label="Navigation">
            <Link href="/resultats">Trouver un artisan</Link>
            <Link href="/inscription">Devenir artisan</Link>
            <Link href="/tableau-de-bord">Mon espace</Link>
            <form action={setCountry} className="ctry">
              <label className="lbl" htmlFor="pays">Pays</label>
              <CountrySelect value={country} options={COUNTRIES.map((c) => ({ code: c.code, name: c.name }))} />
            </form>
          </nav>
        </div>
      </header>
      <div className="ruler" aria-hidden="true" />
    </>
  );
}
