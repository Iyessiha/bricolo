import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { retirerCover, utiliserPhotoCommeCover } from "@/app/admin/gestion";
import { isGeneratedCover } from "@/lib/default-covers";

export const metadata: Metadata = { title: "Covers des fiches", robots: { index: false } };
export const dynamic = "force-dynamic";

const crop = { width: "100%", aspectRatio: "16/7", objectFit: "cover", borderRadius: 10, background: "var(--surface-100)", display: "block" } as const;

export default async function Covers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const { data } = await db.from("artisans").select("id, name, status, cover_url, photo_url, trade:trades(name), shots:portfolio_photos(id, url, created_at)").order("created_at");
  const rows = (data ?? []).map((a: any) => ({
    ...a,
    trade: (Array.isArray(a.trade) ? a.trade[0] : a.trade)?.name ?? "",
    own: a.cover_url && !isGeneratedCover(a.cover_url) ? a.cover_url : null,
    old: isGeneratedCover(a.cover_url),
    shots: [...(a.shots ?? [])].sort((x: any, y: any) => String(x.created_at).localeCompare(String(y.created_at))),
  }));
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Marque</p><h1>Covers des fiches</h1></div><Link className="btn" href="/admin/covers/defauts">Photos par défaut des métiers</Link></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <p className="hint">Sur la page d’accueil, la carte d’un artisan montre : sa cover (photo paysage téléversée), sinon l’une de ses réalisations en paysage, sinon la photo par défaut de son métier. Ici, choisissez parmi ses photos celle qui deviendra sa cover. Les vignettes sont recadrées exactement comme sur la carte. Faites-le avec l’accord de l’artisan.</p>
      <div className="agrid">
        {rows.map((a: any) => (
          <div key={a.id} className="card pad stack">
            {a.own ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.own} alt={`Cover de ${a.name}`} loading="lazy" style={crop} />
              : <div style={{ ...crop, display: "grid", placeItems: "center", color: "var(--ink-muted)", fontSize: 13 }}>Photo par défaut du métier</div>}
            <div><b>{a.name}</b><br /><span className="meta">{a.trade} · {a.own ? "a une cover" : a.old ? "ancienne cover générée (non affichée)" : "sans cover"}</span></div>
            {a.shots.length ? (
              <div>
                <span className="meta">Photos de l’artisan ({a.shots.length})</span>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", marginTop: 6 }}>
                  {a.shots.map((p: any) => (
                    <form key={p.id} action={utiliserPhotoCommeCover} style={{ display: "grid", gap: 4 }}>
                      <input type="hidden" name="id" value={a.id} /><input type="hidden" name="photo" value={p.id} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" loading="lazy" style={crop} />
                      <button className="btn small" type="submit">Utiliser comme cover</button>
                    </form>
                  ))}
                </div>
              </div>
            ) : <p className="meta">Cet artisan n’a pas encore téléversé de photo de réalisation.</p>}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {(a.own || a.old) && <form action={retirerCover}><input type="hidden" name="id" value={a.id} /><button className="btn small" type="submit">Retirer la cover</button></form>}
              <Link className="btn small ghost" href={`/admin/artisan/${a.id}`}>Dossier</Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
