import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, day } from "@/lib/admin";

export const metadata: Metadata = { title: "Journal d’activité", robots: { index: false } };
export const dynamic = "force-dynamic";
const PER = 40;
const L: Record<string, string> = {
  "artisan.suspendre": "a suspendu", "artisan.reactiver": "a réactivé", "artisan.badge_donner": "a accordé le badge à", "artisan.badge_retirer": "a retiré le badge de", "artisan.note": "a noté sur", "artisan.supprimer": "a supprimé le compte de",
  "boost.offrir": "a offert un boost à", "avis.publish": "a publié un avis", "avis.hide": "a masqué un avis", "avis.delete": "a supprimé un avis", "demande.statut": "a changé une demande",
  "prix.modifier": "a modifié les prix", "zone.ajouter": "a ajouté la zone", "equipe.ajouter": "a ajouté l’admin", "equipe.retirer": "a retiré l’admin", "export.csv": "a exporté un CSV",
};

export default async function Journal({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { data: rows, count } = await db.from("admin_audit").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER));
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Traçabilité</p><h1>Journal d’activité</h1></div><span className="meta">{count ?? 0} action{(count ?? 0) > 1 ? "s" : ""}</span></div>
      <div className="card pad stack">
        {rows?.length ? <div className="tw"><table className="tbl"><thead><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Détail</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id}><td>{day(r.created_at)}</td><td>{r.admin_email}</td>
            <td>{L[r.action] ?? r.action} {r.target_type === "artisan" && r.target_id ? <Link href={`/admin/artisan/${r.target_id}`}><b>{r.label}</b></Link> : r.label ? <b>{r.label}</b> : null}</td>
            <td className="meta">{r.detail ? Object.entries(r.detail as Record<string, unknown>).map(([k, v]) => `${k} : ${v}`).join(" · ") : ""}</td></tr>)}
        </tbody></table></div> : <p className="empty">Aucune action enregistrée.</p>}
        {pages > 1 && <div className="pager">{page > 1 ? <Link className="btn small" href={`/admin/journal?page=${page - 1}`}>← Précédent</Link> : <span />}<span className="meta">Page {page} / {pages}</span>{page < pages ? <Link className="btn small" href={`/admin/journal?page=${page + 1}`}>Suivant →</Link> : <span />}</div>}
      </div>
    </>
  );
}
