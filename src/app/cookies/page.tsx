import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Cookies" };

export default function Cookies() {
  return (
    <LegalPage title="Politique relative aux cookies" intro={`${COMPANY.brand} n’utilise que des cookies indispensables au fonctionnement du service. Aucun cookie publicitaire ou de suivi n’est déposé.`}>
      <h2>Cookies utilisés</h2>
      <div className="tw"><table className="tbl">
        <thead><tr><th>Cookie</th><th>Rôle</th><th>Type</th></tr></thead>
        <tbody>
          <tr><td><code>pays</code></td><td>Mémorise le pays que vous avez choisi pour afficher les bons artisans.</td><td>Indispensable</td></tr>
          <tr><td><code>sb-…-auth-token</code></td><td>Maintient votre session ouverte après la connexion par lien e-mail (espace artisan et administration).</td><td>Indispensable</td></tr>
        </tbody></table></div>

      <h2>Consentement</h2>
      <p>Ces cookies sont strictement nécessaires : ils ne demandent pas de consentement préalable. Si nous ajoutons un jour des cookies de mesure d’audience ou de publicité, nous vous demanderons votre accord avant de les déposer.</p>

      <h2>Les contrôler</h2>
      <p>Vous pouvez supprimer ou bloquer les cookies depuis les réglages de votre navigateur. Sans ces cookies, le choix du pays et la connexion à l’espace artisan ne fonctionneront pas.</p>

      <p>Pour en savoir plus sur vos données : <Link href="/confidentialite">politique de confidentialité</Link>. Contact : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>
    </LegalPage>
  );
}
