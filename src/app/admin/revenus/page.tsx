import type { Metadata } from "next";
import { requireAdmin, perDay, day, one } from "@/lib/admin";
import { COUNTRIES } from "@/lib/countries";
import { fcfa } from "@/lib/format";
import BarChart from "@/components/BarChart";
import PendingPaymentsAlert from "@/components/PendingPaymentsAlert";

export const metadata: Metadata = { title: "Revenus", robots: { index: false } };
export const dynamic = "force-dynamic";
const T: Record<string, string> = { recherche: "Recherche", accueil: "Accueil", urgence: "Urgence", cible: "Ciblé" };

export default async function Revenus() {
  const { db } = await requireAdmin();
  const since = new Date(Date.now() - 365 * 864e5).toISOString();
  const nowIso = new Date().toISOString(), in7 = new Date(Date.now() + 7 * 864e5).toISOString();
  const [{ data: pays }, { count: giftCount }, { data: subsNow }, { data: boostsNow }, { count: verifiedCount }] = await Promise.all([
    db.from("payments").select("id, amount, status, paid_at, created_at, provider_ref, boost:boosts(type, duration_hours, artisan:artisans(id, name, country_code)), sub:subscriptions(days, artisan:artisans(id, name, country_code))").gte("created_at", since).order("created_at", { ascending: false }).limit(20000),
    db.from("boosts").select("id", { count: "exact", head: true }).eq("amount", 0).eq("status", "active"),
    db.from("subscriptions").select("artisan_id, ends_at").eq("status", "active").gt("ends_at", nowIso),
    db.from("boosts").select("type").eq("status", "active").gt("ends_at", nowIso),
    db.from("artisans").select("id", { count: "exact", head: true }).eq("status", "approved").eq("verified", true),
  ]);
  const P = pays ?? [], paid = P.filter((p) => p.status === "paid");
  const within = (iso: string, d: number) => Date.now() - new Date(iso).getTime() < d * 864e5;
  const sum = (a: typeof paid) => a.reduce((s, p) => s + p.amount, 0);
  const paid90 = paid.filter((p) => within(p.paid_at!, 90));
  const r30 = sum(paid.filter((p) => within(p.paid_at!, 30))), r7 = sum(paid.filter((p) => within(p.paid_at!, 7))), r90 = sum(paid90);
  const P90 = P.filter((p) => within(p.created_at, 90));
  const failed = P90.filter((p) => p.status === "failed").length, pending = P90.filter((p) => p.status === "pending").length;
  const rate = P90.length ? Math.round((paid90.length / P90.length) * 100) : 0;
  const basket = paid90.length ? Math.round(r90 / paid90.length) : 0;
  const by = (f: (p: any) => string) => { const m = new Map<string, { n: number; s: number }>(); for (const p of paid90) { const k = f(p); const o = m.get(k) ?? { n: 0, s: 0 }; o.n++; o.s += p.amount; m.set(k, o); } return [...m.entries()].sort((a, b) => b[1].s - a[1].s); };
  const artOf = (p: any) => one(one(p.boost)?.artisan) ?? one(one(p.sub)?.artisan);
  const kind = (p: any) => (p.sub ? "Forfait Pro" : T[one(p.boost)?.type] ?? "—");
  const byType = by(kind);
  const byCountry = by((p) => { const c = artOf(p)?.country_code; return COUNTRIES.find((x) => x.code === c)?.name ?? "—"; });
  const top = (() => { const m = new Map<string, { name: string; s: number; n: number }>(); for (const p of paid) { const a = artOf(p) as any; if (!a) continue; const o = m.get(a.id) ?? { name: a.name, s: 0, n: 0 }; o.s += p.amount; o.n++; m.set(a.id, o); } return [...m.values()].sort((a, b) => b.s - a.s).slice(0, 5); })();
  // Indicateurs d'activité : abonnés, boosts en cours, clients qui reviennent, mois par mois.
  const proNow = new Set((subsNow ?? []).map((x) => x.artisan_id)).size;
  const proEnding = new Set((subsNow ?? []).filter((x) => x.ends_at < in7).map((x) => x.artisan_id)).size;
  const boostNow: Record<string, number> = {}; for (const b of boostsNow ?? []) boostNow[b.type] = (boostNow[b.type] ?? 0) + 1;
  const buyers = new Map<string, number>(); for (const p of paid) { const id = (artOf(p) as any)?.id; if (id) buyers.set(id, (buyers.get(id) ?? 0) + 1); }
  const payers = buyers.size, repeat = [...buyers.values()].filter((n) => n >= 2).length;
  const verified = verifiedCount ?? 0;
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (11 - i), 1)); return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, boost: 0, forfait: 0, n: 0 }; });
  for (const p of paid) { const m = months.find((x) => x.key === p.paid_at!.slice(0, 7)); if (!m) continue; m.n++; if (p.sub) m.forfait += p.amount; else m.boost += p.amount; }
  const Mini = ({ title, data }: { title: string; data: [string, { n: number; s: number }][] }) => (
    <div className="card pad stack"><h2 style={{ fontSize: 17 }}>{title}</h2>{data.length ? <table className="tbl"><tbody>{data.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v.n} vente{v.n > 1 ? "s" : ""}</td><td className="num"><b>{fcfa(v.s)}</b></td></tr>)}</tbody></table> : <p className="empty">Aucune vente.</p>}</div>);
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Boosts</p><h1>Revenus</h1></div><a className="btn small" href="/admin/export?type=paiements">⬇ Exporter en CSV</a></div>
      <PendingPaymentsAlert db={db} />
      <div className="akpi">
        <div className="kpi"><span>7 derniers jours</span><b style={{ fontSize: 22 }}>{fcfa(r7)}</b></div>
        <div className="kpi"><span>30 derniers jours</span><b style={{ fontSize: 22 }}>{fcfa(r30)}</b></div>
        <div className="kpi"><span>90 derniers jours</span><b style={{ fontSize: 22 }}>{fcfa(r90)}</b><small>{paid90.length} vente{paid90.length > 1 ? "s" : ""}</small></div>
        <div className="kpi"><span>Panier moyen</span><b style={{ fontSize: 22 }}>{fcfa(basket)}</b></div>
        <div className="kpi"><span>Taux de paiement</span><b>{rate} %</b><small>{failed} échoué{failed > 1 ? "s" : ""}, {pending} en attente</small></div>
        <div className="kpi"><span>Boosts offerts actifs</span><b>{giftCount ?? 0}</b></div>
      </div>
      <div className="akpi">
        <div className="kpi"><span>Forfaits Pro actifs</span><b>{proNow}</b><small>{proEnding ? `${proEnding} se termine${proEnding > 1 ? "nt" : ""} sous 7 jours` : "aucun ne se termine sous 7 jours"}</small></div>
        <div className="kpi"><span>Boosts en cours</span><b>{(boostsNow ?? []).length}</b><small>{Object.entries(boostNow).map(([t, n]) => `${n} ${(T[t] ?? t).toLowerCase()}`).join(" · ") || "aucun"}</small></div>
        <div className="kpi"><span>Artisans vérifiés</span><b>{verified}</b><small>{payers} ont déjà payé{verified ? ` (${Math.round((payers / verified) * 100)} %)` : ""}</small></div>
        <div className="kpi"><span>Clients qui reviennent</span><b>{payers ? `${Math.round((repeat / payers) * 100)} %` : "—"}</b><small>{repeat} sur {payers} ont payé 2 fois ou plus</small></div>
      </div>
      <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Mois par mois (12 mois)</h2><div className="tw"><table className="tbl"><thead><tr><th>Mois</th><th className="num">Ventes</th><th className="num">Boosts</th><th className="num">Forfait Pro</th><th className="num">Total</th></tr></thead><tbody>
        {months.map((m) => <tr key={m.key}><td>{m.key}</td><td className="num">{m.n}</td><td className="num">{fcfa(m.boost)}</td><td className="num">{fcfa(m.forfait)}</td><td className="num"><b>{fcfa(m.boost + m.forfait)}</b></td></tr>)}
      </tbody></table></div></div>
      <div className="card pad stack"><BarChart label="Revenus / jour (30 jours)" unit=" FCFA" color="var(--boost)" data={perDay(paid.map((p) => ({ at: p.paid_at!, v: p.amount })))} /></div>
      <div className="agrid"><Mini title="Par type de boost" data={byType} /><Mini title="Par pays" data={byCountry} />
        <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Meilleurs clients</h2>{top.length ? <table className="tbl"><tbody>{top.map((t) => <tr key={t.name}><td>{t.name}</td><td className="num">{t.n}×</td><td className="num"><b>{fcfa(t.s)}</b></td></tr>)}</tbody></table> : <p className="empty">Aucune vente.</p>}</div></div>
      <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Dernières transactions</h2>
        {P.length ? <div className="tw"><table className="tbl"><thead><tr><th>Date</th><th>Artisan</th><th>Boost</th><th>Statut</th><th className="num">Montant</th><th></th></tr></thead><tbody>
          {P.slice(0, 30).map((p) => { const b = one(p.boost as any) as any; return <tr key={p.id}><td>{day(p.paid_at ?? p.created_at)}</td><td>{(artOf(p) as any)?.name ?? "—"}</td><td>{p.sub ? `Forfait Pro · ${one(p.sub as any).days} j` : `${T[b?.type] ?? "—"} · ${b ? b.duration_hours / 24 : "?"} j`}</td><td><span className={`tag ${p.status === "paid" ? "ok" : p.status === "failed" ? "err" : "wait"}`}>{p.status === "paid" ? "Payé" : p.status === "failed" ? "Échoué" : "En attente"}</span></td><td className="num">{fcfa(p.amount)}</td><td><a href={`/admin/revenus/${p.id}`}>Détails →</a></td></tr>; })}
        </tbody></table></div> : <p className="empty">Aucune transaction pour le moment.</p>}
      </div>
    </>
  );
}
