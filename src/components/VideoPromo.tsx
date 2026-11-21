"use client";
import { useEffect, useRef, useState } from "react";

/** Vidéo de présentation : lecture automatique en sourdine quand elle est visible, bouton pour activer le son. */
export default function VideoPromo() {
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    const v = ref.current, b = box.current;
    if (!v || !b) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches || nav.connection?.saveData;
    if (calm) { setAuto(false); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.35 });
    io.observe(b);
    return () => io.disconnect();
  }, []);

  function toggleSound() {
    const v = ref.current;
    if (!v) return;
    if (muted) { v.currentTime = 0; v.muted = false; setMuted(false); v.play().catch(() => {}); }
    else { v.muted = true; setMuted(true); }
  }

  return (
    <div className="vpromo" ref={box}>
      <video ref={ref} autoPlay={auto} muted loop playsInline controls={!auto} preload={auto ? "auto" : "none"} poster="/videos/bricolo-presentation.jpg" src="/videos/bricolo-presentation.mp4" aria-label="Présentation de Bricolo pour les artisans" />
      {auto && (
        <button type="button" className="vsound" onClick={toggleSound} aria-pressed={!muted}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
            {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
          </svg>
          {muted ? "Activer le son" : "Couper le son"}
        </button>
      )}
    </div>
  );
}
