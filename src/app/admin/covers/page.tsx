import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { appliquerCover, appliquerCoversEnMasse } from "@/app/admin/gestion";

export const metadata: Metadata = { title: "Covers Bricolo", robots: { index: false } };
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function Covers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const { data } = await db.from("artisans").select("id, name, status, verified, photo_url, cover_url, trade:trades(name), shots:portfolio_photos(id)").order("created_at");
  const rows = (data ?? []).map((a: any) => ({ ...a, trade: (Array.isArray(a.trade) ? a.trade[0] : a.trade)?.name ?? "", nShots: a.shots?.length ?? 0 }));
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Marque</p><h1>Covers Bricolo</h1></div></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <p className="hint">Chaque cover est générée à partir de la fiche : métier, pays, badge Vérifié (seulement si l’identité est contrôlée), photo de réalisation en fond quand l’artisan en a mis, sinon sa photo de profil. Téléchargez-la pour la proposer à l’artisan, ou appliquez-la sur sa fiche une fois qu’il est d’accord. Les formats webp ne sont pas lus : la cover se fait alors sans cette photo.</p>
      <form action={appliquerCoversEnMasse} style={{ margin: "12px 0" }}>
        <button className="btn primary" type="submit">Appliquer à toutes les fiches validées sans cover ({rows.filter((a: any) => a.status === "approved" && !a.cover_url).length})</button>
        <span className="meta" style={{ marginLeft: 10 }}>Les fiches qui ont déjà une cover ne changent pas. Vous pouvez ensuite adapter chaque profil avec « Personnaliser ».</span>
      </form>
      <div className="agrid">
        {rows.map((a: any) => (
          <div key={a.id} className="card pad stack">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/admin/covers/image/${a.id}`} alt={`Cover de ${a.name}`} loading="lazy" style={{ width: "100%", aspectRatio: "16/6", objectFit: "cover", borderRadius: 10, background: "var(--surface-100)" }} />
            <div><b>{a.name}</b><br /><span className="meta">{a.trade} · {a.nShots ? `${a.nShots} photo${a.nShots > 1 ? "s" : ""} de réalisation` : a.photo_url ? "photo de profil" : "sans photo"}{a.cover_url ? " · a déjà une cover" : ""}</span></div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <a className="btn small" href={`/admin/covers/image/${a.id}?dl=1`}>Télécharger</a>
              <form action={appliquerCover}><input type="hidden" name="id" value={a.id} /><button className="btn small primary" type="submit">{a.cover_url ? "Remplacer la cover" : "Appliquer sur la fiche"}</button></form>
              <Link className="btn small" href={`/admin/covers/${a.id}`}>Personnaliser</Link>
              <Link className="btn small ghost" href={`/admin/artisan/${a.id}`}>Dossier</Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
