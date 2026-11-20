"use client";
import Link from "next/link";

/** Erreur imprévue sur une page : message clair, bouton pour réessayer, référence à donner au support. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="inner sec stack" style={{ maxWidth: 560, textAlign: "center" }} role="alert">
      <p style={{ fontSize: 56, margin: 0 }} aria-hidden="true">⚠️</p>
      <h1 style={{ fontSize: "clamp(26px,5vw,36px)" }}>Un problème est survenu</h1>
      <p className="seo-intro" style={{ marginInline: "auto" }}>Ce n’est pas de votre faute. Réessayez dans un instant. Si cela continue, écrivez-nous à contact@monbricolo.com{error.digest ? ` en indiquant la référence ${error.digest}` : ""}.</p>
      <p className="row" style={{ justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn primary" onClick={() => reset()}>Réessayer</button>
        <Link className="btn ghost" href="/">Retour à l’accueil</Link>
      </p>
    </section>
  );
}
