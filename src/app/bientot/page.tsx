import type { Metadata } from "next";
import Link from "next/link";
import { joinWaitlist } from "./actions";
import { WAIT_COUNTRIES } from "@/lib/waitlist";

export const metadata: Metadata = {
  title: "Bientôt au Cameroun, au Tchad et au Gabon",
  description: "Bricolo arrive au Cameroun, au Tchad et au Gabon. Inscrivez-vous : artisan, soyez parmi les premiers référencés ; client, soyez prévenu de l’ouverture.",
  alternates: { canonical: "/bientot" },
};

const ERR: Record<string, string> = {
  email: "Cette adresse e-mail ne semble pas valide. Vérifiez-la et réessayez.",
  champs: "Choisissez votre pays et si vous êtes artisan ou client.",
  accord: "Cochez la case pour accepter d’être contacté à l’ouverture.",
  trop: "Trop d’inscriptions depuis cette connexion. Réessayez dans une heure.",
  envoi: "L’inscription n’a pas pu être enregistrée. Réessayez dans un instant.",
};

export default async function Bientot({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const pays = WAIT_COUNTRIES.find(([c]) => c === sp.pays)?.[1];
  return (
    <section className="inner sec stack" style={{ maxWidth: 680 }}>
      <div className="sec-head"><h1 style={{ fontSize: "clamp(26px,4.5vw,40px)" }}>Bientôt au Cameroun, au Tchad et au Gabon</h1></div>
      <p className="seo-intro">Bricolo, l’annuaire des artisans de confiance, prépare son arrivée en Afrique centrale. Laissez votre adresse : nous vous écrivons une seule fois, à l’ouverture de votre pays.</p>
      {sp.merci ? (
        <div className="notice ok" role="status"><b>Merci, c’est noté{pays ? ` pour ${pays}` : ""} !</b> Nous vous écrirons à l’ouverture. En attendant, <Link href="/">découvrez Bricolo</Link>.</div>
      ) : (
        <form action={joinWaitlist} className="card pad stack">
          {sp.erreur && <p className="notice err" role="alert">{ERR[sp.erreur] ?? ERR.envoi}</p>}
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl">Je suis</legend>
            <label className="check"><input type="radio" name="role" value="artisan" required defaultChecked /> Artisan : je veux être référencé parmi les premiers</label>
            <label className="check"><input type="radio" name="role" value="client" /> Client : je cherche des artisans</label>
          </fieldset>
          <div className="fld"><label htmlFor="country">Pays</label>
            <select id="country" name="country" required defaultValue="">
              <option value="" disabled>Choisir un pays</option>
              {WAIT_COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select></div>
          <div className="fld"><label htmlFor="city">Ville (facultatif)</label><input id="city" name="city" type="text" maxLength={60} placeholder="Douala, Yaoundé, N’Djamena, Libreville…" autoComplete="address-level2" /></div>
          <div className="fld"><label htmlFor="trade">Votre métier, si vous êtes artisan (facultatif)</label><input id="trade" name="trade" type="text" maxLength={60} placeholder="Plombier, électricien, menuisier…" /></div>
          <div className="fld"><label htmlFor="email">Adresse e-mail</label><input id="email" name="email" type="email" required maxLength={120} autoComplete="email" inputMode="email" /></div>
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}><label>Ne pas remplir<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className="check"><input type="checkbox" name="accord" required /> J’accepte d’être contacté par e-mail à l’ouverture de mon pays. Mes données ne servent qu’à cela (<Link href="/confidentialite">confidentialité</Link>).</label>
          <button className="btn primary" type="submit">Me prévenir à l’ouverture</button>
        </form>
      )}
    </section>
  );
}
