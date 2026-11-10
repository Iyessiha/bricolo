import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Charte de l’artisan" };

export default function Charte() {
  const B = COMPANY.brand;
  return (
    <LegalPage title="Charte de l’artisan" intro={`${B} met en relation des clients et des artisans. La confiance est ce qui fait la valeur du service : en créant un profil, vous vous engagez à respecter les règles ci-dessous.`}>
      <h2>Vos engagements</h2>
      <ol>
        <li><b>Des informations vraies.</b> Votre identité, votre métier, vos zones d’intervention, vos tarifs et vos photos sont réels. Les photos de réalisations sont les vôtres.</li>
        <li><b>Un prix clair.</b> Annoncez le prix ou une fourchette avant de commencer, et ne le changez pas sans l’accord du client.</li>
        <li><b>Pas de paiement abusif à l’avance.</b> Vous ne demandez jamais la totalité du prix avant le travail. Un acompte raisonnable pour acheter le matériel est acceptable, le solde se règle une fois le travail terminé et accepté.</li>
        <li><b>Un travail soigné et honnête.</b> Vous faites ce que vous avez annoncé, dans les délais convenus, ou vous prévenez à temps. Vous n’intervenez que dans les métiers que vous maîtrisez.</li>
        <li><b>Du respect.</b> Politesse, ponctualité, respect des personnes et de leur domicile. Aucun harcèlement, aucune pression, aucun propos discriminatoire.</li>
        <li><b>Pas de contournement frauduleux.</b> Vous ne vous faites pas passer pour un autre artisan, et vous ne publiez pas de faux avis, ni pour vous ni contre les autres.</li>
        <li><b>La coopération en cas de litige.</b> Si un client se plaint, vous répondez à {B} et cherchez une solution à l’amiable : reprise du travail, remboursement partiel ou total.</li>
      </ol>

      <h2>Ce qui se passe en cas de manquement</h2>
      <p>Tout client peut signaler un artisan depuis sa fiche. L’équipe {B} examine le signalement et peut vous demander votre version. Selon la gravité et la répétition des faits, elle peut décider :</p>
      <ul>
        <li>d’un <b>avertissement</b> ;</li>
        <li>du <b>retrait du badge « Vérifié »</b> ;</li>
        <li>de la <b>suspension</b> du profil, qui n’apparaît plus sur le site ;</li>
        <li>du <b>bannissement</b> définitif en cas de fraude ou de faits graves ou répétés.</li>
      </ul>
      <p>Les faits graves (arnaque, usurpation d’identité, violences) peuvent aussi être transmis aux autorités compétentes, que {B} aide dans le cadre de la loi lorsqu’elles le demandent.</p>

      <h2>Le rôle de {B}</h2>
      <p>{B} est un intermédiaire de mise en relation. Le contrat de travail se conclut directement entre le client et l’artisan, qui en est seul responsable. La vérification d’identité et le badge ne sont pas une garantie de qualité. Voir les <Link href="/conditions-utilisation">conditions d’utilisation</Link>.</p>
    </LegalPage>
  );
}
