import Link from "next/link";
import { getCountry } from "@/lib/country";
import { COUNTRIES, countryCapital, countryName } from "@/lib/countries";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import ArtisanCard from "@/components/ArtisanCard";
import SetupNotice from "@/components/SetupNotice";

const FAQ = [
  ["Est-ce payant pour un client ?", "Non. Chercher un artisan, voir son profil et lui envoyer une demande est gratuit, sans compte. Vous réglez l’artisan directement, après avoir convenu du prix avec lui."],
  ["Comment contacter un artisan ?", "Depuis sa fiche : un bouton pour l’appeler, un bouton WhatsApp, ou un formulaire de demande. Vous parlez directement à l’artisan, sans intermédiaire."],
  ["Pourquoi certains artisans sont-ils en tête ?", "Certains profils sont mis en avant par leurs propriétaires. Ils portent toujours la mention « Sponsorisé ». Les autres sont classés selon leur badge Vérifié, leurs avis et la qualité de leur profil."],
  ["Comment devenir artisan sur Bricolo ?", "Créez votre profil en quatre étapes : pays, statut (individuel ou entreprise), activité, e-mail. Pas de mot de passe, pas de frais. Après validation par notre équipe, les clients de votre pays peuvent vous trouver."],
  ["Mes informations sont-elles protégées ?", "Seules les informations de votre fiche (activité, zones, téléphone, description) sont visibles des clients. Votre e-mail et les informations de votre entreprise restent privés."],
] as const;

