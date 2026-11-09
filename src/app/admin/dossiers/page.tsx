import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, ago, one } from "@/lib/admin";
import { countryName } from "@/lib/countries";

export const metadata: Metadata = { title: "Dossiers à examiner", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Dossiers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const [{ data: ident }, { data: dipl }] = await Promise.all([
    db.from("artisan_identity").select("artisan_id, submitted_at, doc_type, artisan:artisans(id, name, country_code, status, trade:trades(name))").eq("status", "pending").order("submitted_at"),
    db.from("artisan_diplomas").select("id, title, submitted_at, artisan:artisans(id, name, country_code)").eq("status", "pending").order("submitted_at"),
  ]);
  const hours = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 36e5);
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Vérification</p><h1>Dossiers à examiner</h1></div><span className="meta">Les plus anciens d’abord</span></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Pièces d’identité ({ident?.length ?? 0})</h2>
        {ident?.length ? <div className="tw"><table className="tbl"><thead><tr><th>Artisan</th><th>Métier</th><th>Pays</th><th>Envoyé</th><th></th></tr></thead><tbody>
          {ident.map((i) => { const a = one(i.artisan as any) as any; const h = hours(i.submitted_at); return (
            <tr key={i.artisan_id}><td><b>{a?.name}</b></td><td>{one(a?.trade)?.name}</td><td>{a ? countryName(a.country_code) : ""}</td>
              <td>{ago(i.submitted_at)} {h > 48 && <span className="sla">⚠ +48 h</span>}</td>
              <td className="num"><Link className="btn small primary" href={`/admin/artisan/${i.artisan_id}`}>Examiner</Link></td></tr>); })}
        </tbody></table></div> : <p className="empty">Aucun dossier en attente. 🎉</p>}
      </div>
      <div className="card pad stack"><h2 style={{ fontSize: 17 }}>Diplômes ({dipl?.length ?? 0})</h2>
        {dipl?.length ? <div className="tw"><table className="tbl"><thead><tr><th>Artisan</th><th>Diplôme</th><th>Envoyé</th><th></th></tr></thead><tbody>
          {dipl.map((d) => { const a = one(d.artisan as any) as any; return (
            <tr key={d.id}><td><b>{a?.name}</b></td><td>{d.title}</td><td>{ago(d.submitted_at)}</td><td className="num"><Link className="btn small" href={`/admin/artisan/${a?.id}#diplomes`}>Examiner</Link></td></tr>); })}
        </tbody></table></div> : <p className="empty">Aucun diplôme en attente.</p>}
      </div>
    </>
  );
}
