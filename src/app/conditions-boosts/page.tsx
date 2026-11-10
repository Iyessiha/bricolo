import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Conditions des boosts", robots: { index: false, follow: false } };

export default function Boosts() {
  const B = COMPANY.brand, C = COMPANY.name;
  return (
    <LegalPage title="Conditions de vente des boosts" intro={`Les boosts sont des services payants de mise en avant proposés aux artisans par ${C} sur ${B}.`}>
      <p>Ces conditions complètent les <Link href="/conditions-utilisation">conditions générales d’utilisation</Link>.</p>

      <h2>1. Les boosts</h2>
      <ul>
        <li><b>Boost recherche</b> : mise en avant dans les résultats de votre métier.</li>
        <li><b>Boost accueil</b> : mise en avant sur la page d’accueil de votre pays.</li>
        <li><b>Boost urgence</b> : badge « Urgences » sur votre fiche et priorité dans les recherches « Dépannage urgent ».</li>
        <li><b>Boost ciblé</b> : mise en avant dans une zone précise.</li>
      </ul>
      <p>Durées proposées : 24 heures, 3 jours ou 7 jours. Les contenus boostés sont signalés par la mention « Mis en avant ».</p>

      <h2>2. Réservé aux profils validés</h2>
      <p>Seuls les artisans dont le profil est validé et dont l’identité est vérifiée (badge « Vérifié ») peuvent acheter un boost. Un boost est suspendu pendant la suspension du profil ou si le badge « Vérifié » est retiré ; lorsque cela résulte d’un manquement à la charte de l’artisan, la durée restante n’est ni prolongée ni remboursée.</p>

      <h2>3. Prix</h2>
      <p>Les prix sont exprimés en francs CFA (FCFA) et affichés dans votre espace artisan avant le paiement, par pays, durée et type de boost. Le prix applicable est celui affiché au moment de votre commande. {C} peut modifier ses tarifs à tout moment, sans effet sur les boosts déjà payés.</p>

      <h2>4. Commande et paiement</h2>
      <p>Le paiement s’effectue en ligne par Mobile Money via notre prestataire de paiement GeniusPay. Le boost est activé automatiquement dès que le paiement est confirmé, et un reçu vous est envoyé par e-mail. {C} ne stocke pas vos identifiants de paiement Mobile Money.</p>

      <h2>5. Emplacements limités</h2>
      <p>Pour garder leur valeur, le nombre d’emplacements est limité par métier, par zone et par pays. Si tous les emplacements d’un créneau sont occupés, l’achat est refusé avant paiement. Le renouvellement d’un boost que vous avez déjà est toujours possible : la durée achetée s’ajoute à la durée restante.</p>

      <h2>6. Pas de garantie de résultat</h2>
      <p>Un boost améliore la visibilité de votre profil. Il ne garantit ni un nombre de vues, d’appels ou de demandes, ni un chiffre d’affaires. Parmi les artisans mis en avant, l’ordre d’affichage tourne pour que chacun bénéficie d’une exposition équitable.</p>

      <h2>7. Droit de rétractation et remboursement</h2>
      <p>Le boost est un service numérique exécuté immédiatement après le paiement, à votre demande. Dès son activation, il ne peut plus être annulé ni remboursé, dans la mesure permise par la loi applicable. Si, en raison d’une erreur technique de notre part, un boost payé n’est pas activé, nous l’activons ou, à défaut, nous le remboursons. Écrivez-nous à <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> avec la référence de votre paiement.</p>

      <h2>8. Suspension d’un boost</h2>
      <p>Si votre profil est suspendu ou supprimé pour manquement aux conditions d’utilisation, vos boosts en cours prennent fin sans remboursement.</p>

      <h2>9. Réclamations</h2>
      <p>Pour toute question ou réclamation sur un paiement ou un boost : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Droit applicable et règlement des litiges : voir les conditions d’utilisation.</p>
    </LegalPage>
  );
}
