"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const KEY = "bricolo:nudge-artisan";
const PAUSE = 7 * 864e5; // une fois fermée, la fenêtre ne revient pas avant 7 jours
const DELAY = 8000;      // laisse le temps de voir la page d'accueil avant d'inviter
const POPULAR = /plomb|electric|frigor|macon|peintre|mecanic|menuis|carrel/;

/** Fenêtre d'invitation aux artisans, au centre de l'écran : photo, message, métiers, bouton pour créer son profil.
 *  S'ouvre au premier de : 8 s sur la page, défilement vers le bas, ou geste de sortie (ordinateur).
 *  Jamais si le visiteur a commencé à utiliser la recherche. Une seule fois par visite. */
export default function ArtisanNudge({ trades = [] }: { trades?: { slug: string; plural: string }[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    try { const t = Number(localStorage.getItem(KEY)); if (t && Date.now() - t < PAUSE) return; } catch {}
    let done = false;
    const stop = () => {
      done = true; clearTimeout(timer);
      window.removeEventListener("scroll", onScroll); document.removeEventListener("mouseout", onOut); document.removeEventListener("focusin", onFocus);
    };
    const show = () => {
      if (done) return; stop();
      try { if (sessionStorage.getItem("bricolo:popup-shown")) return; sessionStorage.setItem("bricolo:popup-shown", "1"); } catch {}
      setOpen(true);
    };
    const onScroll = () => { if (window.scrollY > window.innerHeight * 0.9) show(); };
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget && e.clientY <= 0 && window.matchMedia("(pointer:fine)").matches) show(); };
    // le visiteur utilise la recherche : on ne l'interrompt pas
    const onFocus = (e: FocusEvent) => { const el = e.target as HTMLElement | null; if (el?.closest?.("form")) stop(); };
    const timer = setTimeout(show, DELAY);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onOut);
    document.addEventListener("focusin", onFocus);
    return stop;
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
  const shown = trades.filter((t) => POPULAR.test(t.slug)).slice(0, 8);
  const more = Math.max(0, trades.length - shown.length);

  return (
    <div className="moment-back" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="moment nudge-pop" role="dialog" aria-modal="true" aria-labelledby="nudge-t">
        <button className="nudge-pop-x" type="button" onClick={close} aria-label="Fermer">×</button>
        <img className="nudge-pop-img" src="/photos/artisane-chantier.jpg" width={800} height={600} alt="Artisane en gilet de chantier, un mètre ruban à la main" />
        <div className="nudge-pop-body">
          <h2 id="nudge-t">Plombier, électricien, frigoriste, maçon… Faites-vous trouver.</h2>
          <p>Profil gratuit en 5 minutes. Les clients de votre quartier vous appellent ou vous écrivent sur WhatsApp.</p>
          {shown.length > 0 && (
            <ul className="nudge-trades" aria-label="Métiers présents sur Bricolo">
              {shown.map((t) => <li key={t.slug}>{t.plural}</li>)}
              {more > 0 && <li className="more">et {more} autres</li>}
            </ul>
          )}
          <div className="moment-act">
            <Link ref={btnRef} className="btn primary" href="/inscription" onClick={close}>Créer mon profil gratuit</Link>
            <button className="moment-skip" type="button" onClick={close}>Non merci</button>
          </div>
        </div>
      </div>
    </div>
  );
}
