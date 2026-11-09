import Link from "next/link";
import { getCountry } from "@/lib/country";
import { COUNTRIES, countryCapital, countryName } from "@/lib/countries";
import { hasSupabase } from "@/lib/env";
import { fcfa } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";
import ArtisanCard from "@/components/ArtisanCard";
import SetupNotice from "@/components/SetupNotice";

const FAQ = [
  ["Est-ce payant pour un client ?", "Non. Chercher un artisan, voir son profil et lui envoyer une demande est gratuit, sans compte. Vous réglez l’artisan directement, après avoir convenu du prix avec lui."],
  ["Comment contacter un artisan ?", "Depuis sa fiche : un bouton pour l’appeler, un bouton WhatsApp, ou un formulaire de demande. Vous parlez directement à l’artisan, sans intermédiaire."],
  ["Pourquoi certains artisans sont-ils en tête ?", "Parce qu’ils ont acheté un boost. Ces profils portent toujours la mention « Sponsorisé ». Les autres sont classés selon leur badge Vérifié, leurs avis et leur profil."],
  ["Comment devenir artisan sur Bricolo ?", "Créez votre profil en trois étapes : pays, activité, e-mail. Pas de mot de passe, pas de frais. Après validation par notre équipe, les clients de votre pays peuvent vous trouver."],
  ["Comment payer un boost ?", "Par Mobile Money, en quelques secondes. Le boost s’active dès la confirmation du paiement et vous recevez un reçu par e-mail."],
] as const;

export default async function Home() {
  if (!hasSupabase()) return <SetupNotice />;
  const country = await getCountry();
  const db = await supabaseServer();

  const [{ data: trades }, { data: zones }, { data: grid }, { data: boosts }] = await Promise.all([
    db.from("trades").select("id, slug, plural, description").order("plural"),
    db.from("zones").select("id, name").eq("country_code", country).order("name"),
    db.from("price_grid").select("boost_type, duration_hours, amount").eq("country_code", country),
    db.from("boosts").select("artisan_id").eq("type", "accueil").eq("status", "active").gt("ends_at", new Date().toISOString()),
  ]);
  const ids = [...new Set((boosts ?? []).map((b) => b.artisan_id))];
  const { data: featured } = ids.length
    ? await db.from("artisans").select("id, name, description, price_label, verified, avg_rating, review_count, trade:trades(name)").in("id", ids).eq("country_code", country).eq("status", "approved").limit(6)
    : { data: [] };
  const from = (t: string) => { const v = (grid ?? []).filter((g) => g.boost_type === t).map((g) => g.amount); return v.length ? Math.min(...v) : null; };

  const offers = [
    { t: "recherche", name: "Boost recherche", text: "En tête des résultats de votre métier, dans votre zone." },
    { t: "accueil", name: "Boost accueil", text: "À la une de la page d’accueil de votre pays." },
    { t: "urgence", name: "Boost urgence", text: "Les demandes de dépannage vous arrivent en premier." },
  ];

  return (
    <>
      <section className="inner hero2">
        <div className="stack" style={{ gap: 18 }}>
          <p className="eyebrow">{countryCapital(country)} · {countryName(country)}</p>
          <h1>Le bon artisan, près de chez vous.</h1>
          <p className="lead">Frigoristes, mécaniciens, menuisiers, électriciens, plombiers… Comparez les profils, puis appelez ou écrivez sur WhatsApp. C’est gratuit, sans compte.</p>
          <ul className="trust">
            <li>Contact direct, sans intermédiaire</li>
            <li>Profils contrôlés, badge Vérifié</li>
            <li>7 pays d’Afrique de l’Ouest</li>
          </ul>
        </div>
        <form className="card pad stack" action="/resultats">
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
      </section>
      <div className="ruler" aria-hidden="true" />

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

      <section className="band">
        <div className="inner bandin">
          <div className="stack" style={{ gap: 14 }}>
            <p className="eyebrow" style={{ color: "inherit", opacity: .8 }}>Pour les artisans</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,36px)" }}>Soyez trouvé par les clients de votre quartier.</h2>
            <ul className="ticks">
              <li>Profil gratuit, créé en deux minutes avec votre e-mail</li>
              <li>Les clients vous appellent ou vous écrivent directement</li>
              <li>Badge Vérifié pour inspirer confiance</li>
              <li>Boosts à partir de {fcfa(from("recherche") ?? 500)}, payables en Mobile Money</li>
            </ul>
            <div className="row"><Link className="btn" href="/inscription">Devenir artisan</Link><Link className="btn ghost" href="/boosts">Voir les boosts</Link></div>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {offers.map((o) => (
              <div key={o.t} className="offer">
                <div><b>{o.name}</b><span>{o.text}</span></div>
                <span className="tag boost">dès {from(o.t) ? fcfa(from(o.t)!) : "—"}</span>
              </div>
            ))}
            <p className="hint" style={{ color: "inherit", opacity: .8 }}>Prix pour {countryName(country)}. Durées : 24 h, 3 jours ou 7 jours. Emplacements limités par métier et par zone.</p>
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
