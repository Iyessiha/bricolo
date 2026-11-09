import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { COMPANY } from "@/lib/company";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#27489a" }, { media: "(prefers-color-scheme: dark)", color: "#0e1525" }] };

export const metadata: Metadata = {
  authors: [{ name: COMPANY.name }],
  publisher: COMPANY.name,
  title: { default: "Bricolo", template: "%s · Bricolo" },
  description: "L’annuaire des artisans de l’Afrique de l’Ouest francophone : frigoristes, mécaniciens, menuisiers, électriciens et plus.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </body>
    </html>
  );
}
