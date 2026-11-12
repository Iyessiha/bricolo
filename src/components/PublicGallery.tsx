"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MARK_D, MARK_VIEWBOX } from "@/lib/logo";

type Shot = { id: string; url: string; caption: string | null };

/** Filigrane Bricolo, posé automatiquement sur chaque photo affichée (vignettes et plein écran). */
function Mark({ big = false }: { big?: boolean }) {
  return (
    <span className={`wm${big ? " big" : ""}`} aria-hidden="true">
      <svg viewBox={MARK_VIEWBOX} width="1em" height="1em" fill="currentColor"><path d={MARK_D} /></svg>
      <b>Bricolo</b>
    </span>
  );
}

/** Galerie publique : les vignettes ouvrent un visualiseur plein écran où l'on fait défiler les photos (flèches, glissement, clavier). */
export default function PublicGallery({ shots, label }: { shots: Shot[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const x0 = useRef<number | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const n = shots.length;

  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);
  const close = useCallback(() => { setOpen(null); opener.current?.focus(); }, []);

  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Tab") { e.preventDefault(); closeBtn.current?.focus(); }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);
    closeBtn.current?.focus();
    // Précharge les voisines pour que le défilement soit instantané.
    for (const d of [1, -1]) { const im = new Image(); im.src = shots[(open + d + n) % n].url; }
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [open, go, close, n, shots]);

  const cur = open === null ? null : shots[open];
  return (
    <>
      <div className="gal">
        {shots.map((s, i) => (
          <button key={s.id} type="button" className="galb" onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }} aria-label={`Agrandir la photo ${i + 1} sur ${n}`}>
            <img src={s.url} alt={s.caption ?? `${label} ${i + 1}`} loading="lazy" /><Mark />
          </button>
        ))}
      </div>
      {cur && (
        <div className="lb" role="dialog" aria-modal="true" aria-label="Photos de réalisations"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          onPointerDown={(e) => { x0.current = e.clientX; }}
          onPointerUp={(e) => { if (x0.current !== null) { const dx = e.clientX - x0.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); x0.current = null; } }}>
          <button ref={closeBtn} type="button" className="lb-x" onClick={close} aria-label="Fermer">×</button>
          <span className="lb-n" aria-live="polite">{open! + 1} / {n}</span>
          {n > 1 && <button type="button" className="lb-a l" onClick={() => go(-1)} aria-label="Photo précédente">‹</button>}
          <figure className="lb-f"><div className="lb-i"><img src={cur.url} alt={cur.caption ?? `${label} ${open! + 1}`} draggable={false} /><Mark big /></div>
            {cur.caption && <figcaption>{cur.caption}</figcaption>}</figure>
          {n > 1 && <button type="button" className="lb-a r" onClick={() => go(1)} aria-label="Photo suivante">›</button>}
        </div>
      )}
    </>
  );
}
