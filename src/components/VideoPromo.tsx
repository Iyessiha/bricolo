"use client";
import { useRef, useState } from "react";

/** Vidéo de présentation : rien n’est téléchargé avant le clic, et la lecture démarre avec le son. */
export default function VideoPromo({ label = "Voir comment ça marche", sub = "40 secondes · avec le son" }: { label?: string; sub?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  function start() {
    const v = ref.current;
    if (!v) return;
    v.preload = "auto";
    v.muted = false;
    setOn(true);
    v.play().catch(() => {});
  }
  return (
    <div className={`vpromo${on ? " on" : ""}`}>
      <video ref={ref} controls playsInline preload="none" poster="/videos/bricolo-presentation.jpg" src="/videos/bricolo-presentation.mp4" aria-label="Présentation de Bricolo pour les artisans" />
      {!on && (
        <button type="button" className="vplay" onClick={start} aria-label={`${label} (vidéo avec le son)`}>
          <span className="vico" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg></span>
          <span className="vtxt"><b>{label}</b><small>{sub}</small></span>
        </button>
      )}
    </div>
  );
}
