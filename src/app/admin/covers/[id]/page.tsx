import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { appliquerCover } from "@/app/admin/gestion";
import { SEARCH_BY_SLUG, coverInputOf, unsplashBg } from "@/lib/cover-art";

export const metadata: Metadata = { title: "Cover d’un artisan", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CoverArtisan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { db } = await requireAdmin();
  const c = await coverInputOf(db, id);
  if (!c) notFound();
  const raw = (sp.bg ?? "").trim();
  const bg = unsplashBg(raw);
  const q = `?${bg ? `bg=${encodeURIComponent(raw)}` : ""}`;
  const search = SEARCH_BY_SLUG[c.slug] ?? c.trade.toLowerCase();
  return (
    <>
      <div className="atitle"><div><p className="eyebrow"><Link href="/admin/covers">← Covers</Link></p><h1>Cover de {c.name}</h1></div></div>
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      {raw && !bg && <p className="notice err" role="alert">Cette adresse n’est pas acceptée. Utilisez l’adresse de l’image (elle commence par https://images.unsplash.com/…).</p>}
      <div className="card pad stack">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/admin/covers/image/${id}${q}`} alt={`Cover de ${c.name}`} style={{ width: "100%", aspectRatio: "16/6", objectFit: "cover", borderRadius: 10, background: "var(--surface-100)" }} />
        <form method="get" className="stack" style={{ gap: 8 }}>
          <div className="fld"><label htmlFor="bg">Photo de fond (Unsplash)</label>
            <input id="bg" name="bg" defaultValue={raw} placeholder="https://images.unsplash.com/photo-…" />
            <span className="hint">Sur la page de la photo, clic droit sur l’image, « Copier l’adresse de l’image ». Laissez vide pour utiliser les photos de l’artisan, sinon son métier en icône.</span></div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn" type="submit">Voir l’aperçu</button>
            <a className="btn" href={`https://unsplash.com/s/photos/${search}`} target="_blank" rel="noopener noreferrer">Chercher des photos « {c.trade} » sur Unsplash ↗</a>
          </div>
        </form>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <a className="btn primary" href={`/admin/covers/image/${id}${q}${bg ? "&" : ""}dl=1`}>Télécharger l’image</a>
          <form action={appliquerCover}><input type="hidden" name="id" value={id} /><input type="hidden" name="bg" value={bg ? raw : ""} /><button className="btn" type="submit">{c.coverUrl ? "Remplacer la cover de la fiche" : "Appliquer sur la fiche"}</button></form>
        </div>
        <p className="hint">Vérifiez avant de publier : les photos doivent montrer un artisan au travail, avec ses équipements de sécurité, et être libres de droits (licence Unsplash gratuite, pas « Unsplash+ »). N’appliquez la cover qu’avec l’accord de l’artisan.</p>
      </div>
    </>
  );
}
