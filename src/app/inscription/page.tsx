import type { Metadata } from "next";
import Link from "next/link";
import { COUNTRIES, countryName, isCountry } from "@/lib/countries";
import { hasSupabase } from "@/lib/env";
import SetupNotice from "@/components/SetupNotice";
import { sendMagicLink } from "../auth-actions";

export const metadata: Metadata = { title: "Devenir artisan" };

export default async function Signup({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const pays = isCountry(sp.pays) ? sp.pays : null;
  return (
    <section className="inner sec">
      <div className="narrow card pad stack">
        {!pays && (
          <>
            <h1 style={{ fontSize: 32 }}>Dans quel pays travaillez-vous ?</h1>
            <p className="muted">Votre profil sera affiché aux clients de ce pays. La création est gratuite.</p>
            <div className="opts">
              {COUNTRIES.map((c) => (
                <Link key={c.code} className="tile" href={`/inscription?pays=${c.code}`}><b>{c.name}</b><span>{c.capital}</span></Link>
              ))}
            </div>
          </>
        )}
        {pays && sp.envoye === "1" && (
          <>
            <h1 style={{ fontSize: 32 }}>Vérifiez votre boîte e-mail</h1>
            <p>Nous avons envoyé un lien de confirmation à <b>{sp.email}</b>. Ouvrez-le depuis cet appareil pour créer votre profil.</p>
            <p className="hint">Pas de message ? Regardez dans les courriers indésirables, ou <Link href={`/inscription?pays=${pays}`}>renvoyez le lien</Link>.</p>
          </>
        )}
        {pays && sp.envoye !== "1" && (
          <>
            <h1 style={{ fontSize: 32 }}>Votre adresse e-mail</h1>
            <p className="muted">Pays : <b>{countryName(pays)}</b> · <Link href="/inscription">Changer</Link>. Aucun mot de passe : nous envoyons un lien de confirmation.</p>
            {sp.erreur && <p className="notice err">{sp.erreur === "email" ? "Cette adresse e-mail n’est pas valide." : "L’envoi a échoué. Réessayez dans un instant."}</p>}
            <form action={sendMagicLink} className="stack">
              <input type="hidden" name="pays" value={pays} />
              <div className="fld"><label htmlFor="email">Adresse e-mail</label><input type="email" id="email" name="email" required autoComplete="email" placeholder="vous@exemple.com" /></div>
              <button className="btn primary" type="submit">Recevoir le lien de confirmation</button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

export const dynamic = "force-dynamic";
