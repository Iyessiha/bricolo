import type { Metadata } from "next";
import Link from "next/link";
import AdminImageInput from "@/components/AdminImageInput";
import { requireAdmin } from "@/lib/admin";
import { definirModeDefaut, definirModeTous, retirerDefaut, televerserDefaut } from "@/app/admin/gestion";
import { defaultSettings, resetUploadedDefaults } from "@/lib/default-covers-server";
import { defaultCoverUrl } from "@/lib/default-covers";

export const metadata: Metadata = { title: "Covers par défaut des métiers", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Defauts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  resetUploadedDefaults();
  const [{ data: trades }, ds] = await Promise.all([db.from("trades").select("slug, plural").order("plural"), defaultSettings()]);
  return (
    <>
      <div className="atitle"><div><p className="eyebrow"><Link href="/admin/covers">← Covers des fiches</Link></p><h1>Covers par défaut des métiers</h1></div></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <p className="hint">Cette cover s’affiche sur la carte des artisans de ce métier qui n’ont pas encore téléversé de cover paysage. Pour chaque métier, choisissez un <b>dessin SVG</b> aux couleurs de Bricolo (généré automatiquement, très léger, aucune photo à fournir) ou une <b>photo</b> (la vôtre, sinon une photo du site). Seules les images <b>en paysage</b> sont acceptées (JPG, PNG ou WebP, 5 Mo maximum, 800 px de large minimum) : elles sont recadrées et allégées automatiquement. Utilisez des photos dont vous avez les droits.</p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <form action={definirModeTous}><input type="hidden" name="mode" value="svg" /><button className="btn small primary" type="submit">Tous les métiers en dessin SVG</button></form>
        <form action={definirModeTous}><input type="hidden" name="mode" value="photo" /><button className="btn small" type="submit">Tous les métiers en photo</button></form>
      </div>
      <div className="agrid">
        {(trades ?? []).map((t: any) => {
          const mine = ds.up[t.slug];
          const svg = ds.modes[t.slug] === "svg";
          const shown = svg ? `/cover-defaut/${t.slug}` : mine ?? defaultCoverUrl(t.slug, "");
          return (
            <div key={t.slug} className="card pad stack">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "16/7", objectFit: "cover", borderRadius: 10, display: "block" }} />
              <div><b>{t.plural}</b><br /><span className="meta">{svg ? "Dessin SVG Bricolo" : mine ? "Photo envoyée par vous" : "Photo du site (par défaut)"}</span></div>
              <form action={definirModeDefaut} className="row" style={{ gap: 6 }}>
                <input type="hidden" name="slug" value={t.slug} />
                <button className={`btn small${svg ? " primary" : ""}`} name="mode" value="svg" type="submit" aria-pressed={svg}>Dessin SVG</button>
                <button className={`btn small${!svg ? " primary" : ""}`} name="mode" value="photo" type="submit" aria-pressed={!svg}>Photo</button>
              </form>
              <form action={televerserDefaut} className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input type="hidden" name="slug" value={t.slug} />
                <AdminImageInput />
                <button className="btn small" type="submit">{mine ? "Remplacer la photo" : "Envoyer une photo paysage"}</button>
              </form>
              {mine && <form action={retirerDefaut}><input type="hidden" name="slug" value={t.slug} /><button className="btn small" type="submit">Retirer ma photo</button></form>}
            </div>
          );
        })}
      </div>
    </>
  );
}
