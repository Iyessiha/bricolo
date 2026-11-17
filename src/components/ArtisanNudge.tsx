"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const KEY = "bricolo:nudge-artisan";
const PAUSE = 7 * 864e5; // une fois fermée, la fenêtre ne revient pas avant 7 jours
const DELAY = 2500;      // elle s'ouvre peu après l'arrivée, le temps de voir la page

/** Fenêtre d'invitation aux artisans, au centre de l'écran : photo, message, bouton pour créer son profil. Une seule fois par visite. */
export default function ArtisanNudge() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    try { const t = Number(localStorage.getItem(KEY)); if (t && Date.now() - t < PAUSE) return; } catch {}
    const timer = setTimeout(() => {
      try { if (sessionStorage.getItem("bricolo:popup-shown")) return; sessionStorage.setItem("bricolo:popup-shown", "1"); } catch {}
      setOpen(true);
    }, DELAY);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    btnRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [open]);

  function close() { setOpen(false); try { localStorage.setItem(KEY, String(Date.now())); } catch {} }
  if (!open) return null;

  return (
    <div className="moment-back" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="moment nudge-pop" role="dialog" aria-modal="true" aria-labelledby="nudge-t">
        <button className="nudge-pop-x" type="button" onClick={close} aria-label="Fermer">×</button>
        <img className="nudge-pop-img" src="/photos/artisane-chantier.jpg" width={800} height={600} alt="Artisane en gilet de chantier, un mètre ruban à la main" />
        <div className="nudge-pop-body">
          <h2 id="nudge-t">Vous êtes artisan&nbsp;? Soyez trouvé par de nouveaux clients</h2>
          <p>Créez votre profil gratuit en 5 minutes. Les clients de votre quartier vous appellent ou vous écrivent directement sur WhatsApp.</p>
          <div className="moment-act">
            <Link ref={btnRef} className="btn primary" href="/inscription" onClick={close}>Créer mon profil gratuit</Link>
            <button className="moment-skip" type="button" onClick={close}>Non merci</button>
          </div>
        </div>
      </div>
    </div>
  );
}
