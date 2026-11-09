import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import { fcfa } from "@/lib/format";
import { requireAdmin, perDay, ago, one } from "@/lib/admin";
import BarChart from "@/components/BarChart";
import Flag from "@/components/Flag";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };
const OLD: Record<string, string> = { dossiers: "/admin/dossiers", artisans: "/admin/artisans", prix: "/admin/prix" };

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev && !cur) return <small>—</small>;
  if (!prev) return <small className="up">nouveau</small>;
  const p = Math.round(((cur - prev) / prev) * 100);
  return <small className={p >= 0 ? "up" : "down"}>{p >= 0 ? "▲" : "▼"} {Math.abs(p)} % vs 7 j précédents</small>;
}

export default async function Overview({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (sp.vue && OLD[sp.vue]) redirect(OLD[sp.vue]);
  const { db } = await requireAdmin();
  const nowIso = new Date().toISOString();
  const d30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const d60 = new Date(Date.now() - 60 * 864e5).toISOString();
  const cnt = (q: any) => q.then((r: any) => r.count ?? 0);

  const [{ data: arts }, nAccounts, { data: ident }, { data: pays }, { data: reqs }, { data: views }, nBoosts, nDipl, nReviews, nFailed] = await Promise.all([
    db.from("artisans").select("id, country_code, status, created_at, photo_url").limit(10000),
    cnt(db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "artisan")),
    db.from("artisan_identity").select("artisan_id, status, submitted_at, artisan:artisans(name)").eq("status", "pending").order("submitted_at"),
    db.from("payments").select("amount, paid_at, boost:boosts(type, artisan:artisans(country_code))").eq("status", "paid").gte("paid_at", d60).limit(10000),
    db.from("service_requests").select("id, country_code, status, urgent, created_at").gte("created_at", d60).limit(10000),
    db.from("events").select("created_at").eq("type", "view").gte("created_at", d30).limit(20000),
    cnt(db.from("boosts").select("id", { count: "exact", head: true }).eq("status", "active").gt("ends_at", nowIso)),
    cnt(db.from("artisan_diplomas").select("id", { count: "exact", head: true }).eq("status", "pending")),
    cnt(db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending")),
    cnt(db.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString())),
  ]);

  const A = arts ?? [], R = reqs ?? [], P = pays ?? [];
  const inRange = (iso: string, a: number, b: number) => { const t = Date.now() - new Date(iso).getTime(); return t >= a * 864e5 && t < b * 864e5; };
  const online = A.filter((a) => a.status === "approved").length;
  const sent = (ident ?? []).length;
  const new7 = A.filter((a) => inRange(a.created_at, 0, 7)).length, new7p = A.filter((a) => inRange(a.created_at, 7, 14)).length;
  const req7 = R.filter((r) => inRange(r.created_at, 0, 7)).length, req7p = R.filter((r) => inRange(r.created_at, 7, 14)).length;
  const rev30 = P.filter((p) => inRange(p.paid_at!, 0, 30)).reduce((s, p) => s + p.amount, 0);
  const rev30p = P.filter((p) => inRange(p.paid_at!, 30, 60)).reduce((s, p) => s + p.amount, 0);
  const stale = (ident ?? []).filter((i) => Date.now() - new Date(i.submitted_at).getTime() > 48 * 36e5);
  const oldestH = ident?.length ? Math.floor((Date.now() - new Date(ident[0].submitted_at).getTime()) / 36e5) : 0;
  const unanswered = R.filter((r) => r.status === "new" && Date.now() - new Date(r.created_at).getTime() > 48 * 36e5).length;

  const funnel = [
    ["Comptes créés", nAccounts], ["Profil rempli", A.length], ["Photo ajoutée", A.filter((a) => a.photo_url).length],
    ["Dossier envoyé", A.filter((a) => a.status !== "pending").length + sent], ["En ligne", online],
  ] as const;
  const fmax = Math.max(1, funnel[0][1]);

  const byCountry = COUNTRIES.map((c) => ({
    c, online: A.filter((a) => a.country_code === c.code && a.status === "approved").length,
    pending: A.filter((a) => a.country_code === c.code && a.status === "pending").length,
    req: R.filter((r) => r.country_code === c.code && inRange(r.created_at, 0, 30)).length,
    rev: P.filter((p) => one(one(p.boost as any)?.artisan as any)?.country_code === c.code && inRange(p.paid_at!, 0, 30)).reduce((s, p) => s + p.amount, 0),
  }));

  const todo = [
    { n: sent, t: "Dossiers à examiner", s: oldestH ? `le plus ancien : ${oldestH} h` : "", h: "/admin/dossiers", hot: sent > 0 },
    { n: stale.length, t: "Dossiers en attente depuis plus de 48 h", s: "à traiter en priorité", h: "/admin/dossiers", hot: stale.length > 0 },
    { n: nDipl, t: "Diplômes à vérifier", s: "", h: "/admin/dossiers", hot: nDipl > 0 },
    { n: nReviews, t: "Avis à modérer", s: "", h: "/admin/avis", hot: nReviews > 0 },
    { n: unanswered, t: "Demandes clients sans réponse (48 h)", s: "l’artisan n’a pas répondu", h: "/admin/demandes?statut=new", hot: unanswered > 0 },
    { n: nFailed, t: "Paiements échoués, 7 jours", s: "", h: "/admin/revenus", hot: nFailed > 0 },
  ];
  const open = todo.filter((t) => t.n > 0);

  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Back-office</p><h1>Aperçu</h1></div><span className="meta">Mis à jour {ago(nowIso)}</span></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}

      <div className="akpi">
        <div className={`kpi${sent ? " hot" : ""}`}><span>Dossiers à examiner</span><b>{sent}</b><small>{oldestH ? `plus ancien : ${oldestH} h` : "tout est à jour"}</small></div>
        <div className="kpi"><span>Artisans en ligne</span><b>{online}</b><small>sur {A.length} profils</small></div>
        <div className="kpi"><span>Nouveaux profils, 7 jours</span><b>{new7}</b><Delta cur={new7} prev={new7p} /></div>
        <div className="kpi"><span>Demandes clients, 7 jours</span><b>{req7}</b><Delta cur={req7} prev={req7p} /></div>
        <div className="kpi"><span>Revenus boosts, 30 jours</span><b style={{ fontSize: 22 }}>{fcfa(rev30)}</b><Delta cur={rev30} prev={rev30p} /></div>
        <div className="kpi"><span>Boosts actifs</span><b>{nBoosts}</b><small>en ce moment</small></div>
      </div>

      <div className="agrid">
        <div className="card pad stack"><h2 style={{ fontSize: 17 }}>À traiter</h2>
          {open.length ? open.map((t) => <Link key={t.t} href={t.h} className="todo"><span><b>{t.t}</b>{t.s ? <><br /><span className="meta">{t.s}</span></> : null}</span><span className={`n${t.hot ? "" : " mute"}`}>{t.n}</span></Link>) : <p className="empty">Rien en attente. 🎉</p>}
        </div>
        <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Entonnoir d’inscription</h2>
          <div className="funnel">{funnel.map(([l, n]) => <div className="frow" key={l}><span>{l}</span><div className="fbar"><i style={{ width: `${(n / fmax) * 100}%` }} /></div><b className="num">{n}</b></div>)}</div>
          <p className="hint">{nAccounts ? `${Math.round((online / nAccounts) * 100)} % des comptes créés sont en ligne.` : "Aucune inscription pour le moment."}</p>
        </div>
      </div>

      <div className="agrid">
        <div className="card pad stack"><BarChart label="Nouveaux profils / jour" data={perDay(A.map((a) => ({ at: a.created_at })))} /></div>
        <div className="card pad stack"><BarChart label="Demandes clients / jour" data={perDay(R.map((r) => ({ at: r.created_at })))} color="var(--ok)" /></div>
        <div className="card pad stack"><BarChart label="Revenus boosts / jour" unit=" FCFA" data={perDay(P.map((p) => ({ at: p.paid_at!, v: p.amount })))} color="var(--boost)" /></div>
        <div className="card pad stack"><BarChart label="Vues de fiches / jour" data={perDay((views ?? []).map((v) => ({ at: v.created_at })))} color="#7a5af8" /></div>
      </div>

      <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Par pays, 30 jours</h2>
        <div className="tw"><table className="tbl"><thead><tr><th>Pays</th><th className="num">En ligne</th><th className="num">À valider</th><th className="num">Demandes</th><th className="num">Revenus</th></tr></thead><tbody>
          {byCountry.map(({ c, ...x }) => <tr key={c.code}><td><b className="fl"><Flag code={c.code} size={18} />{c.name}</b></td><td className="num">{x.online}</td><td className="num">{x.pending}</td><td className="num">{x.req}</td><td className="num">{fcfa(x.rev)}</td></tr>)}
        </tbody></table></div>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
