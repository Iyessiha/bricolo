"use client";

/** Dernier filet de sécurité : l'erreur a touché la mise en page elle-même, donc pas de composants du site ici. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "Arial,Helvetica,sans-serif", background: "#eef1f6", color: "#13203a" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 20px", textAlign: "center" }} role="alert">
          <h1 style={{ fontSize: 28 }}>Bricolo est momentanément indisponible</h1>
          <p style={{ lineHeight: 1.6 }}>Réessayez dans un instant. Si le problème continue, écrivez-nous à contact@monbricolo.com{error.digest ? ` (référence ${error.digest})` : ""}.</p>
          <button type="button" onClick={() => reset()} style={{ background: "#27489a", color: "#fff", border: 0, borderRadius: 10, padding: "12px 22px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Réessayer</button>
        </div>
      </body>
    </html>
  );
}
