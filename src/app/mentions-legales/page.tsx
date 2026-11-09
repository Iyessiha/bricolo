import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Mentions légales" };

export default function Mentions() {
  return (
    <LegalPage title="Mentions légales" intro={`Le site et le service ${COMPANY.brand} sont édités et exploités par ${COMPANY.name}.`}>
      <h2>Éditeur et propriétaire</h2>
      <p><b>{COMPANY.name}</b>, {COMPANY.legalForm}.</p>
      <ul>
        <li>Représentée par : {COMPANY.manager}, {COMPANY.managerTitle.toLowerCase()}</li>
        <li>Directrice de la publication : {COMPANY.manager}</li>
        <li>Activité exercée depuis : {COMPANY.activityPlace}</li>
        {COMPANY.registrationNumber && <li>Numéro d’immatriculation : {COMPANY.registrationNumber}</li>}
        {COMPANY.postalAddress && <li>Adresse : {COMPANY.postalAddress}</li>}
        <li>Contact : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>{COMPANY.phone && ` · ${COMPANY.phone}`}</li>
      </ul>
      <p>{COMPANY.brand} est une marque et un service de {COMPANY.name}, qui en est l’unique propriétaire légal.</p>

      <h2>Hébergement et prestataires techniques</h2>
      <ul>
        <li>Site web : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.</li>
        <li>Base de données et authentification : Supabase, données hébergées dans l’Union européenne (Irlande).</li>
        <li>Envoi des e-mails : Resend, États-Unis.</li>
        <li>Paiements Mobile Money : GeniusPay.</li>
      </ul>

      <h2>Nature du service</h2>
      <p>{COMPANY.brand} est un annuaire et un service de mise en relation entre des clients et des artisans de l’Afrique de l’Ouest francophone (zone FCFA). {COMPANY.name} n’est pas partie aux contrats conclus entre un client et un artisan, et n’intervient pas dans la réalisation ni le paiement des travaux.</p>

      <h2>Propriété intellectuelle</h2>
      <p>La marque {COMPANY.brand}, le logo, la charte graphique, les textes, le code et la structure du site sont la propriété de {COMPANY.name}. Toute reproduction, extraction ou réutilisation sans autorisation écrite est interdite. Les contenus publiés par les artisans (textes, photos) restent leur propriété ; ils accordent à {COMPANY.brand} le droit de les afficher sur le service (voir les <Link href="/conditions-utilisation">conditions d’utilisation</Link>).</p>

      <h2>Données personnelles et cookies</h2>
      <p>Le traitement des données personnelles est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>, et l’usage des cookies dans la <Link href="/cookies">politique relative aux cookies</Link>.</p>

      <h2>Signalement d’un contenu</h2>
      <p>Pour signaler un profil, un contenu illicite ou une atteinte à vos droits, écrivez à <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> en indiquant la page concernée et le motif. Nous examinons chaque signalement dans les meilleurs délais.</p>

      <h2>Droit applicable</h2>
      <p>Le site est soumis au droit de la République de Côte d’Ivoire, sans préjudice des dispositions impératives de protection du consommateur applicables dans le pays de résidence de l’utilisateur.</p>
    </LegalPage>
  );
}
