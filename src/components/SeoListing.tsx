import Link from "next/link";
import ArtisanCard from "@/components/ArtisanCard";
import { jsonLd, slugify } from "@/lib/seo";
import { inCountry } from "@/lib/seo-data";
import { siteUrl } from "@/lib/env";

type Data = NonNullable<Awaited<ReturnType<typeof import("@/lib/seo-data").loadListing>>>;

export function listingTitle(d: Data) {
  return `${d.trade.plural}${d.zone ? ` à ${d.zone.name}` : ""} ${inCountry(d.country.code, d.country.name)}`;
}

/** Page d'atterrissage « métier + pays (+ ville) » : un contenu utile, des liens internes, des données structurées. */
export default function SeoListing({ d }: { d: Data }) {
  const base = siteUrl();
  const where = d.zone ? `à ${d.zone.name}` : inCountry(d.country.code, d.country.name);
  const path = `/artisans/${d.country.code}/${d.trade.slug}${d.zone ? `/${slugify(d.zone.name)}` : ""}`;
  const title = listingTitle(d);
  const n = d.list.length;
  const cities = d.zones.filter((z) => !z.parent_id && d.zones.some((x) => x.parent_id === z.id));
  const around = d.zone ? (d.zone.parent_id ? d.zones.filter((z) => z.parent_id === d.zone!.parent_id && z.id !== d.zone!.id).slice(0, 12) : d.zones.filter((z) => z.parent_id === d.zone!.id).slice(0, 24)) : cities.slice(0, 24);
  const others = d.trades.filter((t) => t.id !== d.trade.id && (d.count.get(t.id) ?? 0) > 0).slice(0, 12);
  const faq = [
    [`Comment trouver un ${d.trade.name.toLowerCase()} ${where} ?`, `Sur Bricolo, comparez les profils de ${d.trade.plural.toLowerCase()} ${where}, consultez leurs avis et leurs prestations, puis appelez-les ou écrivez-leur sur WhatsApp. C’est gratuit et sans compte.`],
    [`Les ${d.trade.plural.toLowerCase()} de Bricolo sont-ils vérifiés ?`, "Chaque artisan envoie une pièce d’identité et un selfie contrôlés par notre équipe. Ceux qui sont validés portent le badge « Vérifié »."],
    [`Combien coûte un ${d.trade.name.toLowerCase()} ${where} ?`, "Chaque artisan indique un tarif indicatif sur sa fiche. Convenez du prix précis avec lui avant le début des travaux : Bricolo ne prend aucune commission."],
  ] as const;
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: d.country.name, item: `${base}/artisans/${d.country.code}` },
      { "@type": "ListItem", position: 3, name: d.trade.plural, item: `${base}/artisans/${d.country.code}/${d.trade.slug}` },
      ...(d.zone ? [{ "@type": "ListItem", position: 4, name: d.zone.name, item: `${base}${path}` }] : []),
    ] },
    ...(n ? [{ "@context": "https://schema.org", "@type": "ItemList", name: title, numberOfItems: n, itemListElement: d.list.slice(0, 20).map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/artisan/${a.id}`, name: a.name })) }] : []),
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  const q = new URLSearchParams({ metier: d.trade.slug, ...(d.zone ? { zone: d.zone.id } : {}) }).toString();
  return (
    <section className="inner sec stack">
      <nav className="crumbs" aria-label="Fil d’Ariane">
        <Link href="/">Accueil</Link> › <Link href={`/artisans/${d.country.code}`}>{d.country.name}</Link> › {d.zone ? <><Link href={`/artisans/${d.country.code}/${d.trade.slug}`}>{d.trade.plural}</Link> › {d.zone.name}</> : d.trade.plural}
      </nav>
      <div className="sec-head"><h1 style={{ fontSize: "clamp(26px,4.5vw,40px)" }}>{title}</h1></div>
      <p className="seo-intro">
        {n ? `${n} ${n > 1 ? d.trade.plural.toLowerCase() : d.trade.name.toLowerCase()} ${n > 1 ? "sont" : "est"} référencé${n > 1 ? "s" : ""} ${where} sur Bricolo.` : `Aucun ${d.trade.name.toLowerCase()} n’est encore référencé ${where}.`}{" "}
        {d.trade.description ? `${d.trade.description}. ` : ""}Comparez les profils, les avis et les prestations, puis contactez directement l’artisan par téléphone ou WhatsApp, gratuitement et sans compte.
      </p>
      {n ? <div className="cards">{d.list.map((a) => <ArtisanCard country={d.country.code} key={a.id} a={a} />)}</div> : (
        <div className="card pad stack"><p>Vous êtes {d.trade.name.toLowerCase()} {where} ? Soyez le premier à apparaître ici.</p><p><Link className="btn primary" href="/inscription">Créer mon profil gratuitement</Link></p></div>
      )}
      <p><Link className="btn" href={`/resultats?${q}`}>Affiner la recherche (vérifiés, ouverts maintenant, urgences)</Link></p>
      {around.length > 0 && <div className="stack" style={{ gap: 8 }}><h2 style={{ fontSize: 20 }}>{d.zone ? `${d.trade.plural} dans les environs` : `${d.trade.plural} par ville`}</h2>
        <div className="seo-links">{around.map((z) => <Link key={z.id} href={`/artisans/${d.country.code}/${d.trade.slug}/${slugify(z.name)}`}>{d.trade.plural} à {z.name}</Link>)}</div></div>}
      {others.length > 0 && <div className="stack" style={{ gap: 8 }}><h2 style={{ fontSize: 20 }}>Autres métiers {inCountry(d.country.code, d.country.name)}</h2>
        <div className="seo-links">{others.map((t) => <Link key={t.id} href={`/artisans/${d.country.code}/${t.slug}${d.zone ? `/${slugify(d.zone.name)}` : ""}`}>{t.plural}</Link>)}</div></div>}
      <div className="stack" style={{ gap: 10 }}><h2 style={{ fontSize: 20 }}>Questions fréquentes</h2>
        {faq.map(([qq, a]) => <details key={qq} className="card pad"><summary><b>{qq}</b></summary><p style={{ marginTop: 8 }}>{a}</p></details>)}</div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </section>
  );
}
