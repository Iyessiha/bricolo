import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Privacy() {
  const B = COMPANY.brand, C = COMPANY.name;
  return (
    <LegalPage title="Politique de confidentialité" intro={`${C}, qui édite ${B}, protège vos données personnelles. Cette page explique ce que nous collectons, pourquoi, et comment exercer vos droits.`}>
      <h2>1. Responsable du traitement</h2>
      <p>{C}, {COMPANY.legalForm}. Représentante : {COMPANY.manager}, {COMPANY.managerTitle.toLowerCase()}. Contact pour toute question sur vos données : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><b>Artisans</b> : adresse e-mail, pays, statut (individuel ou entreprise), nom de l’activité ou de l’entreprise, numéro d’immatriculation de l’entreprise (jamais publié), métier, zones couvertes, description, tarif indicatif, numéros de téléphone et WhatsApp, et le moment où vous avez accepté les conditions.</li>
        <li><b>Clients</b> (sans compte) : adresse e-mail, nom (facultatif) et contenu de la demande envoyée à un artisan.</li>
        <li><b>Paiements des boosts</b> : référence de transaction, montant, statut et date. Les identifiants de paiement Mobile Money sont traités par GeniusPay et ne sont pas conservés par {C}.</li>
        <li><b>Statistiques de fiche</b> : nombre de vues, de clics sur « Appeler » et « WhatsApp » et de demandes, communiqués à l’artisan concerné. Ils ne sont pas rattachés à l’identité du visiteur.</li>
        <li><b>Données techniques</b> : cookies indispensables (session, pays choisi) et journaux de fonctionnement. Voir la <Link href="/cookies">politique relative aux cookies</Link>.</li>
        <li><b>E-mails</b> : journal des messages envoyés par le service et préférence de désabonnement marketing.</li>
      </ul>

      <h2>3. Pourquoi nous les utilisons</h2>
      <ul>
        <li>Créer et gérer votre compte, publier votre profil, mettre en relation clients et artisans (exécution du service).</li>
        <li>Traiter les paiements de boosts et envoyer les reçus (exécution du contrat, obligations comptables).</li>
        <li>Envoyer les messages liés au service : connexion, validation du profil, demandes reçues, rappels de fin de boost (exécution du service).</li>
        <li>Envoyer des messages marketing aux artisans (offres, nouveautés, relances) : sur la base de notre intérêt légitime à promouvoir nos services auprès de nos utilisateurs, avec un lien de désabonnement dans chaque message.</li>
        <li>Sécuriser le service, prévenir la fraude et améliorer {B} (intérêt légitime).</li>
      </ul>

      <h2>4. À qui nous les transmettons</h2>
      <ul>
        <li><b>L’artisan</b> que vous contactez reçoit votre demande, votre nom éventuel et votre adresse e-mail.</li>
        <li><b>Les visiteurs</b> voient les informations publiques d’un profil validé : nom de l’activité, métier, zones, description, tarif, téléphone et WhatsApp.</li>
        <li><b>Nos prestataires</b>, uniquement pour faire fonctionner le service : Supabase (base de données et authentification, Union européenne), Vercel (hébergement du site, États-Unis), Resend (envoi d’e-mails, États-Unis), GeniusPay (paiements).</li>
        <li>Les autorités, lorsque la loi l’exige.</li>
      </ul>
      <p>Nous ne vendons pas vos données. Certains prestataires sont situés hors de votre pays ; ils sont tenus par contrat de protéger vos données et de ne les utiliser que pour notre compte.</p>

      <h2>5. Durée de conservation</h2>
      <p>Les données d’un compte sont conservées tant que le compte est actif. À la suppression du compte, elles sont effacées ou anonymisées, sauf celles que la loi nous oblige à garder (par exemple les justificatifs de paiement). Les demandes envoyées par les clients ne sont conservées que le temps nécessaire à la mise en relation.</p>

      <h2>6. Vos droits</h2>
      <p>Vous pouvez demander l’accès à vos données, leur rectification, leur suppression, la limitation ou l’opposition à leur traitement, et leur portabilité. Vous pouvez aussi retirer à tout moment votre consentement et vous désabonner des messages marketing en un clic. Écrivez à <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ; nous répondons dans un délai d’un mois. Une pièce d’identité peut vous être demandée pour vérifier votre identité.</p>
      <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l’autorité de protection des données de votre pays : ARTCI (Côte d’Ivoire), CDP (Sénégal), CIL (Burkina Faso), APDP (Mali), HAPDP (Niger), APDP (Bénin), IPDCP (Togo).</p>

      <h2>7. Sécurité</h2>
      <p>Les échanges sont chiffrés (HTTPS), l’accès au compte se fait par lien à usage unique sans mot de passe, et les données sont protégées par des règles d’accès strictes dans la base de données. Aucun système n’étant infaillible, nous vous invitons à protéger l’accès à votre boîte e-mail.</p>

      <h2>8. Mineurs</h2>
      <p>{B} s’adresse à des professionnels majeurs. Nous ne collectons pas sciemment de données d’enfants.</p>

      <h2>9. Modifications</h2>
      <p>Nous pouvons mettre à jour cette politique ; la date de mise à jour figure en haut de la page.</p>
    </LegalPage>
  );
}
