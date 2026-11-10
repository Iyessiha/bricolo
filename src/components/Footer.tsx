import Link from "next/link";
import { COMPANY, LEGAL_LINKS } from "@/lib/company";
import { COUNTRIES } from "@/lib/countries";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="inner footgrid">
        <div className="stack" style={{ gap: 8 }}>
          <b className="footbrand">{COMPANY.brand}</b>
          <p>L’annuaire des artisans de l’Afrique de l’Ouest francophone : Côte d’Ivoire, Sénégal, Burkina Faso, Mali, Niger, Bénin et Togo.</p>
        </div>
        <nav aria-label="Service" className="footcol">
          <b>Service</b>
          <Link href="/resultats">Trouver un artisan</Link>
          <Link href="/inscription">Devenir artisan</Link>
          <Link href="/connexion">Connexion</Link>
        </nav>
        <nav aria-label="Artisans par pays" className="footcol">
          <b>Artisans par pays</b>
          {COUNTRIES.map((c) => <Link key={c.code} href={`/artisans/${c.code}`}>{c.name}</Link>)}
        </nav>
        <nav aria-label="Informations légales" className="footcol">
          <b>Informations légales</b>
          {LEGAL_LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
      </div>
      <div className="inner footbase">
        © {new Date().getFullYear()} {COMPANY.name}. {COMPANY.brand} est une marque exploitée par {COMPANY.name}, propriétaire légal du service. Tous droits réservés.
      </div>
    </footer>
  );
}
