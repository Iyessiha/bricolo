import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Conditions d’utilisation" };

export default function Cgu() {
  const B = COMPANY.brand, C = COMPANY.name;
  return (
    <LegalPage title="Conditions générales d’utilisation" intro={`Ces conditions encadrent l’utilisation du site et du service ${B}, édités par ${C}. En créant un compte ou en utilisant le service, vous les acceptez.`}>
      <h2>1. Le service</h2>
      <p>{B} est un annuaire d’artisans (frigoristes, mécaniciens, menuisiers, électriciens, plombiers, etc.) présents dans les pays francophones de la zone FCFA. Il permet aux clients de trouver un artisan et de le contacter, et aux artisans de présenter leur activité. {B} est un intermédiaire de mise en relation : {C} n’est ni l’employeur, ni le mandataire, ni le garant des artisans.</p>

      <h2>2. Accès et gratuité</h2>
      <p>La consultation de l’annuaire et l’envoi d’une demande à un artisan sont gratuits pour les clients, sans compte. La création d’un profil artisan est gratuite. Seuls les services optionnels de mise en avant, proposés aux artisans dans leur espace personnel, sont payants, selon leurs <Link href="/conditions-boosts">conditions de vente</Link>.</p>

      <h2>3. Compte artisan</h2>
      <ul>
        <li>Vous devez être majeur et exercer une activité professionnelle ou artisanale réelle.</li>
        <li>L’accès se fait par un lien envoyé à votre adresse e-mail (ou par mot de passe si un a été défini pour votre compte). Vous êtes responsable de l’accès à cette boîte e-mail et de la confidentialité de vos identifiants.</li>
        <li>Vous choisissez votre pays à l’inscription ; votre profil est affiché aux clients de ce pays.</li>
        <li>Si vous créez le profil au nom d’une entreprise, vous déclarez être habilité(e) à l’engager et à accepter ces conditions pour elle ; l’entreprise est alors responsable du profil.</li>
        <li>Un compte correspond à un profil. Les informations fournies doivent être exactes et à jour.</li>
        <li><b>Vérification d’identité obligatoire</b> : avant toute activation, vous devez envoyer une photo de profil, une pièce d’identité valide et un selfie tenant cette pièce. Le profil n’est publié qu’après leur contrôle par {C}. Vous certifiez que ces documents sont authentiques et vous appartiennent ; l’envoi de faux documents entraîne la suppression du compte.</li>
        <li>Les années d’expérience que vous indiquez doivent être exactes. Un diplôme peut être soumis à vérification ; la mention « Diplôme vérifié » indique seulement que le document a été examiné.</li>
        <li>Tout profil est examiné avant publication. {C} peut refuser, suspendre ou supprimer un profil qui ne respecte pas ces conditions.</li>
      </ul>

      <h2>4. Engagements des artisans</h2>
      <ul>
        <li>Présenter honnêtement vos services, vos zones et vos tarifs indicatifs ; ne pas usurper l’identité ou les références d’un tiers.</li>
        <li>Ne publier que des contenus (textes, photos) dont vous détenez les droits, sans contenu illicite, trompeur, discriminatoire ou offensant.</li>
        <li>Répondre avec courtoisie et dans un délai raisonnable aux demandes reçues, et respecter vos engagements envers vos clients.</li>
        <li>Ne pas détourner le service (faux avis, manipulation du classement, collecte de données sur d’autres utilisateurs, envoi de messages non sollicités).</li>
      </ul>

      <h2>5. Clients</h2>
      <p>Lorsque vous envoyez une demande, votre message et votre adresse e-mail sont transmis à l’artisan pour qu’il puisse vous répondre. Vous êtes libre de choisir ou non l’artisan, et de convenir avec lui du prix et des conditions des travaux. Faites un devis avant tout chantier important.</p>

      <h2>6. Badge « Vérifié » et classement</h2>
      <p>Le badge « Vérifié » indique que {C} a contrôlé certaines informations fournies par l’artisan. Il ne constitue ni une garantie de qualité, ni une certification, ni une assurance sur les travaux. Les résultats de recherche mettent en tête les artisans ayant acheté un boost, signalés par la mention « Sponsorisé », puis classent les autres selon leurs informations, leurs avis et leur badge.</p>

      <h2>7. Contenus publiés</h2>
      <p>Vous conservez vos droits sur vos contenus. Vous accordez à {C} une licence gratuite, non exclusive, pour la durée d’existence de votre profil, afin de les afficher et de les reproduire sur {B} dans le cadre du service.</p>

      <h2>8. Responsabilité</h2>
      <p>{C} s’efforce d’assurer la disponibilité et l’exactitude du service mais ne garantit pas qu’il soit exempt d’interruptions ou d’erreurs. {C} n’est pas responsable de la qualité, de la sécurité, du prix ou de la bonne exécution des prestations réalisées par les artisans, ni des litiges entre clients et artisans, ni des informations publiées par les artisans. Rien dans ces conditions n’exclut une responsabilité qui ne peut l’être légalement.</p>

      <h2>9. Suspension et résiliation</h2>
      <p>Vous pouvez demander la suppression de votre compte à tout moment à <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. {C} peut suspendre ou supprimer un compte en cas de manquement à ces conditions, de fraude ou de contenu illicite, avec ou sans préavis selon la gravité.</p>

      <h2>10. Données personnelles</h2>
      <p>Les données sont traitées conformément à la <Link href="/confidentialite">politique de confidentialité</Link>.</p>

      <h2>11. Modification des conditions</h2>
      <p>Nous pouvons modifier ces conditions pour tenir compte de l’évolution du service ou de la loi. La date de mise à jour figure en haut de la page ; l’usage du service après modification vaut acceptation.</p>

      <h2>12. Droit applicable et litiges</h2>
      <p>Ces conditions sont régies par le droit de la République de Côte d’Ivoire, sans préjudice des dispositions impératives de protection du consommateur de votre pays de résidence. En cas de litige, contactez-nous d’abord à <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> pour rechercher une solution amiable. À défaut, les tribunaux compétents d’Abidjan seront saisis.</p>
    </LegalPage>
  );
}
