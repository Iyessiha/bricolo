import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { loadHub, inCountry, defaultHubTitle, defaultHubDesc } from "@/lib/seo-data";
import { jsonLd, slugify } from "@/lib/seo";
import { siteUrl } from "@/lib/env";
import Flag from "@/components/Flag";
import { getSettings } from "@/lib/site-settings";

type P = { params: Promise<{ pays: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  if (!hasSupabase()) return {};
  const { pays } = await params;
  const h = await loadHub(pays);
  if (!h) return { robots: { index: false } };
  const st = await getSettings();
  const cc = h.country.code as "ci" | "sn" | "bf" | "ml" | "ne" | "bj" | "tg";
  const title = st[`seo_title_${cc}`] ?? defaultHubTitle(cc, h.country.name);
  const description = st[`seo_desc_${cc}`] ?? defaultHubDesc(cc, h.country.name, h.trades.map((t) => t.plural));
  return { title, description, alternates: { canonical: `/artisans/${pays}` }, openGraph: { title, description, url: `/artisans/${pays}`, type: "website", siteName: "Bricolo", locale: "fr_FR" } };
}

export default async function Hub({ params }: P) {
  if (!hasSupabase()) notFound();
  const { pays } = await params;
  const h = await loadHub(pays);
  if (!h) notFound();
  const cities = h.zones.filter((z) => !z.parent_id && h.zones.some((x) => x.parent_id === z.id));
  const base = siteUrl();
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: `${base}/` }, { "@type": "ListItem", position: 2, name: h.country.name, item: `${base}/artisans/${h.country.code}` }] };
  return (
    <section className="inner sec stack">
      <nav className="crumbs" aria-label="Fil d’Ariane"><Link href="/">Accueil</Link> › {h.country.name}</nav>
      <div className="sec-head"><h1 style={{ fontSize: "clamp(26px,4.5vw,40px)" }} className="fl"><Flag code={h.country.code} size={28} /> Artisans {inCountry(h.country.code, h.country.name)}</h1></div>
      <p className="seo-intro">{h.total ? `${h.total} artisans sont référencés ${inCountry(h.country.code, h.country.name)}.` : "Les premiers artisans arrivent."} Choisissez un métier pour comparer les profils, les avis et les prestations, puis contactez l’artisan directement, sans compte et sans commission.</p>
      <div className="stack" style={{ gap: 8 }}><h2 style={{ fontSize: 20 }}>Par métier</h2>
        <div className="seo-links">{h.trades.map((t) => <Link key={t.id} href={`/artisans/${h.country.code}/${t.slug}`}>{t.plural}{h.count.get(t.id) ? ` (${h.count.get(t.id)})` : ""}</Link>)}</div></div>
      {cities.length > 0 && <div className="stack" style={{ gap: 8 }}><h2 style={{ fontSize: 20 }}>Par ville</h2>
        <div className="seo-links">{cities.map((z) => <Link key={z.id} href={`/resultats?zone=${z.id}`}>{z.name}</Link>)}</div></div>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </section>
  );
}
