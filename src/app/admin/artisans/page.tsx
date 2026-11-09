import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, day, one } from "@/lib/admin";
import { COUNTRIES, countryName } from "@/lib/countries";

export const metadata: Metadata = { title: "Artisans", robots: { index: false } };
export const dynamic = "force-dynamic";
const PER = 25;
const ST: Record<string, [string, string]> = { approved: ["ok", "En ligne"], pending: ["wait", "À valider"], rejected: ["mute", "Refusé"], suspended: ["err", "Suspendu"] };

export default async function Artisans({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, " ").slice(0, 60);
  const { data: trades } = await db.from("trades").select("id, name").order("name");

  let query = db.from("artisans").select("id, name, country_code, status, verified, diploma_verified, account_type, phone, created_at, avg_rating, review_count, trade:trades(name), profile:profiles(email)", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.statut && ST[sp.statut]) query = query.eq("status", sp.statut);
  if (sp.pays) query = query.eq("country_code", sp.pays);
  if (sp.metier) query = query.eq("trade_id", sp.metier);
  if (sp.badge === "1") query = query.eq("verified", true); else if (sp.badge === "0") query = query.eq("verified", false);
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,whatsapp.ilike.%${q}%,company_name.ilike.%${q}%`);
  const { data: rows, count } = await query.range((page - 1) * PER, page * PER - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER));
  const link = (p: number) => { const u = new URLSearchParams(); for (const k of ["q", "statut", "pays", "metier", "badge"]) if (sp[k]) u.set(k, sp[k]!); u.set("page", String(p)); return `/admin/artisans?${u}`; };
  const csv = (() => { const u = new URLSearchParams(); for (const k of ["q", "statut", "pays", "metier", "badge"]) if (sp[k]) u.set(k, sp[k]!); return `/admin/export?type=artisans&${u}`; })();

  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Annuaire</p><h1>Artisans</h1></div><a className="btn small" href={csv}>⬇ Exporter en CSV</a></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <form className="afilters" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Nom, téléphone, entreprise…" aria-label="Recherche" />
        <select name="statut" defaultValue={sp.statut ?? ""} aria-label="Statut"><option value="">Tous statuts</option>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}</select>
        <select name="pays" defaultValue={sp.pays ?? ""} aria-label="Pays"><option value="">Tous pays</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
        <select name="metier" defaultValue={sp.metier ?? ""} aria-label="Métier"><option value="">Tous métiers</option>{trades?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select name="badge" defaultValue={sp.badge ?? ""} aria-label="Badge"><option value="">Badge : tous</option><option value="1">Vérifiés</option><option value="0">Non vérifiés</option></select>
        <button className="btn small primary" type="submit">Filtrer</button>
        {(q || sp.statut || sp.pays || sp.metier || sp.badge) && <Link className="btn small" href="/admin/artisans">Réinitialiser</Link>}
      </form>
      <div className="card pad stack">
        <p className="meta">{count ?? 0} résultat{(count ?? 0) > 1 ? "s" : ""}</p>
        {rows?.length ? <div className="tw"><table className="tbl"><thead><tr><th>Artisan</th><th>Métier</th><th>Pays</th><th>Statut</th><th>Note</th><th>Inscrit</th><th></th></tr></thead><tbody>
          {rows.map((a) => { const st = ST[a.status] ?? ["mute", a.status]; return (
            <tr key={a.id}><td><b>{a.name}</b>{a.account_type === "entreprise" && <span className="tag mute" style={{ marginLeft: 6 }}>Ent.</span>}{a.verified && <span title="Vérifié"> ✓</span>}<br /><span className="meta">{one(a.profile as any)?.email}</span></td>
              <td>{one(a.trade as any)?.name}</td><td>{countryName(a.country_code)}</td><td><span className={`tag ${st[0]}`}>{st[1]}</span></td>
              <td>{a.review_count ? `${a.avg_rating} ★ (${a.review_count})` : "—"}</td><td>{day(a.created_at)}</td>
              <td className="num"><Link className="btn small" href={`/admin/artisan/${a.id}`}>Ouvrir</Link></td></tr>); })}
        </tbody></table></div> : <p className="empty">Aucun artisan ne correspond.</p>}
        {pages > 1 && <div className="pager">{page > 1 ? <Link className="btn small" href={link(page - 1)}>← Précédent</Link> : <span />}<span className="meta">Page {page} / {pages}</span>{page < pages ? <Link className="btn small" href={link(page + 1)}>Suivant →</Link> : <span />}</div>}
      </div>
    </>
  );
}
