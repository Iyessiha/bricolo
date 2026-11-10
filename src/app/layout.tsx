import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { COMPANY } from "@/lib/company";
import Trackers from "@/components/Trackers";
import { getSettings } from "@/lib/site-settings";
import { siteUrl } from "@/lib/env";
import { jsonLd, DEFAULT_TITLE, DEFAULT_DESC } from "@/lib/seo";
import { parseSnippet, type CustomItem } from "@/lib/custom-pixels";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#27489a" }, { media: "(prefers-color-scheme: dark)", color: "#0e1525" }] };


export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    applicationName: "Bricolo",
    authors: [{ name: COMPANY.name }],
    publisher: COMPANY.name,
    creator: COMPANY.name,
    title: { default: s.home_title ?? DEFAULT_TITLE, template: "%s · Bricolo" },
    description: s.home_description ?? DEFAULT_DESC,
    keywords: ["artisan", "artisan pro", "annuaire artisans", "plombier", "électricien", "menuisier", "frigoriste", "mécanicien", "Côte d’Ivoire", "Abidjan", "Sénégal", "Dakar", "Burkina Faso", "Mali", "Niger", "Bénin", "Togo", "Afrique de l’Ouest"],
    alternates: { canonical: "./" },
    openGraph: { type: "website", siteName: "Bricolo", locale: "fr_FR" },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    formatDetection: { telephone: false, email: false, address: false },
    verification: { google: s.google_verification, other: { ...(s.bing_verification ? { "msvalidate.01": s.bing_verification } : {}), ...(s.meta_domain_verification ? { "facebook-domain-verification": s.meta_domain_verification } : {}) } },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const base = siteUrl();
  const custom: CustomItem[] = (["custom_pixel_1", "custom_pixel_2", "custom_pixel_3"] as const).flatMap((k) => { const p = s[k] ? parseSnippet(s[k]!) : null; return p?.ok ? p.items : []; });
  const site = [
    { "@context": "https://schema.org", "@type": "Organization", "@id": `${base}/#organisation`, name: "Bricolo", legalName: COMPANY.name, url: base, logo: `${base}/icon`, email: COMPANY.email, areaServed: ["CI", "SN", "BF", "ML", "NE", "BJ", "TG"] },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": `${base}/#site`, name: "Bricolo", url: base, inLanguage: "fr", publisher: { "@id": `${base}/#organisation` }, potentialAction: { "@type": "SearchAction", target: `${base}/resultats?metier={search_term_string}`, "query-input": "required name=search_term_string" } },
  ];
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Instrument+Sans:wght@400..700&display=swap"
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <Trackers ga4={s.ga4_id} ads={s.google_ads_id} gtm={s.gtm_id} meta={s.meta_pixel_id} tiktok={s.tiktok_pixel_id} custom={custom} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} />
      </body>
    </html>
  );
}