export default async function Home() {
  if (!hasSupabase()) return <SetupNotice />;
  const country = await getCountry();
  const db = await supabaseServer();

  const [{ data: trades }, { data: zones }, { data: boosts }] = await Promise.all([
    db.from("trades").select("id, slug, plural, description").order("plural"),
    db.from("zones").select("id, name").eq("country_code", country).order("name"),
    db.from("boosts").select("artisan_id").eq("type", "accueil").eq("status", "active").gt("ends_at", new Date().toISOString()),
  ]);
  const ids = [...new Set((boosts ?? []).map((b) => b.artisan_id))];
  const { data: featured } = ids.length
    ? await db.from("artisans").select("id, name, description, price_label, verified, avg_rating, review_count, trade:trades(name)").in("id", ids).eq("country_code", country).eq("status", "approved").limit(6)
    : { data: [] };
  return (
    <>
      <section className="inner hero2">
        <div className="heroin stack" style={{ gap: 14 }}>
          <p className="eyebrow">{countryCapital(country)} · {countryName(country)}</p>
          <h1>Le bon artisan, près de chez vous.</h1>
          <p className="lead">Frigoristes, mécaniciens, menuisiers, électriciens, plombiers… Comparez les profils, puis appelez ou écrivez sur WhatsApp. C’est gratuit, sans compte.</p>
        </div>
        <form className="card pad stack heroform" action="/resultats">
          <h2 style={{ fontSize: 20 }}>Trouver un artisan</h2>
          <div className="fld"><label htmlFor="metier">Métier</label>
            <select id="metier" name="metier" defaultValue="">
              <option value="">Tous les métiers</option>
              {trades?.map((t) => <option key={t.id} value={t.slug}>{t.plural}</option>)}
            </select></div>
          <div className="fld"><label htmlFor="zone">Commune ou ville</label>
            <select id="zone" name="zone" defaultValue="">
              <option value="">Toutes les zones</option>
              {zones?.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select></div>
          <button className="btn primary" type="submit">Rechercher</button>
        </form>
        <ul className="trust">
          <li>Contact direct, sans intermédiaire</li>
          <li>Profils contrôlés, badge Vérifié</li>
          <li>7 pays d’Afrique de l’Ouest</li>
        </ul>
      </section>
      <div className="ruler" aria-hidden="true" />

      <section className="band cl">
        <div className="inner bandin">
          <div className="stack" style={{ gap: 14 }}>
            <p className="eyebrow" style={{ color: "inherit", opacity: .8 }}>Pour les clients</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,36px)" }}>Un artisan de confiance, sans courir partout.</h2>
            <ul className="ticks">
              <li>Trouvez par métier et par commune, en quelques secondes</li>
              <li>Profils clairs : zones, avis, badge Vérifié et tarif indicatif</li>
              <li>Appelez ou écrivez sur WhatsApp, même en urgence</li>
              <li>Sans intermédiaire ni commission sur vos travaux</li>
            </ul>
            <div className="row"><Link className="btn" href="/resultats">Trouver un artisan</Link><span className="hint" style={{ color: "inherit", opacity: .8 }}>Gratuit · sans inscription</span></div>
          </div>
          <div className="offer" style={{ display: "grid", gap: 6 }}>
            <b>Fini la recherche au hasard</b>
            <span>Vous comparez les profils avant de décider, vous convenez du prix directement avec l’artisan, et vous n’avez pas besoin de compte pour chercher ou contacter.</span>
          </div>
        </div>
      </section>

      <section className="inner sec">
        <div className="sec-head"><h2>Artisans à la une</h2><span className="tag boost">Sponsorisé</span></div>
        {featured?.length ? (
          <div className="list">{featured.map((a: any) => <ArtisanCard key={a.id} a={{ ...a, sponsored: true, trade: a.trade?.name }} />)}</div>
        ) : (
          <div className="empty stack" style={{ gap: 10 }}>
            <p>Les premiers artisans de {countryName(country)} arrivent. Soyez parmi les premiers à apparaître ici.</p>
            <div><Link className="btn" href="/inscription">Créer mon profil gratuit</Link></div>
          </div>
        )}
      </section>


      <section className="inner sec">
        <div className="sec-head"><h2>Comment ça marche</h2></div>
        <ol className="steps">
          <li><span className="n">1</span><b>Cherchez</b><p>Choisissez un métier et votre commune. Les artisans de votre pays s’affichent.</p></li>
          <li><span className="n">2</span><b>Comparez</b><p>Description, tarif indicatif, zones couvertes, avis et badge Vérifié.</p></li>
          <li><span className="n">3</span><b>Contactez</b><p>Appelez, écrivez sur WhatsApp ou envoyez une demande. Convenez du prix avec l’artisan.</p></li>
        </ol>
      </section>

      <section className="inner sec">
        <div className="sec-head"><h2>Chercher par métier</h2></div>
        <div className="tiles">
          {trades?.map((t) => (
            <Link key={t.id} className="tile" href={`/resultats?metier=${t.slug}`}><b>{t.plural}</b><span>{t.description}</span></Link>
          ))}
        </div>
      </section>


      <section className="band">
        <div className="inner bandin">
          <div className="stack" style={{ gap: 14 }}>
            <p className="eyebrow" style={{ color: "inherit", opacity: .8 }}>Pour les artisans</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,36px)" }}>Soyez trouvé par les clients de votre quartier.</h2>
            <ul className="ticks">
              <li>Profil gratuit, créé en quelques minutes avec votre e-mail</li>
              <li>À titre individuel ou au nom de votre entreprise</li>
              <li>Les clients vous appellent ou vous écrivent directement</li>
              <li>Badge Vérifié pour inspirer confiance</li>
            </ul>
            <div className="row"><Link className="btn" href="/inscription">Créer mon profil gratuit</Link><Link className="btn ghost" href="/connexion">J’ai déjà un compte</Link></div>
          </div>
          <div className="offer" style={{ display: "grid", gap: 6 }}>
            <b>Votre espace artisan</b>
            <span>Suivez les vues de votre fiche, les appels et les demandes reçues, gérez votre profil et vos options de visibilité. Tout est réuni après votre inscription.</span>
          </div>
        </div>
      </section>

      <section className="inner sec">
        <div className="sec-head"><h2>Questions fréquentes</h2></div>
        <div className="faq">
          {FAQ.map(([q, a]) => (<details key={q}><summary>{q}</summary><p>{a}</p></details>))}
        </div>
      </section>

      <section className="inner sec">
        <div className="card pad stack" style={{ textAlign: "center", justifyItems: "center" }}>
          <h2>Disponible dans 7 pays</h2>
          <p className="muted">{COUNTRIES.map((c) => c.name).join(" · ")}</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn primary" href="/resultats">Trouver un artisan</Link>
            <Link className="btn" href="/inscription">Je suis artisan</Link>
          </div>
        </div>
      </section>
    </>
  );
}

export const dynamic = "force-dynamic";
