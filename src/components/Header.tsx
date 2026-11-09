import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import { getCountry } from "@/lib/country";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { setCountry } from "@/app/actions";
import CountrySelect from "./CountrySelect";
import NavMenu from "./NavMenu";

export default async function Header() {
  const country = await getCountry();
  let signedIn = false;
  if (hasSupabase()) {
    try { const db = await supabaseServer(); signedIn = Boolean((await db.auth.getUser()).data.user); } catch { /* en-tête toujours affiché */ }
  }
  return (
    <>
      <header className="top">
        <div className="inner topin">
          <Link className="brand" href="/" aria-label="Bricolo, accueil">
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h6v11h10v7H4z" fill="currentColor" /></svg>
            Bricolo
          </Link>
          <div className="topact">
            {signedIn
              ? <Link className="btn small mlogin" href="/tableau-de-bord">Mon espace</Link>
              : <Link className="btn small mlogin" href="/connexion">Connexion</Link>}
            <NavMenu>
              <nav className="nav" aria-label="Navigation">
                <Link href="/resultats">Trouver un artisan</Link>
                {!signedIn && <Link href="/inscription">Devenir artisan</Link>}
                <form action={setCountry} className="ctry">
                  <label className="lbl" htmlFor="pays">Pays</label>
                  <CountrySelect value={country} options={COUNTRIES.map((c) => ({ code: c.code, name: `${c.emoji} ${c.name}` }))} />
                </form>
                {signedIn ? (
                  <Link className="btn primary navbtn" href="/tableau-de-bord">Mon espace</Link>
                ) : (
                  <>
                    <Link className="btn navbtn plogin" href="/connexion">Connexion</Link>
                    <Link className="btn primary navbtn" href="/inscription">Créer mon profil</Link>
                  </>
                )}
              </nav>
            </NavMenu>
          </div>
        </div>
      </header>
      <div className="ruler" aria-hidden="true" />
    </>
  );
}
