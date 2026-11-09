import type { Metadata } from "next";
import { getCountry } from "@/lib/country";
import { countryName } from "@/lib/countries";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import ArtisanCard from "@/components/ArtisanCard";
import SetupNotice from "@/components/SetupNotice";

export const metadata: Metadata = { title: "Trouver un artisan" };

export default async function Results({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const country = await getCountry();
  const db = await supabaseServer();

  const [{ data: trades }, { data: zones }] = await Promise.all([
    db.from("trades").select("id, slug, name, plural").order("plural"),
    db.from("zones").select("id, name").eq("country_code", country).order("name"),
  ]);
  const trade = trades?.find((t) => t.slug === sp.metier);
  const zone = zones?.find((z) => z.id === sp.zone);

  const { data: rows } = await db.rpc("search_artisans", {
    p_country: country, p_trade: trade?.id ?? null, p_zone: zone?.id ?? null,
    p_verified: sp.verifie === "1", p_seed: String(Math.floor(Date.now() / 60000)),
  });
  const tradeName = (id: string) => trades?.find((t) => t.id === id)?.name;
  const list = (rows ?? []) as any[];

  return (
    <section className="inner sec">
      <div className="sec-head">
        <h1 style={{ fontSize: "clamp(26px,4.5vw,38px)" }}>{trade ? trade.plural : "Tous les artisans"}{zone ? ` à ${zone.name}` : ` · ${countryName(country)}`}</h1>
        <p className="meta num">{list.length} résultat{list.length > 1 ? "s" : ""}</p>
      </div>
      <form className="card filters" action="/resultats">
        <div className="fld"><label htmlFor="metier">Métier</label>
          <select id="metier" name="metier" defaultValue={trade?.slug ?? ""}>
            <option value="">Tous les métiers</option>
            {trades?.map((t) => <option key={t.id} value={t.slug}>{t.plural}</option>)}
          </select></div>
        <div className="fld"><label htmlFor="zone">Commune ou ville</label>
          <select id="zone" name="zone" defaultValue={zone?.id ?? ""}>
            <option value="">Toutes les zones</option>
            {zones?.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select></div>
        <label className="row" htmlFor="verifie" style={{ minHeight: 44 }}>
          <input type="checkbox" id="verifie" name="verifie" value="1" defaultChecked={sp.verifie === "1"} /> Artisans vérifiés uniquement
        </label>
        <button className="btn primary" type="submit">Filtrer</button>
      </form>
      {list.some((a) => a.sponsored) && <p className="hint" style={{ marginBottom: 12 }}>Les résultats sponsorisés passent en premier. Leur ordre change régulièrement pour rester équitable.</p>}
      {list.length ? (
        <div className="list">{list.map((a) => <ArtisanCard key={a.id} a={{ ...a, trade: tradeName(a.trade_id) }} />)}</div>
      ) : (
        <p className="empty">Aucun artisan pour cette recherche. Essayez une autre zone ou retirez le filtre Vérifié.</p>
      )}
    </section>
  );
}

export const dynamic = "force-dynamic";
