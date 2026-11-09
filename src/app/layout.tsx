import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
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
        <footer className="inner foot">Bricolo, l’annuaire des métiers de l’artisanat en Afrique de l’Ouest francophone.</footer>
      </body>
    </html>
  );
}
