import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { retirerDefaut, televerserDefaut } from "@/app/admin/gestion";
import { uploadedDefaults, resetUploadedDefaults } from "@/lib/default-covers-server";
import { defaultCoverUrl } from "@/lib/default-covers";

export const metadata: Metadata = { title: "Photos par défaut des métiers", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Defauts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  resetUploadedDefaults();
  const [{ data: trades }, up] = await Promise.all([db.from("trades").select("slug, plural").order("plural"), uploadedDefaults()]);
  return (
    <>
      <div className="atitle"><div><p className="eyebrow"><Link href="/admin/covers">← Covers des fiches</Link></p><h1>Photos par défaut des métiers</h1></div></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <p className="hint">Cette photo s’affiche sur la carte des artisans de ce métier qui n’ont pas de photo paysage (avec la mention « Photo illustrative »). Envoyez une image JPG, PNG ou WebP (5 Mo maximum) : elle est recadrée en paysage et allégée automatiquement. Sans photo envoyée, le site utilise l’une de ses photos de chantier. Utilisez des photos dont vous avez les droits, avec des artisans équipés de leur matériel de sécurité.</p>
      <div className="agrid">
        {(trades ?? []).map((t: any) => {
          const mine = up[t.slug];
          return (
            <div key={t.slug} className="card pad stack">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mine ?? defaultCoverUrl(t.slug, "")} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "16/7", objectFit: "cover", borderRadius: 10, display: "block" }} />
              <div><b>{t.plural}</b><br /><span className="meta">{mine ? "Photo envoyée par vous" : "Photo du site (par défaut)"}</span></div>
              <form action={televerserDefaut} className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input type="hidden" name="slug" value={t.slug} />
                <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required style={{ maxWidth: "100%" }} />
                <button className="btn small primary" type="submit">{mine ? "Remplacer" : "Envoyer"}</button>
              </form>
              {mine && <form action={retirerDefaut}><input type="hidden" name="slug" value={t.slug} /><button className="btn small" type="submit">Retirer (revenir à la photo du site)</button></form>}
            </div>
          );
        })}
      </div>
    </>
  );
}
