import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false, follow: false } };

/** Lien cassé ou fiche supprimée : on garde le visiteur dans Bricolo au lieu de lui montrer une page technique. */
export default function NotFound() {
  return (
    <section className="inner sec stack" style={{ maxWidth: 560, textAlign: "center" }}>
      <p style={{ fontSize: 56, margin: 0 }} aria-hidden="true">🔧</p>
      <h1 style={{ fontSize: "clamp(26px,5vw,36px)" }}>Cette page n’existe pas</h1>
      <p className="seo-intro" style={{ marginInline: "auto" }}>Le lien est peut-être ancien, ou la fiche a été retirée. Recherchez directement un artisan près de chez vous.</p>
      <p className="row" style={{ justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <Link className="btn primary" href="/resultats">Trouver un artisan</Link>
        <Link className="btn ghost" href="/">Retour à l’accueil</Link>
      </p>
    </section>
  );
}
