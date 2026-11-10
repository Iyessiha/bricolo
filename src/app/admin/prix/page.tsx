import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { COUNTRIES } from "@/lib/countries";
import { fcfa } from "@/lib/format";
import Flag from "@/components/Flag";
import { addZone, savePrices } from "../gestion";

export const metadata: Metadata = { title: "Pays et prix", robots: { index: false } };
export const dynamic = "force-dynamic";
const T = [["recherche", "Recherche"], ["accueil", "Accueil"], ["urgence", "Urgence"]] as const;

export default async function Prix({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const [{ data: grid }, { data: zones }, { data: arts }, { data: plans }] = await Promise.all([
    db.from("price_grid").select("id, country_code, boost_type, duration_hours, amount").order("country_code").order("boost_type").order("duration_hours"),
    db.from("zones").select("id, country_code, name, price_factor").order("country_code").order("name").limit(2000),
    db.from("artisans").select("country_code").eq("status", "approved").limit(10000),
    db.from("plan_prices").select("country_code, amount"),
  ]);
  const hot = (zones ?? []).filter((z) => Number(z.price_factor) !== 1);
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Configuration</p><h1>Pays et prix</h1></div></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <form action={savePrices} className="stack">
        {COUNTRIES.map((c) => {
          const g = (grid ?? []).filter((x) => x.country_code === c.code);
          const zs = (zones ?? []).filter((z) => z.country_code === c.code);
          const zh = hot.filter((z) => z.country_code === c.code);
          return (
            <div key={c.code} className="card pad stack">
              <h2 style={{ fontSize: 18 }} className="fl"><Flag code={c.code} size={20} />{c.name} <span className="meta">· {(arts ?? []).filter((a) => a.country_code === c.code).length} artisans en ligne · {zs.length} zones</span></h2>
              {g.length ? <div className="tw"><table className="tbl"><thead><tr><th>Boost</th><th className="num">24 h</th><th className="num">3 jours</th><th className="num">7 jours</th></tr></thead><tbody>
                {T.map(([k, l]) => <tr key={k}><td><b>{l}</b></td>{[24, 72, 168].map((h) => { const x = g.find((y) => y.boost_type === k && y.duration_hours === h); return <td className="num" key={h}>{x ? <input type="number" min={0} step={100} name={`p:${x.id}`} defaultValue={x.amount} aria-label={`${l} ${h} h`} /> : "—"}</td>; })}</tr>)}
              </tbody></table></div> : <p className="empty">Aucun prix défini pour ce pays.</p>}
              <div className="fld" style={{ maxWidth: 320 }}><label htmlFor={`plan-${c.code}`}>Forfait Pro, prix du mois (FCFA) — semaine et année en sont déduites</label><input id={`plan-${c.code}`} type="number" min={0} step={100} name={`plan:${c.code}`} defaultValue={(plans ?? []).find((p) => p.country_code === c.code)?.amount ?? 0} /></div>
              <details><summary>Coefficients par zone ({zh.length} ajustée{zh.length > 1 ? "s" : ""})</summary>
                <p className="hint">Le boost « ciblé » = prix recherche × coefficient de la zone (1 = prix de base). Seules les zones à coefficient ≠ 1 sont affichées ici.</p>
                <div className="afilters">{zh.length ? zh.map((z) => <label key={z.id} className="fld" style={{ width: 170 }}>{z.name}<input type="number" step="0.05" min="0.1" max="9.99" name={`z:${z.id}`} defaultValue={String(z.price_factor)} /></label>) : <span className="meta">Aucune zone ajustée.</span>}</div>
              </details>
            </div>);
        })}
        <div><button className="btn primary" type="submit">Enregistrer les prix</button> <span className="hint">Affichage public : par ex. {fcfa(1500)}.</span></div>
      </form>
      <form action={addZone} className="card pad stack"><h2 style={{ fontSize: 17 }}>Ajouter une zone ou une ville</h2>
        <div className="afilters"><select name="country" aria-label="Pays">{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select><input name="name" placeholder="Nom de la ville ou du quartier" required minLength={2} maxLength={60} style={{ flex: "1 1 220px" }} /><button className="btn primary" type="submit">Ajouter</button></div></form>
    </>
  );
}
