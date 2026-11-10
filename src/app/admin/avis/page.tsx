import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, day, one } from "@/lib/admin";
import { moderateReview } from "../gestion";

export const metadata: Metadata = { title: "Avis", robots: { index: false } };
export const dynamic = "force-dynamic";
const TABS = [["pending", "À modérer"], ["published", "Publiés"], ["hidden", "Masqués"]] as const;

export default async function Avis({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const st = TABS.some((t) => t[0] === sp.statut) ? sp.statut! : "pending";
  const { data: rows } = await db.from("reviews").select("id, author_name, rating, comment, status, created_at, verified_by, artisan_reply, artisan:artisans(id, name)").eq("status", st).order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Modération</p><h1>Avis</h1></div></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      <div className="chips">{TABS.map(([k, l]) => <Link key={k} href={`/admin/avis?statut=${k}`} className={`chip${st === k ? " on" : ""}`}>{l}</Link>)}</div>
      <div className="card pad stack">
        {rows?.length ? rows.map((r) => { const a = one(r.artisan as any) as any; return (
          <div key={r.id} className="todo" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
            <span style={{ flex: "1 1 280px", minWidth: 0 }}><b>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b> · {r.author_name}<br />{r.comment || <span className="meta">Sans commentaire</span>}<br /><span className="meta">pour {a ? <Link href={`/admin/artisan/${a.id}`}>{a.name}</Link> : "—"} · {day(r.created_at)} · {(r as any).verified_by === "demande" ? "lien envoyé après une demande Bricolo" : (r as any).verified_by === "artisan" ? "lien envoyé par l’artisan" : "sans lien"}</span></span>
            <span className="row" style={{ gap: 6 }}>
              {r.status !== "published" && <form action={moderateReview}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="act" value="publish" /><input type="hidden" name="to" value={`/admin/avis?statut=${st}`} /><button className="btn small primary">Publier</button></form>}
              {r.status !== "hidden" && <form action={moderateReview}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="act" value="hide" /><input type="hidden" name="to" value={`/admin/avis?statut=${st}`} /><button className="btn small">Masquer</button></form>}
              <form action={moderateReview}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="act" value="delete" /><input type="hidden" name="to" value={`/admin/avis?statut=${st}`} /><button className="btn small danger">Supprimer</button></form>
            </span>
          </div>); }) : <p className="empty">Rien dans cette liste.</p>}
      </div>
    </>
  );
}
