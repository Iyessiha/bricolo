import Link from "next/link";
import { tradeIcon } from "@/lib/trade-icons";
import { getCountry } from "@/lib/country";
import { COUNTRIES, countryCapital, countryName } from "@/lib/countries";
import Flag from "@/components/Flag";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import ArtisanCard from "@/components/ArtisanCard";
import SetupNotice from "@/components/SetupNotice";

const FAQ = [
  ["Est-ce payant pour un client ?", "Non. Chercher un artisan, voir son profil et lui envoyer une demande est gratuit, sans compte. Vous réglez l’artisan directement, après avoir convenu du prix avec lui."],
  ["Comment contacter un artisan ?", "Depuis sa fiche : un bouton pour l’appeler, un bouton WhatsApp, ou un formulaire de demande. Vous parlez directement à l’artisan, sans intermédiaire."],
  ["Pourquoi certains artisans sont-ils en tête ?", "Certains profils sont mis en avant par leurs propriétaires. Ils portent toujours la mention « Sponsorisé ». Les autres sont classés selon leur badge Vérifié, leurs avis et la qualité de leur profil."],
  ["Comment sont vérifiés les artisans ?", "Chaque artisan envoie une pièce d’identité et un selfie avec cette pièce. Notre équipe les contrôle avant la mise en ligne. Les artisans validés reçoivent le badge « Vérifié ». Vos documents ne sont jamais montrés aux clients."],
  ["Comment devenir artisan sur Bricolo ?", "Créez votre compte avec votre e-mail et un mot de passe, remplissez votre profil (métier, zones, tarif, photo), puis envoyez votre pièce d’identité. Après validation par notre équipe, en général sous 24 à 48 heures, les clients de votre pays peuvent vous trouver."],
  ["Combien coûte Bricolo pour un artisan ?", "Le profil est gratuit. Des options sont disponibles si vous voulez aller plus loin : les boosts pour apparaître en tête des résultats, et le Forfait Pro pour afficher plus de prestations et de photos. Bricolo ne prend aucune commission sur vos travaux."],
  ["Mes informations sont-elles protégées ?", "Seules les informations de votre fiche (activité, zones, téléphone, description, photos) sont visibles des clients. Votre e-mail, vos documents d’identité et les informations de votre entreprise restent privés."],
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
    ? await db.from("artisans").select("id, name, description, price_label, verified, avg_rating, review_count, photo_url, cover_url, headline, experience_years, diploma_verified, hours, open_24_7, takes_urgent, trade:trades(name)").in("id", ids).eq("country_code", country).eq("status", "approved").limit(6)
    : { data: [] };
  const have = new Set((featured ?? []).map((f: any) => f.id));
  const { data: top } = await db.rpc("search_artisans", { p_country: country, p_trade: null, p_zone: null, p_verified: false, p_seed: String(Math.floor(Date.now() / 3600000)) });
  const tradeName = (id: string) => trades?.find((x) => x.id === id)?.plural?.replace(/s$/, "");
  const POPULAR = ["plombier", "electricien", "frigoriste", "macon", "peintre", "mecanicien", "menuisier", "carreleur", "serrurier", "electromenager"];
  const topTrades = [...(trades ?? [])].sort((a, b) => (POPULAR.indexOf(a.slug) + 1 || 99) - (POPULAR.indexOf(b.slug) + 1 || 99)).slice(0, 9);
  const shown: any[] = [
    ...(featured ?? []).map((a: any) => ({ ...a, sponsored: true, trade: a.trade?.name })),
    ...((top ?? []) as any[]).filter((a) => !have.has(a.id)).slice(0, 6).map((a) => ({ ...a, trade: tradeName(a.trade_id) })),
  ].slice(0, 6);
  return (
    <>
      <section className="inner hero2">
        <div className="heroin stack" style={{ gap: 14 }}>
          <p className="eyebrow fl"><Flag code={country} size={22} />{countryCapital(country)} · {countryName(country)}</p>
          <h1>Le bon artisan, près de chez vous.</h1>
          <p className="lead">Frigoristes, mécaniciens, menuisiers, électriciens, plombiers… Comparez les profils, puis appelez ou écrivez sur WhatsApp. C’est gratuit, sans compte.</p>
        </div>
        <div className="heroimg collage" aria-label="Artisans de l’Afrique de l’Ouest au travail">
          <figure className="c1"><img src="/photos/hero-artisane.jpg" width={800} height={1000} alt="Artisane souriante en gilet orange, un casque de chantier sous le bras" fetchPriority="high" /></figure>
          <figure className="c2"><img src="/photos/mecanicienne.jpg" width={1000} height={700} alt="Mécanicienne en combinaison rouge devant un capot ouvert, son casque sous le bras" loading="lazy" /></figure>
          <figure className="c3"><img src="/photos/jeune-casque.jpg" width={700} height={277} alt="Jeune artisan ajustant son casque blanc" loading="lazy" /></figure>
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
          <li>Identité vérifiée par notre équipe (badge Vérifié)</li>
          <li>7 pays d’Afrique de l’Ouest</li>
        </ul>
      </section>
      <div className="ruler" aria-hidden="true" />

      <section className="inner sec">
        <div className="sec-head"><h2>Chercher par métier</h2></div>
        <div className="tiles">
          {topTrades.map((t) => (
            <Link key={t.id} className="tile" href={`/resultats?metier=${t.slug}`}><i className="ti" aria-hidden="true">{tradeIcon(t.slug)}</i><b>{t.plural}</b><span>{t.description}</span></Link>
          ))}
          {(trades?.length ?? 0) > topTrades.length && <Link className="tile tile-all" href="/resultats"><i className="ti" aria-hidden="true">🔎</i><b>Tous les métiers</b><span>{trades!.length} métiers à découvrir →</span></Link>}
        </div>
      </section>

      {shown.length ? <section className="inner sec">
        <div className="sec-head"><h2>Des artisans près de chez vous</h2><Link href="/resultats">Voir tous →</Link></div>
        <div className="cards">{shown.map((a: any) => <ArtisanCard country={country} key={a.id} a={a} />)}</div>
      </section> : null}

      <section className="inner sec">
        <div className="sec-head"><h2>Comment ça marche</h2></div>
        <ol className="steps">
          <li><span className="n">1</span><b>Cherchez</b><p>Choisissez un métier et votre commune. Les artisans de votre pays s’affichent.</p></li>
          <li><span className="n">2</span><b>Comparez</b><p>Description, tarif indicatif, zones couvertes, avis et badge Vérifié.</p></li>
          <li><span className="n">3</span><b>Contactez</b><p>Appelez, écrivez sur WhatsApp ou envoyez une demande. Convenez du prix avec l’artisan.</p></li>
        </ol>
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
          <div className="stack" style={{ gap: 14 }}>
          <img className="bandimg" src="/photos/artisane-chantier.jpg" width={800} height={600} alt="Artisane en gilet de chantier, un mètre ruban à la main" loading="lazy" />
          <div className="offer" style={{ display: "grid", gap: 6 }}>
            <b>Votre espace artisan</b>
            <span>Suivez les vues de votre fiche, les appels et les demandes reçues, gérez votre profil et vos options de visibilité. Tout est réuni après votre inscription.</span>
          </div>
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
          <div className="chips ctr">{COUNTRIES.map((c) => <span key={c.code} className="chip"><Flag code={c.code} size={20} />{c.name}</span>)}</div>
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
