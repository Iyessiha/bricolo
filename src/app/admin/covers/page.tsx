import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { retirerCover, televerserCover, utiliserPhotoCommeCover } from "@/app/admin/gestion";
import { isGeneratedCover } from "@/lib/default-covers";
import { uploadedDefaults } from "@/lib/default-covers-server";
import TradeArt from "@/components/TradeArt";

export const metadata: Metadata = { title: "Covers des fiches", robots: { index: false } };
export const dynamic = "force-dynamic";

// Même cadre que les cartes du site (3:2, recadrage au centre) : ce que l’on voit ici est ce que verra le public.
const crop = { width: "100%", aspectRatio: "3/2", objectFit: "cover", borderRadius: 10, background: "var(--surface-100)", display: "block" } as const;

export default async function Covers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const [{ data }, upDefaults] = await Promise.all([
    db.from("artisans").select("id, name, status, cover_url, photo_url, trade:trades(name, slug), shots:portfolio_photos(id, url, created_at)").order("created_at"),
    uploadedDefaults(),
  ]);
  const rows = (data ?? []).map((a: any) => ({
    ...a,
    trade: (Array.isArray(a.trade) ? a.trade[0] : a.trade)?.name ?? "",
    trade_slug: (Array.isArray(a.trade) ? a.trade[0] : a.trade)?.slug ?? "",
    default_cover: upDefaults[(Array.isArray(a.trade) ? a.trade[0] : a.trade)?.slug ?? ""] ?? null,
    own: a.cover_url && !isGeneratedCover(a.cover_url) ? a.cover_url : null,
    old: isGeneratedCover(a.cover_url),
    shots: [...(a.shots ?? [])].sort((x: any, y: any) => String(x.created_at).localeCompare(String(y.created_at))),
  }));
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Marque</p><h1>Covers des fiches</h1></div><Link className="btn" href="/admin/covers/defauts">Photos par défaut des métiers</Link></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <p className="hint">Sur le site, la carte d’un artisan montre : sa cover (photo paysage téléversée), sinon la photo par défaut de son métier, sinon une illustration du métier. Ici, choisissez parmi ses photos celle qui deviendra sa cover. Les vignettes sont recadrées exactement comme sur la carte. Faites-le avec l’accord de l’artisan.</p>
      <div className="akpi">
        <div className="kpi"><span>Avec une cover</span><b>{rows.filter((a: any) => a.own).length}</b><small>sur {rows.length} fiches</small></div>
        <div className="kpi hot"><span>Sans cover</span><b>{rows.filter((a: any) => !a.own).length}</b><small>affichent la photo du métier ou son illustration</small></div>
        <div className="kpi"><span>Anciennes covers générées</span><b>{rows.filter((a: any) => a.old).length}</b><small>non affichées, à retirer</small></div>
      </div>
      <div className="agrid">
        {rows.map((a: any) => (
          <div key={a.id} className="card pad stack">
            {a.own ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.own} alt={`Cover de ${a.name}`} loading="lazy" style={crop} />
              : a.default_cover
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.default_cover} alt="" loading="lazy" style={crop} />
                : <div style={{ ...crop, position: "relative", overflow: "hidden", background: "linear-gradient(135deg,var(--brand-soft),var(--surface-sunken))", color: "var(--brand)" }} role="img" aria-label={`Illustration du métier pour ${a.name}`}><TradeArt slug={a.trade_slug} /></div>}
            <div><b>{a.name}</b><br /><span className="meta">{a.trade} · {a.own ? "a une cover" : a.default_cover ? "affiche la photo du métier" : a.old ? "ancienne cover générée (non affichée)" : "affiche l’illustration du métier"}</span></div>
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
            <form action={televerserCover} className="stack" style={{ gap: 6 }}>
              <input type="hidden" name="id" value={a.id} />
              <label className="meta" htmlFor={`cov-${a.id}`}>Remplacer la cover (JPG, PNG ou WebP, recadrée en 1600 × 600)</label>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <input id={`cov-${a.id}`} type="file" name="file" accept="image/*" required style={{ maxWidth: "100%" }} />
                <button className="btn small primary" type="submit">Téléverser</button>
              </div>
            </form>
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
