import type { Metadata } from "next";
import Link from "next/link";
import { getCountry } from "@/lib/country";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import ZoneOptions from "@/components/ZoneOptions";
import SetupNotice from "@/components/SetupNotice";
import Turnstile from "@/components/Turnstile";
import { sendQuote } from "./actions";

export const metadata: Metadata = { title: "Demander un devis à plusieurs artisans", description: "Décrivez votre besoin une seule fois : votre demande part à 3 artisans vérifiés de votre zone, qui vous répondent directement.", robots: { index: false, follow: true }, alternates: { canonical: "/devis" } };

const ERR: Record<string, string> = {
  contact: "Indiquez un numéro valide ou une adresse e-mail pour que les artisans puissent vous répondre.",
  email: "Cette adresse e-mail ne semble pas exister. Vérifiez-la.",
  choix: "Choisissez un métier et une commune ou un quartier.",
  aucun: "Aucun artisan vérifié n’est disponible pour ce métier dans cette zone pour le moment. Essayez une zone voisine ou parcourez les résultats.",
  doublon: "Vous avez déjà contacté ces artisans il y a moins d’une heure.",
  limite: "Trop de demandes pour aujourd’hui. Réessayez demain.",
  robot: "La vérification anti-robot a échoué. Réessayez.",
};

export default async function Devis({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  if (sp.envoye) {
    const n = Math.max(1, parseInt(sp.envoye, 10) || 1);
    return (
      <section className="inner sec stack" style={{ maxWidth: 560, textAlign: "center" }}>
        <p style={{ fontSize: 56, margin: 0 }} aria-hidden="true">✅</p>
        <h1 style={{ fontSize: "clamp(26px,5vw,36px)" }}>Demande envoyée à {n} artisan{n > 1 ? "s" : ""}</h1>
        <p className="seo-intro" style={{ marginInline: "auto" }}>Ils vous répondent directement, par téléphone, WhatsApp ou e-mail. Comparez les prix et les délais, et ne payez jamais la totalité à l’avance.</p>
        <p><Link className="btn primary" href="/resultats">Voir d’autres artisans</Link></p>
      </section>
    );
  }
  const country = await getCountry();
  const db = await supabaseServer();
  const [{ data: trades }, { data: zones }] = await Promise.all([
    db.from("trades").select("id, slug, plural, name").order("plural"),
    db.from("zones").select("id, name, parent_id").eq("country_code", country).order("name"),
  ]);
  // Le lien depuis les résultats transmet l'identifiant du métier ou son identifiant court (slug).
  const trade = trades?.find((t) => t.id === sp.metier || t.slug === sp.metier);
  return (
    <section className="inner sec stack" style={{ maxWidth: 640 }}>
      <div className="sec-head"><h1 style={{ fontSize: "clamp(26px,4.5vw,38px)" }}>Demander un devis</h1></div>
      <p className="seo-intro">Décrivez votre besoin une seule fois : votre demande part à <b>3 artisans vérifiés</b> de votre zone, choisis au hasard parmi les premiers résultats. Ils vous répondent directement. C’est gratuit et sans compte.</p>
      {sp.erreur && <p className="notice err" role="alert">{ERR[sp.erreur] ?? "Vérifiez le formulaire."}</p>}
      <form action={sendQuote} className="card pad stack">
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
        <div className="fld"><label htmlFor="metier">Métier</label>
          <select id="metier" name="metier" required defaultValue={trade?.id ?? ""}>
            <option value="" disabled>Choisissez un métier</option>
            {trades?.map((t) => <option key={t.id} value={t.id}>{t.plural}</option>)}
          </select></div>
        <div className="fld"><label htmlFor="zone">Commune ou quartier</label>
          <select id="zone" name="zone" required defaultValue={sp.zone ?? ""}>
            <ZoneOptions zones={zones ?? []} all="Choisissez votre zone" />
          </select></div>
        <div className="fld"><label htmlFor="description">Votre besoin</label><textarea id="description" name="description" required minLength={5} maxLength={1000} placeholder="Décrivez le problème ou le travail à faire : lieu, taille, délai souhaité…" /></div>
        <label className="row"><input type="checkbox" name="urgent" /> Dépannage urgent</label>
        <div className="fld"><label htmlFor="name">Votre nom</label><input id="name" name="name" maxLength={80} autoComplete="name" /></div>
        <div className="fld"><label htmlFor="phone">Votre numéro WhatsApp ou téléphone</label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="Ex. 07 00 00 00 00" /></div>
        <div className="fld"><label htmlFor="email">Ou votre e-mail</label><input id="email" name="email" type="email" autoComplete="email" /><span className="hint">Indiquez au moins un des deux. Vos coordonnées ne servent qu’à ces réponses.</span></div>
        <Turnstile />
        <button className="btn primary" type="submit">Envoyer ma demande à 3 artisans</button>
      </form>
      <p className="hint">Bricolo met en relation : le prix et le travail se décident entre vous et l’artisan. Demandez un devis clair et ne payez jamais la totalité à l’avance.</p>
    </section>
  );
}
