/** Affichée tout de suite pendant le chargement d'une page : le clic donne un retour immédiat au lieu d'un écran figé. */
export default function Loading() {
  return (
    <section className="inner sec" aria-busy="true" aria-live="polite">
      <div className="skel" style={{ height: 34, width: "min(420px,70%)" }} />
      <div className="skel" style={{ height: 16, width: "min(260px,50%)", marginTop: 12 }} />
      <div className="skel" style={{ height: 120, marginTop: 24 }} />
      <div className="skel" style={{ height: 120, marginTop: 12 }} />
      <div className="skel" style={{ height: 120, marginTop: 12 }} />
      <span className="sr-only">Chargement…</span>
    </section>
  );
}
