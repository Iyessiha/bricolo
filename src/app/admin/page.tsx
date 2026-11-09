import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { COUNTRIES, countryName } from "@/lib/countries";
import { BOOST_TYPES, DURATIONS } from "@/lib/format";
import SetupNotice from "@/components/SetupNotice";
import { decide, savePrices, verifyArtisan } from "./actions";

export const metadata: Metadata = { title: "Administration" };

export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/");

  const pays = COUNTRIES.some((c) => c.code === sp.pays) ? sp.pays! : "ci";
  const [{ data: pending }, { data: toVerify }, { data: grid }, { data: all }, { data: active }] = await Promise.all([
    db.from("artisans").select("id, name, country_code, trade:trades(name), created_at").eq("status", "pending").order("created_at"),
    db.from("artisans").select("id, name, country_code").eq("status", "approved").eq("verification_requested", true).eq("verified", false),
    db.from("price_grid").select("id, boost_type, duration_hours, amount").eq("country_code", pays).order("boost_type").order("duration_hours"),
    db.from("artisans").select("id, country_code").eq("status", "approved"),
    supabaseAdmin().from("boosts").select("artisan_id, amount").eq("status", "active").gt("ends_at", new Date().toISOString()),
  ]);
  const countOf = (c: string) => (all ?? []).filter((a) => a.country_code === c).length;

  return (
    <section className="inner sec stack">
      <div><p className="eyebrow">Back-office</p><h1 style={{ fontSize: "clamp(26px,4.5vw,38px)" }}>Administration</h1></div>
      <div className="stats">
        <div className="card stat"><b>{all?.length ?? 0}</b><span>Artisans validés</span></div>
        <div className="card stat"><b>{pending?.length ?? 0}</b><span>Profils à valider</span></div>
        <div className="card stat"><b>{active?.length ?? 0}</b><span>Boosts actifs</span></div>
      </div>

      <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Profils à valider</h2>
        {pending?.length ? <div className="tw"><table className="tbl"><thead><tr><th>Artisan</th><th>Métier</th><th>Pays</th><th></th></tr></thead><tbody>
          {pending.map((p: any) => (
            <tr key={p.id}><td><b>{p.name}</b></td><td>{p.trade?.name}</td><td>{countryName(p.country_code)}</td>
              <td><form action={decide} className="row" style={{ flexWrap: "nowrap" }}>
                <input type="hidden" name="id" value={p.id} />
                <button className="btn small primary" name="decision" value="approve">Valider</button>
                <button className="btn small danger" name="decision" value="reject">Refuser</button></form></td></tr>
          ))}</tbody></table></div> : <p className="empty">Aucun profil en attente.</p>}
      </div>

      {!!toVerify?.length && (
        <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Demandes de badge Vérifié</h2>
          {toVerify.map((v) => (
            <form key={v.id} action={verifyArtisan} className="row"><input type="hidden" name="id" value={v.id} /><span>{v.name} · {countryName(v.country_code)}</span><button className="btn small primary">Accorder le badge</button></form>
          ))}</div>
      )}

      <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Pays ouverts</h2>
        <div className="tw"><table className="tbl"><thead><tr><th>Pays</th><th>Monnaie</th><th>Artisans validés</th></tr></thead><tbody>
          {COUNTRIES.map((c) => <tr key={c.code}><td><b>{c.name}</b></td><td>FCFA</td><td className="num">{countOf(c.code)}</td></tr>)}</tbody></table></div></div>

      <form action={savePrices} className="card pad stack">
        <h2 style={{ fontSize: 20 }}>Grille de prix des boosts, {countryName(pays)} (FCFA)</h2>
        <div className="row">{COUNTRIES.map((c) => <a key={c.code} className={`btn small${c.code === pays ? " primary" : ""}`} href={`/admin?pays=${c.code}`}>{c.name}</a>)}</div>
        <div className="tw"><table className="tbl"><thead><tr><th>Type</th><th>Durée</th><th>Prix</th></tr></thead><tbody>
          {grid?.map((g) => (
            <tr key={g.id}><td><b>{BOOST_TYPES[g.boost_type].name}</b></td><td>{DURATIONS[g.duration_hours]}</td>
              <td><input type="number" min={0} step={100} name={`p:${g.id}`} defaultValue={g.amount} aria-label={`${BOOST_TYPES[g.boost_type].name}, ${DURATIONS[g.duration_hours]}, en FCFA`} /></td></tr>
          ))}</tbody></table></div>
        <p className="hint">Le boost ciblé reprend le prix du boost recherche, multiplié par le coefficient de la zone.</p>
        <div><button className="btn primary" type="submit">Enregistrer les prix</button></div>
      </form>
    </section>
  );
}

export const dynamic = "force-dynamic";
