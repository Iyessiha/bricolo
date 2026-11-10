"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "bricolo:nudge-artisan";
const PAUSE = 14 * 864e5; // une fois refusé, on ne revient pas avant 14 jours

/** Invitation discrète pour les artisans : bandeau après un délai, ou fenêtre à l'intention de sortie sur PC. Un seul message par visite. */
export default function ArtisanNudge() {
  const [mode, setMode] = useState<null | "bar" | "exit">(null);

  useEffect(() => {
    try { const t = Number(localStorage.getItem(KEY)); if (t && Date.now() - t < PAUSE) return; } catch {}
    let done = false;
    const show = (m: "bar" | "exit") => {
      if (done) return;
      try { if (sessionStorage.getItem("bricolo:popup-shown")) return; sessionStorage.setItem("bricolo:popup-shown", "1"); } catch {}
      done = true; setMode(m);
    };
    const timer = setTimeout(() => show("bar"), 25000);
    const onScroll = () => { const h = document.documentElement; if (window.scrollY > (h.scrollHeight - innerHeight) * 0.5 && window.scrollY > 600) show("bar"); };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Intention de sortie : PC uniquement (souris précise), après 15 s sur la page.
    const desk = matchMedia("(hover:hover) and (pointer:fine) and (min-width:1024px)").matches;
    const started = Date.now();
    const onLeave = (e: MouseEvent) => { if (desk && e.clientY <= 0 && Date.now() - started > 15000) show("exit"); };
    document.addEventListener("mouseleave", onLeave);
    return () => { clearTimeout(timer); window.removeEventListener("scroll", onScroll); document.removeEventListener("mouseleave", onLeave); };
  }, []);

  useEffect(() => {
    if (mode !== "exit") return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [mode]);

  function close() { setMode(null); try { localStorage.setItem(KEY, String(Date.now())); } catch {} }
  if (!mode) return null;

  if (mode === "bar") return (
    <div className="nudge-bar" role="region" aria-label="Invitation pour les artisans">
      <p><b>Vous êtes artisan ?</b> <span>Créez votre profil gratuit et soyez trouvé près de chez vous.</span></p>
      <Link className="btn small primary" href="/inscription" onClick={close}>Créer mon profil</Link>
      <button type="button" className="nudge-x" onClick={close} aria-label="Fermer">×</button>
    </div>
  );
  return (
    <div className="moment-back" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="moment" role="dialog" aria-modal="true" aria-labelledby="nudge-t">
        <button className="moment-x" type="button" onClick={close} aria-label="Fermer">×</button>
        <div className="moment-ic" aria-hidden="true">🔧</div>
        <h2 id="nudge-t">Vous êtes artisan ? Soyez trouvé par de nouveaux clients</h2>
        <p>Créez votre profil gratuit en 5 minutes. Il est visible après la vérification de votre identité, et les clients vous contactent directement, par appel ou WhatsApp.</p>
        <div className="moment-act">
          <Link className="btn primary" href="/inscription" onClick={close}>Créer mon profil gratuit</Link>
          <button className="moment-skip" type="button" onClick={close}>Non merci</button>
        </div>
      </div>
    </div>
  );
}
