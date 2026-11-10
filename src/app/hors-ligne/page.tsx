import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hors connexion", robots: { index: false, follow: false } };

export default function HorsLigne() {
  return (
    <section className="inner sec stack" style={{ maxWidth: 560, textAlign: "center" }}>
      <h1 style={{ fontSize: "clamp(26px,5vw,36px)" }}>Vous êtes hors connexion</h1>
      <p className="seo-intro" style={{ marginInline: "auto" }}>Bricolo a besoin d’internet pour afficher les artisans. Vérifiez votre réseau (Wi-Fi ou données mobiles), puis réessayez.</p>
      <p><a className="btn primary" href="/">Réessayer</a></p>
    </section>
  );
}
