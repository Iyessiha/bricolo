import type { Metadata } from "next";
import { requireAdmin, perDay, day, one } from "@/lib/admin";
import { COUNTRIES } from "@/lib/countries";
import { fcfa } from "@/lib/format";
import BarChart from "@/components/BarChart";

export const metadata: Metadata = { title: "Revenus", robots: { index: false } };
export const dynamic = "force-dynamic";
const T: Record<string, string> = { recherche: "Recherche", accueil: "Accueil", urgence: "Urgence", cible: "Ciblé" };

export default async function Revenus() {
  const { db } = await requireAdmin();
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const [{ data: pays }, { count: giftCount }] = await Promise.all([
    db.from("payments").select("id, amount, status, paid_at, created_at, provider_ref, boost:boosts(type, duration_hours, artisan:artisans(id, name, country_code)), sub:subscriptions(months, artisan:artisans(id, name, country_code))").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
    db.from("boosts").select("id", { count: "exact", head: true }).eq("amount", 0).eq("status", "active"),
  ]);
  const P = pays ?? [], paid = P.filter((p) => p.status === "paid");
  const within = (iso: string, d: number) => Date.now() - new Date(iso).getTime() < d * 864e5;
  const sum = (a: typeof paid) => a.reduce((s, p) => s + p.amount, 0);
  const r30 = sum(paid.filter((p) => within(p.paid_at!, 30))), r7 = sum(paid.filter((p) => within(p.paid_at!, 7))), r90 = sum(paid);
  const failed = P.filter((p) => p.status === "failed").length, pending = P.filter((p) => p.status === "pending").length;
  const rate = P.length ? Math.round((paid.length / P.length) * 100) : 0;
  const basket = paid.length ? Math.round(r90 / paid.length) : 0;
  const by = (f: (p: any) => string) => { const m = new Map<string, { n: number; s: number }>(); for (const p of paid) { const k = f(p); const o = m.get(k) ?? { n: 0, s: 0 }; o.n++; o.s += p.amount; m.set(k, o); } return [...m.entries()].sort((a, b) => b[1].s - a[1].s); };
  const artOf = (p: any) => one(one(p.boost)?.artisan) ?? one(one(p.sub)?.artisan);
  const kind = (p: any) => (p.sub ? "Forfait Pro" : T[one(p.boost)?.type] ?? "—");
  const byType = by(kind);
  const byCountry = by((p) => { const c = artOf(p)?.country_code; return COUNTRIES.find((x) => x.code === c)?.name ?? "—"; });
  const top = (() => { const m = new Map<string, { name: string; s: number; n: number }>(); for (const p of paid) { const a = artOf(p) as any; if (!a) continue; const o = m.get(a.id) ?? { name: a.name, s: 0, n: 0 }; o.s += p.amount; o.n++; m.set(a.id, o); } return [...m.values()].sort((a, b) => b.s - a.s).slice(0, 5); })();
  const Mini = ({ title, data }: { title: string; data: [string, { n: number; s: number }][] }) => (
    <div className="card pad stack"><h2 style={{ fontSize: 17 }}>{title}</h2>{data.length ? <table className="tbl"><tbody>{data.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v.n} vente{v.n > 1 ? "s" : ""}</td><td className="num"><b>{fcfa(v.s)}</b></td></tr>)}</tbody></table> : <p className="empty">Aucune vente.</p>}</div>);
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Boosts</p><h1>Revenus</h1></div><a className="btn small" href="/admin/export?type=paiements">⬇ Exporter en CSV</a></div>
      <div className="akpi">
        <div className="kpi"><span>7 derniers jours</span><b style={{ fontSize: 22 }}>{fcfa(r7)}</b></div>
        <div className="kpi"><span>30 derniers jours</span><b style={{ fontSize: 22 }}>{fcfa(r30)}</b></div>
        <div className="kpi"><span>90 derniers jours</span><b style={{ fontSize: 22 }}>{fcfa(r90)}</b><small>{paid.length} vente{paid.length > 1 ? "s" : ""}</small></div>
        <div className="kpi"><span>Panier moyen</span><b style={{ fontSize: 22 }}>{fcfa(basket)}</b></div>
        <div className="kpi"><span>Taux de paiement</span><b>{rate} %</b><small>{failed} échoué{failed > 1 ? "s" : ""}, {pending} en attente</small></div>
        <div className="kpi"><span>Boosts offerts actifs</span><b>{giftCount ?? 0}</b></div>
      </div>
      <div className="card pad stack"><BarChart label="Revenus / jour (30 jours)" unit=" FCFA" color="var(--boost)" data={perDay(paid.map((p) => ({ at: p.paid_at!, v: p.amount })))} /></div>
      <div className="agrid"><Mini title="Par type de boost" data={byType} /><Mini title="Par pays" data={byCountry} />
        <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Meilleurs clients</h2>{top.length ? <table className="tbl"><tbody>{top.map((t) => <tr key={t.name}><td>{t.name}</td><td className="num">{t.n}×</td><td className="num"><b>{fcfa(t.s)}</b></td></tr>)}</tbody></table> : <p className="empty">Aucune vente.</p>}</div></div>
      <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Dernières transactions</h2>
        {P.length ? <div className="tw"><table className="tbl"><thead><tr><th>Date</th><th>Artisan</th><th>Boost</th><th>Statut</th><th className="num">Montant</th></tr></thead><tbody>
          {P.slice(0, 30).map((p) => { const b = one(p.boost as any) as any; return <tr key={p.id}><td>{day(p.paid_at ?? p.created_at)}</td><td>{(artOf(p) as any)?.name ?? "—"}</td><td>{p.sub ? `Forfait Pro · ${one(p.sub as any).months} mois` : `${T[b?.type] ?? "—"} · ${b ? b.duration_hours / 24 : "?"} j`}</td><td><span className={`tag ${p.status === "paid" ? "ok" : p.status === "failed" ? "err" : "wait"}`}>{p.status === "paid" ? "Payé" : p.status === "failed" ? "Échoué" : "En attente"}</span></td><td className="num">{fcfa(p.amount)}</td></tr>; })}
        </tbody></table></div> : <p className="empty">Aucune transaction pour le moment.</p>}
      </div>
    </>
  );
}
