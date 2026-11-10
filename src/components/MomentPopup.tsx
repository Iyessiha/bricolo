"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Action = { label: string; href?: string; share?: { path: string; text: string }; primary?: boolean };

/** Fenêtre affichée une seule fois (par navigateur) à un moment clé du parcours de l'artisan. */
export default function MomentPopup({ id, emoji, title, text, actions, delay = 1200 }: { id: string; emoji: string; title: string; text: string; actions: Action[]; delay?: number }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const key = `bricolo:moment:${id}`;

  useEffect(() => {
    try { if (localStorage.getItem(key)) return; } catch { /* stockage indisponible */ }
    // Un seul message à la fois : le premier qui se déclenche bloque les autres pour cette visite.
    const t = setTimeout(() => {
      try { if (sessionStorage.getItem("bricolo:popup-shown")) return; sessionStorage.setItem("bricolo:popup-shown", "1"); } catch {}
      setOpen(true);
    }, delay);
    return () => clearTimeout(t);
  }, [key, delay]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() { setOpen(false); try { localStorage.setItem(key, String(Date.now())); } catch {} }
  if (!open) return null;

  const shareHref = (s: { path: string; text: string }) => `https://wa.me/?text=${encodeURIComponent(`${s.text} ${window.location.origin}${s.path}`)}`;
  return (
    <div className="moment-back" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="moment" role="dialog" aria-modal="true" aria-labelledby={`m-${id}`}>
        <button ref={closeRef} className="moment-x" type="button" onClick={close} aria-label="Fermer">×</button>
        <div className="moment-ic" aria-hidden="true">{emoji}</div>
        <h2 id={`m-${id}`}>{title}</h2>
        <p>{text}</p>
        <div className="moment-act">
          {actions.map((a) => a.share
            ? <a key={a.label} className={`btn${a.primary ? " primary" : ""}`} href={shareHref(a.share)} target="_blank" rel="noopener" onClick={close}>{a.label}</a>
            : <Link key={a.label} className={`btn${a.primary ? " primary" : ""}`} href={a.href ?? "#"} onClick={close}>{a.label}</Link>)}
          <button className="moment-skip" type="button" onClick={close}>Plus tard</button>
        </div>
      </div>
    </div>
  );
}
