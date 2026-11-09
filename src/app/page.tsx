import Link from "next/link";
import { getCountry } from "@/lib/country";
import { countryCapital, countryName } from "@/lib/countries";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import ArtisanCard from "@/components/ArtisanCard";
import SetupNotice from "@/components/SetupNotice";

export default async function Home() {
  if (!hasSupabase()) return <SetupNotice />;
  const country = await getCountry();
  const db = await supabaseServer();

  const { data: trades } = await db.from("trades").select("id, slug, plural, description").order("plural");
  const { data: boosts } = await db.from("boosts").select("artisan_id").eq("type", "accueil").eq("status", "active").gt("ends_at", new Date().toISOString());
  const ids = [...new Set((boosts ?? []).map((b) => b.artisan_id))];
  const { data: featured } = ids.length
    ? await db.from("artisans").select("id, name, description, price_label, verified, avg_rating, review_count, trade:trades(name)").in("id", ids).eq("country_code", country).eq("status", "approved").limit(6)
    : { data: [] };

  return (
    <>
      <section className="inner hero">
        <div className="stack">
          <p className="eyebrow">{countryCapital(country)} · {countryName(country)}</p>
          <h1>Le bon artisan, près de chez vous.</h1>
          <p className="lead">Frigoristes, mécaniciens, menuisiers, ébénistes et bien d’autres. Comparez les profils, puis contactez directement par appel ou WhatsApp.</p>
        </div>
        <form className="card pad stack" action="/resultats">
          <div className="fld">
            <label htmlFor="metier">Métier</label>
            <select id="metier" name="metier" defaultValue="">
              <option value="">Tous les métiers</option>
              {trades?.map((t) => <option key={t.id} value={t.slug}>{t.plural}</option>)}
            </select>
          </div>
          <button className="btn primary" type="submit">Rechercher</button>
        </form>
      </section>
      <div className="ruler" aria-hidden="true" />
      <section className="inner sec">
        <div className="sec-head"><h2>Chercher par métier</h2></div>
        <div className="tiles">
          {trades?.map((t) => (
            <Link key={t.id} className="tile" href={`/resultats?metier=${t.slug}`}>
              <b>{t.plural}</b><span>{t.description}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="inner sec">
        <div className="sec-head"><h2>Artisans à la une</h2><span className="tag boost">Sponsorisé</span></div>
        {featured?.length ? (
          <div className="list">
            {featured.map((a: any) => <ArtisanCard key={a.id} a={{ ...a, sponsored: true, trade: a.trade?.name }} />)}
          </div>
        ) : (
          <p className="empty">Aucun artisan à la une pour le moment en {countryName(country)}.</p>
        )}
      </section>
      <section className="inner sec">
        <div className="card pad row" style={{ justifyContent: "space-between", background: "var(--brand)", color: "var(--on-brand)", border: 0 }}>
          <div><h2>Vous êtes artisan ?</h2><p>Créez votre profil gratuitement avec votre adresse e-mail.</p></div>
          <Link className="btn" href="/inscription">Créer mon profil</Link>
        </div>
      </section>
    </>
  );
}

export const dynamic = "force-dynamic";
