import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { loadListing } from "@/lib/seo-data";
import SeoListing, { listingTitle } from "@/components/SeoListing";
import { cut } from "@/lib/seo";

type P = { params: Promise<{ pays: string; metier: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  if (!hasSupabase()) return {};
  const { pays, metier } = await params;
  const d = await loadListing(pays, metier);
  if (!d) return { robots: { index: false } };
  const title = listingTitle(d);
  const n = d.list.length;
  const description = cut(`${n ? `${n} ${d.trade.plural.toLowerCase()} référencés` : d.trade.plural}. Comparez les profils, avis et tarifs, puis contactez l’artisan par téléphone ou WhatsApp. Gratuit, sans compte.`, 160);
  const url = `/artisans/${pays}/${metier}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website", siteName: "Bricolo", locale: "fr_FR" }, robots: n ? undefined : { index: false, follow: true } };
}

export default async function Page({ params }: P) {
  if (!hasSupabase()) notFound();
  const { pays, metier } = await params;
  const d = await loadListing(pays, metier);
  if (!d) notFound();
  return <SeoListing d={d} />;
}
